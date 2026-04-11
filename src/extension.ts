import * as vscode from 'vscode';
import { initTreeSitter } from './core/analyzer/treeSitterParser';
import { initializeSecretStorage, createLLMProvider, hasApiKey, deleteApiKey } from './llm/factory';
import { serverManager } from './server/serverManager';
import { MainPanel } from './vscode/panel/mainPanel';
import { CodeAtlasStatusBar } from './vscode/statusBar';
import { CodeAtlasActivityProvider } from './vscode/activityBar';
import {
  runFullWorkflow,
  runIncrementalUpdate,
  runSingleFileAnalysis,
  cancelWorkflow,
  isWorkflowRunning,
  WorkflowOptions,
} from './core/workflow/runner';
import { logger } from './utils/logger';
import { LLMProviderType } from './llm/types';
import {
  isGitRepo,
  getIndexFilePath,
  fileExists,
  hasIncludeFile,
  setActiveBranch,
} from './utils/fileUtils';
import { getCurrentBranch, getHeadCommit } from './core/git/gitService';
import { hasBranchIndex } from './core/cache/contextCache';

let _branchPollInterval: ReturnType<typeof setInterval> | undefined;
let _fileWatcher: vscode.FileSystemWatcher | undefined;
let _lastKnownBranch: string | undefined;
let _lastKnownHead: string | undefined;

export function activate(context: vscode.ExtensionContext): void {
  // Pre-load tree-sitter WASM grammars in the background so the first analysis
  // does not stall waiting for initialisation.
  initTreeSitter().catch(err =>
    logger.warn(`tree-sitter pre-init failed: ${err}`)
  );

  // Initialize secure secret storage for API keys
  initializeSecretStorage(context.secrets);

  // ── Status bar ─────────────────────────────────────────────────────────
  const statusBar = new CodeAtlasStatusBar();
  context.subscriptions.push(statusBar);

  // ── Main panel (config + stats webview) ────────────────────────────────
  const mainPanel = new MainPanel(context.extensionUri);
  context.subscriptions.push(mainPanel);

  // ── Activity bar tree view ──────────────────────────────────────────────
  const activityProvider = new CodeAtlasActivityProvider();
  const treeView = vscode.window.createTreeView('codeatlas.activityView', {
    treeDataProvider: activityProvider,
    showCollapseAll: false,
  });
  context.subscriptions.push(treeView);
  context.subscriptions.push(activityProvider);

  // Helper: refresh sidebar after workflow completes
  const refreshSidebar = () => activityProvider.refresh();

  // ── Command: Open Setup ──────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeatlas.openSetup', async () => {
      await mainPanel.show();
    })
  );

  // ── Command: Show Stats ──────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeatlas.showStats', async () => {
      await mainPanel.showStats();
    })
  );

  // ── Command: Run Full Workflow ───────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeatlas.runWorkflow', async () => {
      if (isWorkflowRunning()) {
        vscode.window.showWarningMessage(
          'CodeAtlas is already running. Click the status bar item to cancel.'
        );
        return;
      }

      if (!vscode.workspace.workspaceFolders?.length) {
        vscode.window.showErrorMessage('CodeAtlas requires an open workspace folder.');
        return;
      }

      if (!hasIncludeFile()) {
        const choice = await vscode.window.showWarningMessage(
          'CodeAtlas: No .include.codeatlas file found. Without it, the workspace will be scanned ' +
          'using default extension patterns.',
          'Continue Anyway',
          'Configure'
        );
        if (choice === 'Configure') {
          await mainPanel.show();
          return;
        }
        if (choice !== 'Continue Anyway') { return; }
      }

      const config = vscode.workspace.getConfiguration('codeatlas');
      const provider = config.get<LLMProviderType>('llmProvider', 'openai');
      const keySet = await hasApiKey(provider);

      if (!keySet) {
        const msg = provider === 'local'
          ? 'CodeAtlas: No local model configured. Set a model name in the setup panel.'
          : `CodeAtlas: No API key configured for ${provider}.`;
        const choice = await vscode.window.showWarningMessage(msg, 'Configure Now', 'Cancel');
        if (choice === 'Configure Now') { await mainPanel.show(); }
        return;
      }

      statusBar.setRunning();
      activityProvider.refresh();
      logger.info('CodeAtlas full workflow started by user');

      try {
        const llm = await createLLMProvider();
        const workflowOptions = buildWorkflowOptions(config, provider);

        const result = await runFullWorkflow(llm, workflowOptions);

        statusBar.setSuccess(result.filesAnalyzed + result.filesFromCache, result.symbolsIndexed);
        refreshSidebar();

        const durationSec = (result.duration / 1000).toFixed(1);
        const cacheNote = result.filesFromCache > 0 ? ` (${result.filesFromCache} from cache)` : '';
        const errMsg = result.errors.length > 0 ? ` — ${result.errors.length} error(s)` : '';

        vscode.window.showInformationMessage(
          `CodeAtlas: Analysis complete in ${durationSec}s — ` +
          `${result.filesAnalyzed + result.filesFromCache} files${cacheNote}, ${result.symbolsIndexed} symbols${errMsg}`,
          'View Log'
        ).then(choice => {
          if (choice === 'View Log') { logger.show(); }
        });
      } catch (e) {
        handleWorkflowError(e, statusBar);
        refreshSidebar();
      }
    })
  );

  // ── Command: Incremental Update ──────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeatlas.updateIndex', async () => {
      if (isWorkflowRunning()) {
        vscode.window.showWarningMessage('CodeAtlas is already running.');
        return;
      }

      if (!vscode.workspace.workspaceFolders?.length) {
        vscode.window.showErrorMessage('CodeAtlas requires an open workspace folder.');
        return;
      }

      const config = vscode.workspace.getConfiguration('codeatlas');
      const provider = config.get<LLMProviderType>('llmProvider', 'openai');
      const keySet = await hasApiKey(provider);

      if (!keySet) {
        const msg = provider === 'local'
          ? 'CodeAtlas: No local model configured.'
          : `CodeAtlas: No API key configured for ${provider}.`;
        const choice = await vscode.window.showWarningMessage(msg, 'Configure Now', 'Cancel');
        if (choice === 'Configure Now') { await mainPanel.show(); }
        return;
      }

      statusBar.setRunning();
      activityProvider.refresh();
      logger.info('CodeAtlas incremental update started by user');

      try {
        const llm = await createLLMProvider();
        const workflowOptions = buildWorkflowOptions(config, provider);

        const result = await runIncrementalUpdate(llm, workflowOptions);

        statusBar.setSuccess(result.filesAnalyzed + result.filesFromCache, result.symbolsIndexed);
        refreshSidebar();

        const durationSec = (result.duration / 1000).toFixed(1);
        const detail = result.filesAnalyzed === 0 && result.filesFromCache === 0
          ? 'Index is up to date'
          : `${result.filesAnalyzed} analyzed, ${result.filesFromCache} from cache`;

        vscode.window.showInformationMessage(
          `CodeAtlas: Update complete in ${durationSec}s — ${detail}`,
          'View Log'
        ).then(choice => {
          if (choice === 'View Log') { logger.show(); }
        });
      } catch (e) {
        handleWorkflowError(e, statusBar);
        refreshSidebar();
      }
    })
  );

  // ── Command: Cancel Workflow ─────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeatlas.cancelWorkflow', () => {
      cancelWorkflow();
      statusBar.setIdle();
      activityProvider.refresh();
    })
  );

  // ── Command: Analyze Current File ────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeatlas.analyzeFile', async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage('CodeAtlas: No active file to analyze.');
        return;
      }

      const config = vscode.workspace.getConfiguration('codeatlas');
      const provider = config.get<LLMProviderType>('llmProvider', 'openai');
      const keySet = await hasApiKey(provider);

      if (!keySet) {
        const choice = await vscode.window.showWarningMessage(
          `CodeAtlas: No API key configured for ${provider}.`,
          'Configure Now'
        );
        if (choice === 'Configure Now') { await mainPanel.show(); }
        return;
      }

      try {
        const llm = await createLLMProvider();
        const requestsPerMinute = config.get<number>('requestsPerMinute', 12);
        const maxFileSizeKB = config.get<number>('maxFileSizeKB', 200);
        const opts = buildWorkflowOptions(config, provider);
        const maxChunkChars = opts.maxChunkChars;

        await runSingleFileAnalysis(
          editor.document.uri.fsPath,
          llm,
          { requestsPerMinute, maxFileSizeKB, maxChunkChars }
        );

        vscode.window.showInformationMessage('CodeAtlas: File analyzed successfully.');
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.error('Single file analysis failed', e);
        vscode.window.showErrorMessage(`CodeAtlas: Failed — ${msg}`);
      }
    })
  );

  // ── Command: Show Index ──────────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeatlas.showIndex', async () => {
      const { getContextOverviewPath } = await import('./utils/fileUtils');
      const { getCurrentBranch: getBranch } = await import('./core/git/gitService');
      try { setActiveBranch(getBranch()); } catch { setActiveBranch('default'); }
      const overviewPath = getContextOverviewPath();

      if (!fileExists(overviewPath)) {
        const choice = await vscode.window.showWarningMessage(
          'CodeAtlas: No index found. Run analysis first.',
          'Run Analysis'
        );
        if (choice === 'Run Analysis') {
          vscode.commands.executeCommand('codeatlas.runWorkflow');
        }
        return;
      }

      const uri = vscode.Uri.file(overviewPath);
      await vscode.commands.executeCommand('markdown.showPreview', uri);
    })
  );

  // ── Command: Clear API Keys ──────────────────────────────────────────────
  context.subscriptions.push(
    vscode.commands.registerCommand('codeatlas.clearApiKeys', async () => {
      const providers: LLMProviderType[] = ['openai', 'gemini', 'claude', 'local', 'openai-compat'];
      for (const p of providers) { await deleteApiKey(p); }
      const config = vscode.workspace.getConfiguration('codeatlas');
      await config.update('localModel', '', vscode.ConfigurationTarget.Global);
      await config.update('openaiCompatBaseUrl', '', vscode.ConfigurationTarget.Global);
      await config.update('openaiCompatModel', '', vscode.ConfigurationTarget.Global);
      vscode.window.showInformationMessage('CodeAtlas: All API keys and provider configs cleared.');
      activityProvider.refresh();
    })
  );

  // ── Auto-update: File watcher + branch polling ──────────────────────────
  setupAutoUpdate(context, activityProvider);

  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (
        e.affectsConfiguration('codeatlas.autoUpdate') ||
        e.affectsConfiguration('codeatlas.includedExtensions')
      ) {
        disposeAutoUpdate();
        setupAutoUpdate(context, activityProvider);
      }
    })
  );

  // ── Welcome message on first install ────────────────────────────────────
  const hasShownWelcome = context.globalState.get<boolean>('codeatlas.shownWelcome');
  if (!hasShownWelcome) {
    context.globalState.update('codeatlas.shownWelcome', true);
    vscode.window.showInformationMessage(
      'Welcome to CodeAtlas! Click the circuit-board icon in the Activity Bar to get started.',
      'Open Panel'
    ).then(choice => {
      if (choice === 'Open Panel') { mainPanel.show(); }
    });
  }

  logger.info('CodeAtlas extension activated');
}

export function deactivate(): void {
  disposeAutoUpdate();
  serverManager.dispose();
  logger.dispose();
}

// ─── Auto-update ──────────────────────────────────────────────────────────────

function setupAutoUpdate(
  context: vscode.ExtensionContext,
  activityProvider: CodeAtlasActivityProvider
): void {
  const config = vscode.workspace.getConfiguration('codeatlas');
  const autoUpdate = config.get<boolean>('autoUpdate', false);

  if (!autoUpdate) {
    logger.info('Auto-update is disabled');
    return;
  }

  if (!vscode.workspace.workspaceFolders?.length) { return; }

  logger.info('Auto-update enabled — watching for changes');

  let updateTimer: ReturnType<typeof setTimeout> | undefined;
  let _branchSwitchPending = false;

  const debouncedUpdate = (isBranchSwitch = false) => {
    if (isBranchSwitch) { _branchSwitchPending = true; }
    if (!_branchSwitchPending && !fileExists(getIndexFilePath())) { return; }
    if (isWorkflowRunning()) { return; }

    if (updateTimer) { clearTimeout(updateTimer); }
    updateTimer = setTimeout(() => {
      _branchSwitchPending = false;
      vscode.commands.executeCommand('codeatlas.updateIndex');
    }, 3000);
  };

  const includedExtensions = config.get<string[]>('includedExtensions', []);
  if (includedExtensions.length > 0) {
    const pattern = `**/*{${includedExtensions.join(',')}}`;
    _fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
    _fileWatcher.onDidChange(() => debouncedUpdate());
    _fileWatcher.onDidCreate(() => debouncedUpdate());
    _fileWatcher.onDidDelete(() => debouncedUpdate());
    context.subscriptions.push(_fileWatcher);
  }

  if (isGitRepo()) {
    try {
      _lastKnownBranch = getCurrentBranch();
      _lastKnownHead = getHeadCommit();
      setActiveBranch(_lastKnownBranch);
    } catch {
      _lastKnownBranch = undefined;
      _lastKnownHead = undefined;
    }

    _branchPollInterval = setInterval(() => {
      try {
        const currentBranch = getCurrentBranch();
        const currentHead = getHeadCommit();

        if (_lastKnownBranch && currentBranch !== _lastKnownBranch) {
          logger.info(`Branch changed: ${_lastKnownBranch} → ${currentBranch}`);
          _lastKnownBranch = currentBranch;
          _lastKnownHead = currentHead;
          setActiveBranch(currentBranch);
          activityProvider.refresh();

          if (hasBranchIndex(currentBranch)) {
            logger.info(`Branch "${currentBranch}" has existing index — checking for incremental changes`);
          } else {
            logger.info(`Branch "${currentBranch}" has no index yet — full analysis needed`);
          }
          debouncedUpdate(true);
        } else if (_lastKnownHead && currentHead && currentHead !== _lastKnownHead) {
          logger.info(`New commit on ${currentBranch}: ${_lastKnownHead.substring(0, 7)} → ${currentHead.substring(0, 7)}`);
          _lastKnownBranch = currentBranch;
          _lastKnownHead = currentHead;
          debouncedUpdate();
        } else {
          _lastKnownBranch = currentBranch;
          _lastKnownHead = currentHead;
        }
      } catch {
        // Not a git repo or git unavailable — silently skip
      }
    }, 5000);
  }
}

function disposeAutoUpdate(): void {
  if (_branchPollInterval) {
    clearInterval(_branchPollInterval);
    _branchPollInterval = undefined;
  }
  if (_fileWatcher) {
    _fileWatcher.dispose();
    _fileWatcher = undefined;
  }
  _lastKnownBranch = undefined;
  _lastKnownHead = undefined;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function buildWorkflowOptions(
  config: vscode.WorkspaceConfiguration,
  provider: LLMProviderType
): WorkflowOptions {
  const requestsPerMinute  = config.get<number>('requestsPerMinute', 12);
  const maxFileSizeKB      = config.get<number>('maxFileSizeKB', 200);
  const concurrentRequests = Math.max(1, config.get<number>('concurrentRequests', 1));

  // Prompt overhead: ~300 tokens system + instructions; max output: 4096 tokens.
  // Safe content budget = (contextSize - 4096 - 300) tokens × 4 chars/token.
  const PROMPT_OVERHEAD_TOKENS = 4096 + 300;

  let maxChunkChars: number;
  let batchFiles: boolean;

  if (provider === 'local') {
    const localContextSize = config.get<number>('localContextSize', 4096);
    maxChunkChars = Math.max(2000, (localContextSize - PROMPT_OVERHEAD_TOKENS) * 4);
    batchFiles = false;
  } else if (provider === 'openai-compat') {
    const compatContextSize = config.get<number>('openaiCompatContextSize', 8192);
    maxChunkChars = Math.max(2000, (compatContextSize - PROMPT_OVERHEAD_TOKENS) * 4);
    batchFiles = true;
  } else {
    // Cloud providers (openai, gemini, claude) have large context windows
    maxChunkChars = 60_000;
    batchFiles = true;
  }

  return {
    requestsPerMinute,
    maxFileSizeKB,
    maxChunkChars,
    batchFiles,
    concurrentRequests,
  };
}

function handleWorkflowError(e: unknown, statusBar: CodeAtlasStatusBar): void {
  if (e instanceof vscode.CancellationError) {
    statusBar.setIdle();
    vscode.window.showInformationMessage('CodeAtlas: Analysis cancelled.');
    logger.info('Workflow cancelled by user');
  } else {
    statusBar.setError();
    const msg = e instanceof Error ? e.message : String(e);
    logger.error('Workflow failed', e);
    vscode.window.showErrorMessage(`CodeAtlas: Analysis failed — ${msg}`, 'View Log')
      .then(choice => {
        if (choice === 'View Log') { logger.show(); }
      });
  }
}
