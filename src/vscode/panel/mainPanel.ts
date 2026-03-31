import * as vscode from 'vscode';
import { LLMProviderType } from '../../llm/types';
import { storeApiKey, deleteApiKey, hasApiKey } from '../../llm/factory';
import { serverManager, detectBinary } from '../../server/serverManager';
import { hasIncludeFile, getCurrentIndexDir, getCodeAtlasDir, fileExists } from '../../utils/fileUtils';
import { loadUsageStats, resetUsageStats, getStatsDisplay, UsageStatsData, StatsDisplay } from '../../core/stats/usageStats';
import { logger } from '../../utils/logger';

interface WebviewMessage {
  type: string;
  provider?: string;
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  apiType?: string;
  contextSize?: string | number;
  autoUpdate?: string;
  requestsPerMinute?: string | number;
  concurrentRequests?: string | number;
  maxFileSizeKB?: string | number;
  includedExtensions?: string;
  excludePatterns?: string;
  modelPath?: string;
  port?: string | number;
  gpuLayers?: string | number;
  binaryPath?: string;
}

export class MainPanel implements vscode.Disposable {
  private panel: vscode.WebviewPanel | undefined;
  private readonly disposables: vscode.Disposable[] = [];
  private serverUnsubscribe?: () => void;

  constructor(private readonly extensionUri: vscode.Uri) {}

  async show(): Promise<void> {
    if (this.panel) { this.panel.reveal(vscode.ViewColumn.One); return; }

    this.panel = vscode.window.createWebviewPanel(
      'codeatlas.setup',
      'CodeAtlas',
      vscode.ViewColumn.One,
      { enableScripts: true, retainContextWhenHidden: true }
    );

    this.panel.onDidDispose(() => {
      this.serverUnsubscribe?.();
      this.panel = undefined;
    }, null, this.disposables);

    this.serverUnsubscribe = serverManager.onStatusChange(state => {
      this.panel?.webview.postMessage({ type: 'serverState', ...state });
    });

    await this.updatePanel();

    this.panel.webview.onDidReceiveMessage(async (msg: WebviewMessage) => {
      switch (msg.type) {
        case 'saveConfig':       await this.handleSaveConfig(msg);   break;
        case 'saveLocal':        await this.handleSaveLocal(msg);    break;
        case 'saveOpenAICompat': await this.handleSaveOpenAICompat(msg); break;
        case 'deleteKey':        await this.handleDeleteKey(msg.provider as LLMProviderType); break;
        case 'testConnection':   await this.handleTestConnection(
          msg.provider as LLMProviderType, msg.apiKey ?? '', msg.baseUrl, msg.model, msg.apiType
        ); break;
        case 'saveSettings':   await this.handleSaveSettings(msg);  break;
        case 'resetStats':     this.handleResetStats();              break;
        case 'startServer':    await this.handleStartServer(msg);   break;
        case 'stopServer':     await serverManager.stop();          break;
        case 'browseModel':    await this.handleBrowseModel();      break;
        case 'browseBinary':   await this.handleBrowseBinary();     break;
        case 'refreshStats':   await this.sendStats();              break;
      }
    }, null, this.disposables);

    // Send current server state so UI reflects reality immediately
    this.panel.webview.postMessage({
      type: 'serverState',
      status: serverManager.status,
      port: serverManager.port,
      modelName: '',
      logs: serverManager.recentLogs,
    });
  }

  private async updatePanel(): Promise<void> {
    if (!this.panel) { return; }
    const config = vscode.workspace.getConfiguration('codeatlas');
    const currentProvider = config.get<LLMProviderType>('llmProvider', 'openai');
    const hasKeys = {
      openai:          await hasApiKey('openai'),
      gemini:          await hasApiKey('gemini'),
      claude:          await hasApiKey('claude'),
      local:           await hasApiKey('local'),
      'openai-compat': await hasApiKey('openai-compat'),
    };
    const binaryFound = !!(await detectBinary());
    const includeFileExists = hasIncludeFile();
    this.panel.webview.html = this.buildHtml(currentProvider, hasKeys, binaryFound, includeFileExists);
  }

  private async sendStats(): Promise<void> {
    if (!this.panel) { return; }
    const stats = loadUsageStats();
    const display = getStatsDisplay(stats);
    const html = this.buildStatsContent(stats, display);
    this.panel.webview.postMessage({ type: 'statsContent', html });
  }

  private buildStatsContent(usageStats: UsageStatsData, statsDisplay: StatsDisplay): string {
    if (usageStats.global.workflowRuns === 0) {
      return `<div class="msg info" style="margin-bottom:12px">No usage data yet. Run an analysis to start tracking.</div>`;
    }
    let html = `
<div class="stats-global">
  <div class="stats-row">
    <span class="stats-label">Total workflow runs</span>
    <span class="stats-value">${usageStats.global.workflowRuns}</span>
  </div>
  <div class="stats-row">
    <span class="stats-label">First used</span>
    <span class="stats-value">${new Date(usageStats.global.firstUsed).toLocaleDateString()}</span>
  </div>
  <div class="stats-row">
    <span class="stats-label">Last used</span>
    <span class="stats-value">${new Date(usageStats.global.lastUsed).toLocaleDateString()}</span>
  </div>
</div>`;
    for (const p of statsDisplay.providers) {
      html += `
<div class="stats-provider">
  <div class="stats-provider-name">${p.name}</div>
  <div class="stats-grid">
    <div class="stats-card">
      <div class="stats-card-label">Total Tokens</div>
      <div class="stats-card-value">${p.totalTokens.toLocaleString()}</div>
      <div class="stats-card-sub">${p.totalInputTokens.toLocaleString()} in + ${p.totalOutputTokens.toLocaleString()} out</div>
    </div>
    <div class="stats-card">
      <div class="stats-card-label">Avg per Run</div>
      <div class="stats-card-value">${p.avgInputTokensPerRun.toLocaleString()} in</div>
      <div class="stats-card-sub">${p.avgOutputTokensPerRun.toLocaleString()} out / ${p.workflowRuns} runs</div>
    </div>
    <div class="stats-card">
      <div class="stats-card-label">Requests</div>
      <div class="stats-card-value">${p.requestCount}</div>
      <div class="stats-card-sub">${p.errors > 0 ? `${p.errors} errors` : 'no errors'}</div>
    </div>
    <div class="stats-card">
      <div class="stats-card-label">Files Analyzed</div>
      <div class="stats-card-value">${p.filesAnalyzed}</div>
      <div class="stats-card-sub">${p.filesFromCache} from cache · avg ${p.avgFilesPerRun}/run</div>
    </div>
    <div class="stats-card">
      <div class="stats-card-label">Duration</div>
      <div class="stats-card-value">${p.durationMin} min</div>
      <div class="stats-card-sub">cumulative</div>
    </div>
    <div class="stats-card">
      <div class="stats-card-label">Last Used</div>
      <div class="stats-card-value" style="font-size:12px">${new Date(p.lastUsed).toLocaleDateString()}</div>
      <div class="stats-card-sub">${new Date(p.lastUsed).toLocaleTimeString()}</div>
    </div>
  </div>
</div>`;
    }

    // Run history table (most recent first)
    const runs = statsDisplay.recentRuns;
    if (runs.length > 0) {
      const rows = runs.map(r => {
        const date = new Date(r.timestamp);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        const durationSec = Math.round(r.durationMs / 1000);
        const durationStr = durationSec >= 60
          ? `${Math.floor(durationSec / 60)}m ${durationSec % 60}s`
          : `${durationSec}s`;
        const filesStr = r.filesFromCache > 0
          ? `${r.filesAnalyzed} <span style="opacity:.55">(+${r.filesFromCache} cached)</span>`
          : `${r.filesAnalyzed}`;
        const errorsStr = r.errors > 0
          ? `<span style="color:var(--err)">${r.errors}</span>`
          : '–';
        return `<tr>
          <td>${dateStr}<br><span style="opacity:.55;font-size:11px">${timeStr}</span></td>
          <td>${r.provider}</td>
          <td>${r.inputTokens.toLocaleString()}</td>
          <td>${r.outputTokens.toLocaleString()}</td>
          <td>${filesStr}</td>
          <td>${durationStr}</td>
          <td>${errorsStr}</td>
        </tr>`;
      }).join('');

      html += `
<div class="run-history">
  <div class="run-history-title">&#128200; Run History</div>
  <table class="run-table">
    <thead>
      <tr>
        <th>Date</th>
        <th>Provider</th>
        <th>Tokens In</th>
        <th>Tokens Out</th>
        <th>Files</th>
        <th>Duration</th>
        <th>Errors</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
</div>`;
    }

    return html;
  }

  // ── Handlers ────────────────────────────────────────────────────────────────

  private async handleSaveConfig(msg: WebviewMessage): Promise<void> {
    const config = vscode.workspace.getConfiguration('codeatlas');
    const provider = msg.provider as LLMProviderType;
    await config.update('llmProvider', provider, vscode.ConfigurationTarget.Global);
    if (msg.model) {
      await config.update(`${provider}Model`, msg.model, vscode.ConfigurationTarget.Global);
    }
    const hasKey = !!(msg.apiKey?.trim());
    if (hasKey) { await storeApiKey(provider, msg.apiKey!.trim()); }
    vscode.window.showInformationMessage(`CodeAtlas: Saved ${provider}${hasKey ? ' + API key' : ''}`);
    const keyNowStored = hasKey || await hasApiKey(provider);
    this.panel?.webview.postMessage({ type: 'saved', provider, keyStored: keyNowStored });
  }

  private async handleSaveLocal(msg: WebviewMessage): Promise<void> {
    const config = vscode.workspace.getConfiguration('codeatlas');
    await config.update('llmProvider', 'local', vscode.ConfigurationTarget.Global);
    if (msg.baseUrl)    { await config.update('localBaseUrl',     msg.baseUrl,               vscode.ConfigurationTarget.Global); }
    if (msg.model)      { await config.update('localModel',       msg.model,                 vscode.ConfigurationTarget.Global); }
    if (msg.apiType)    { await config.update('localApiType',     msg.apiType,               vscode.ConfigurationTarget.Global); }
    if (msg.contextSize){ await config.update('localContextSize', Number(msg.contextSize),   vscode.ConfigurationTarget.Global); }
    if (msg.apiKey?.trim()) { await storeApiKey('local', msg.apiKey.trim()); }
    vscode.window.showInformationMessage('CodeAtlas: Local LLM configuration saved');
    this.panel?.webview.postMessage({ type: 'saved', provider: 'local', keyStored: !!msg.model });
  }

  private async handleSaveOpenAICompat(msg: WebviewMessage): Promise<void> {
    const config = vscode.workspace.getConfiguration('codeatlas');
    await config.update('llmProvider', 'openai-compat', vscode.ConfigurationTarget.Global);
    if (msg.baseUrl) { await config.update('openaiCompatBaseUrl', msg.baseUrl, vscode.ConfigurationTarget.Global); }
    if (msg.model)   { await config.update('openaiCompatModel',   msg.model,   vscode.ConfigurationTarget.Global); }
    if (msg.apiKey?.trim()) { await storeApiKey('openai-compat', msg.apiKey.trim()); }
    if (msg.contextSize !== undefined) {
      const ctx = Math.max(512, Number(msg.contextSize));
      if (!isNaN(ctx)) {
        await config.update('openaiCompatContextSize', ctx, vscode.ConfigurationTarget.Global);
      }
    }
    vscode.window.showInformationMessage('CodeAtlas: Remote OpenAI-compatible server configuration saved');
    const ready = !!(msg.baseUrl?.trim()) && !!(msg.model?.trim());
    this.panel?.webview.postMessage({ type: 'saved', provider: 'openai-compat', keyStored: ready });
  }

  private async handleDeleteKey(provider: LLMProviderType): Promise<void> {
    await deleteApiKey(provider);
    const config = vscode.workspace.getConfiguration('codeatlas');
    if (provider === 'local') {
      await config.update('localModel', '', vscode.ConfigurationTarget.Global);
      if (serverManager.isRunning) { await serverManager.stop(); }
    }
    if (provider === 'openai-compat') {
      await config.update('openaiCompatBaseUrl', '', vscode.ConfigurationTarget.Global);
      await config.update('openaiCompatModel',   '', vscode.ConfigurationTarget.Global);
    }
    vscode.window.showInformationMessage(`CodeAtlas: Cleared ${provider} configuration`);
    this.panel?.webview.postMessage({ type: 'keyDeleted', provider });
  }

  private async handleSaveSettings(msg: WebviewMessage): Promise<void> {
    const config = vscode.workspace.getConfiguration('codeatlas');
    if (msg.autoUpdate !== undefined) {
      await config.update('autoUpdate', msg.autoUpdate === 'true', vscode.ConfigurationTarget.Global);
    }
    if (msg.requestsPerMinute !== undefined) {
      const rpm = Number(msg.requestsPerMinute);
      if (!isNaN(rpm) && rpm > 0) {
        await config.update('requestsPerMinute', rpm, vscode.ConfigurationTarget.Global);
      }
    }
    if (msg.concurrentRequests !== undefined) {
      const concurrency = Math.max(1, Math.min(20, Number(msg.concurrentRequests)));
      if (!isNaN(concurrency)) {
        await config.update('concurrentRequests', concurrency, vscode.ConfigurationTarget.Global);
      }
    }
    if (msg.maxFileSizeKB !== undefined) {
      const kb = Number(msg.maxFileSizeKB);
      if (!isNaN(kb) && kb > 0) {
        await config.update('maxFileSizeKB', kb, vscode.ConfigurationTarget.Global);
      }
    }
    if (msg.includedExtensions !== undefined) {
      const exts = (msg.includedExtensions as string)
        .split('\n').map((s: string) => s.trim()).filter(Boolean);
      if (exts.length > 0) {
        await config.update('includedExtensions', exts, vscode.ConfigurationTarget.Global);
      }
    }
    if (msg.excludePatterns !== undefined) {
      const patterns = (msg.excludePatterns as string)
        .split('\n').map((s: string) => s.trim()).filter(Boolean);
      await config.update('excludePatterns', patterns, vscode.ConfigurationTarget.Global);
    }
    this.panel?.webview.postMessage({ type: 'settingsSaved' });
    vscode.window.showInformationMessage('CodeAtlas: Settings saved');
  }

  private handleResetStats(): void {
    resetUsageStats();
    this.panel?.webview.postMessage({ type: 'statsReset' });
    vscode.window.showInformationMessage('CodeAtlas: Usage statistics reset');
  }

  private async handleTestConnection(
    provider: LLMProviderType, apiKey: string, baseUrl?: string, model?: string, apiType?: string
  ): Promise<void> {
    this.panel?.webview.postMessage({ type: 'testStart', provider });
    try {
      if (provider === 'local') {
        const config = vscode.workspace.getConfiguration('codeatlas');
        if (baseUrl)  { await config.update('localBaseUrl',  baseUrl,  vscode.ConfigurationTarget.Global); }
        if (model)    { await config.update('localModel',    model,    vscode.ConfigurationTarget.Global); }
        if (apiType)  { await config.update('localApiType',  apiType,  vscode.ConfigurationTarget.Global); }
        if (apiKey.trim()) { await storeApiKey('local', apiKey.trim()); }
      } else if (provider === 'openai-compat') {
        const config = vscode.workspace.getConfiguration('codeatlas');
        if (baseUrl) { await config.update('openaiCompatBaseUrl', baseUrl, vscode.ConfigurationTarget.Global); }
        if (model)   { await config.update('openaiCompatModel',   model,   vscode.ConfigurationTarget.Global); }
        if (apiKey.trim()) { await storeApiKey('openai-compat', apiKey.trim()); }
      } else if (apiKey.trim()) {
        await storeApiKey(provider, apiKey.trim());
      }
      const { createLLMProvider } = await import('../../llm/factory');
      const llm = await createLLMProvider();
      await llm.complete([{ role: 'user', content: 'Reply with just the word "ok".' }], 20);
      this.panel?.webview.postMessage({ type: 'testSuccess', provider, keyStored: true });
    } catch (e) {
      this.panel?.webview.postMessage({
        type: 'testError',
        provider,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  private async handleStartServer(msg: WebviewMessage): Promise<void> {
    const config = vscode.workspace.getConfiguration('codeatlas');
    const port        = Number(msg.port) || 8080;
    const contextSize = Number(msg.contextSize) || 4096;
    const baseUrl     = `http://127.0.0.1:${port}/v1`;
    await config.update('localBaseUrl',     baseUrl,              vscode.ConfigurationTarget.Global);
    await config.update('localModel',       msg.model || 'local', vscode.ConfigurationTarget.Global);
    await config.update('localContextSize', contextSize,          vscode.ConfigurationTarget.Global);
    await config.update('localApiType',     'openai-compat',      vscode.ConfigurationTarget.Global);
    serverManager.start({
      modelPath:   msg.modelPath ?? '',
      port,
      gpuLayers:   Number(msg.gpuLayers) || 0,
      contextSize: Number(msg.contextSize) || 4096,
      binaryPath:  (msg.binaryPath as string | undefined)?.trim() || undefined,
    }).catch(e => logger.error('Server start failed', e));
  }

  private async handleBrowseModel(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
      title: 'Select model file (.gguf)',
      filters: { 'GGUF Model': ['gguf'], 'All Files': ['*'] },
      canSelectMany: false, canSelectFiles: true, canSelectFolders: false,
    });
    if (uris?.[0]) {
      this.panel?.webview.postMessage({ type: 'modelPathSelected', path: uris[0].fsPath });
    }
  }

  private async handleBrowseBinary(): Promise<void> {
    const uris = await vscode.window.showOpenDialog({
      title: 'Select llama-server binary',
      canSelectMany: false, canSelectFiles: true, canSelectFolders: false,
    });
    if (uris?.[0]) {
      this.panel?.webview.postMessage({ type: 'binaryPathSelected', path: uris[0].fsPath });
    }
  }

  // ── HTML ──────────────────────────────────────────────────────────────────

  private buildHtml(
    currentProvider: LLMProviderType,
    hasKeys: Record<string, boolean>,
    binaryFound: boolean,
    includeFileExists: boolean
  ): string {
    const cfg = vscode.workspace.getConfiguration('codeatlas');
    const autoUpdate = cfg.get<boolean>('autoUpdate', false);

    let currentIndexPath = '';
    try { currentIndexPath = getCurrentIndexDir(); } catch { /* no workspace */ }
    const indexExists = currentIndexPath ? fileExists(currentIndexPath + '/index.json') : false;

    const modelOpts: Record<string, string[]> = {
      openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      gemini: ['gemini-2.5-flash', 'gemini-2.5-flash-lite'],
      claude: ['claude-opus-4-6', 'claude-sonnet-4-6', 'claude-haiku-4-5-20251001'],
    };
    const curModels: Record<string, string> = {
      openai: cfg.get('openaiModel', 'gpt-4o'),
      gemini: cfg.get('geminiModel', 'gemini-2.5-flash'),
      claude: cfg.get('claudeModel', 'claude-opus-4-6'),
    };
    const localBaseUrl        = cfg.get('localBaseUrl', 'http://localhost:8080/v1') as string;
    const localModel          = cfg.get('localModel', '') as string;
    const localApiType        = cfg.get('localApiType', 'openai-compat') as string;
    const localContextSize    = cfg.get('localContextSize', 4096) as number;
    const openaiCompatBaseUrl     = cfg.get('openaiCompatBaseUrl', '') as string;
    const openaiCompatModel       = cfg.get('openaiCompatModel', '') as string;
    const openaiCompatContextSize = cfg.get<number>('openaiCompatContextSize', 8192);
    const requestsPerMinute   = cfg.get<number>('requestsPerMinute', 12);
    const maxFileSizeKB       = cfg.get<number>('maxFileSizeKB', 200);
    const concurrentRequests  = cfg.get<number>('concurrentRequests', 1);
    const includedExtensions  = cfg.get<string[]>('includedExtensions', []);
    const excludePatterns     = cfg.get<string[]>('excludePatterns', []);

    const usageStats = loadUsageStats();
    const statsDisplay = getStatsDisplay(usageStats);

    const sel = (p: string) => modelOpts[p]
      .map(m => `<option value="${m}"${curModels[p] === m ? ' selected' : ''}>${m}</option>`)
      .join('');

    const badge = (p: string) => hasKeys[p]
      ? `<span id="badge-${p}" class="badge ok">Ready &#10003;</span>`
      : `<span id="badge-${p}" class="badge missing">Not configured</span>`;

    const delBtn = (p: string) => hasKeys[p]
      ? `<button type="button" class="btn-danger" data-action="delete" data-provider="${p}">Clear</button>`
      : '';

    const cloudCard = (p: string, title: string, placeholder: string, hint: string) => `
<div class="card${currentProvider === p ? ' active' : ''}" id="card-${p}">
  <div class="card-header" data-select="${p}">
    <input type="radio" name="provider" id="radio-${p}" value="${p}"${currentProvider === p ? ' checked' : ''}>
    <label>${title}</label>
    ${badge(p)}
  </div>
  <div class="body${currentProvider === p ? ' open' : ''}" id="body-${p}">
    <div class="field">
      <label class="field-label">API Key</label>
      <input type="password" id="apiKey-${p}"
        placeholder="${hasKeys[p] ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 (stored)' : placeholder}">
      <div class="hint">${hint}</div>
    </div>
    <div class="field">
      <label class="field-label">Model</label>
      <select id="model-${p}">${sel(p)}</select>
    </div>
    <div class="row-actions">
      <button type="button" class="btn-primary"   data-action="save" data-provider="${p}">Save</button>
      <button type="button" class="btn-secondary" data-action="test" data-provider="${p}">Test connection</button>
      <span id="delete-wrap-${p}">${delBtn(p)}</span>
    </div>
    <div id="status-${p}" class="status-area"></div>
  </div>
</div>`;

    const binaryWarning = binaryFound ? '' : `
<div class="warn-box">
  <strong>&#9888; llama-server not found in PATH.</strong>
  Install via <code>brew install llama.cpp</code> (macOS) or download from
  <a href="https://github.com/ggerganov/llama.cpp/releases">github.com/ggerganov/llama.cpp/releases</a>,
  then browse to the binary below.
</div>`;

    const buildStatsHtml = () => this.buildStatsContent(usageStats, statsDisplay);

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>CodeAtlas</title>
<style>
:root {
  --bg: var(--vscode-editor-background);
  --fg: var(--vscode-editor-foreground);
  --border: var(--vscode-input-border, #3c3c3c);
  --input-bg: var(--vscode-input-background);
  --btn-bg: var(--vscode-button-background);
  --btn-fg: var(--vscode-button-foreground);
  --btn-hover: var(--vscode-button-hoverBackground);
  --accent: var(--vscode-focusBorder, #007fd4);
  --card-bg: var(--vscode-editorWidget-background, #252526);
  --ok:   #4caf50;
  --warn: #ff9800;
  --err:  #f44336;
  --info: #64b5f6;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: var(--vscode-font-family, sans-serif);
  font-size: 13px; color: var(--fg); background: var(--bg);
  padding: 0;
}
.tab-bar {
  display: flex; border-bottom: 1px solid var(--border);
  background: var(--card-bg); position: sticky; top: 0; z-index: 10;
}
.tab {
  padding: 11px 18px; cursor: pointer; font-size: 13px;
  border-bottom: 2px solid transparent; color: var(--fg);
  opacity: .65; transition: opacity .1s, border-color .1s;
  user-select: none;
}
.tab:hover { opacity: .85; }
.tab.active { opacity: 1; border-bottom-color: var(--accent); }
.tab-content { display: none; padding: 24px; max-width: 760px; }
.tab-content.active { display: block; }

h1 { font-size: 20px; margin-bottom: 4px; }
h2 { font-size: 15px; margin-top: 24px; margin-bottom: 10px; }
.subtitle { opacity: .7; margin-bottom: 20px; }

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px; margin-bottom: 12px; overflow: hidden;
}
.card.active { border-color: var(--accent); }
.card-header {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; cursor: pointer; user-select: none;
}
.card-header input[type=radio] { width: 15px; height: 15px; flex-shrink: 0; cursor: pointer; }
.card-header label { font-size: 14px; font-weight: 600; flex: 1; pointer-events: none; }
.badge {
  font-size: 11px; padding: 2px 8px; border-radius: 99px;
  font-weight: 600; white-space: nowrap; flex-shrink: 0;
}
.badge.ok      { background: rgba(76,175,80,.18);  color: var(--ok); }
.badge.missing { background: rgba(255,152,0,.18);  color: var(--warn); }

.body { display: none; padding: 0 16px 16px; border-top: 1px solid var(--border); }
.body.open { display: block; }

.field { margin-top: 12px; }
.field-label { display: block; font-size: 11px; font-weight: 600; opacity: .7; margin-bottom: 5px; text-transform: uppercase; letter-spacing: .04em; }
.field input, .field select, .field textarea {
  width: 100%; padding: 7px 10px;
  background: var(--input-bg); color: var(--fg);
  border: 1px solid var(--border); border-radius: 4px; font-size: 13px;
}
.field input:focus, .field select:focus, .field textarea:focus { outline: 1px solid var(--accent); }
.hint { font-size: 11px; opacity: .55; margin-top: 4px; }
.input-row { display: flex; gap: 6px; }
.input-row input { flex: 1; min-width: 0; }
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 12px; }
.grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; margin-top: 12px; }

.row-actions { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 14px; }
button { padding: 6px 14px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; flex-shrink: 0; }
button:disabled { opacity: .4; cursor: not-allowed; }
.btn-primary   { background: var(--btn-bg);  color: var(--btn-fg); }
.btn-primary:hover { background: var(--btn-hover); }
.btn-secondary { background: transparent; border: 1px solid var(--border); color: var(--fg); }
.btn-secondary:hover { background: rgba(255,255,255,.06); }
.btn-danger    { background: rgba(244,67,54,.12); border: 1px solid rgba(244,67,54,.5); color: var(--err); }
.btn-danger:hover { background: rgba(244,67,54,.22); }
.btn-browse    { background: transparent; border: 1px solid var(--border); color: var(--fg); padding: 6px 10px; font-size: 12px; }

.server-btn {
  width: 100%; padding: 11px; font-size: 14px; font-weight: 700;
  border-radius: 5px; margin: 16px 0 10px; transition: background .15s;
}
.server-btn.start    { background: rgba(76,175,80,.15);  border: 1px solid rgba(76,175,80,.5);   color: var(--ok); }
.server-btn.start:hover { background: rgba(76,175,80,.28); }
.server-btn.stop     { background: rgba(244,67,54,.12);  border: 1px solid rgba(244,67,54,.45);  color: var(--err); }
.server-btn.stop:hover { background: rgba(244,67,54,.22); }
.server-btn.starting { background: rgba(255,152,0,.12);  border: 1px solid rgba(255,152,0,.45);  color: var(--warn); cursor: wait; }

.server-status { display: flex; align-items: center; gap: 8px; font-size: 12px; margin-bottom: 10px; }
.dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.dot.stopped  { background: #555; }
.dot.starting { background: var(--warn); animation: blink 1s infinite; }
.dot.running  { background: var(--ok); }
.dot.error    { background: var(--err); }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:.2} }

.log-box {
  background: #0d1117; border: 1px solid var(--border); border-radius: 4px;
  padding: 8px 10px; height: 130px; overflow-y: auto;
  font-family: var(--vscode-editor-font-family, monospace);
  font-size: 11px; color: #c9d1d9; line-height: 1.55; margin-bottom: 12px;
}

.status-area { margin-top: 10px; min-height: 4px; }
.msg { font-size: 12px; padding: 5px 9px; border-radius: 4px; }
.msg.ok   { background: rgba(76,175,80,.15);  color: var(--ok); }
.msg.err  { background: rgba(244,67,54,.15);  color: var(--err); }
.msg.info { background: rgba(33,150,243,.12); color: var(--info); }

.divider   { border: none; border-top: 1px solid var(--border); margin: 14px 0; }
.sec-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .08em; opacity: .45; margin-top: 16px; margin-bottom: 6px; }
.api-type-toggle { display: flex; border: 1px solid var(--border); border-radius: 4px; overflow: hidden; width: fit-content; }
.api-type-btn { background: transparent; border: none; border-radius: 0; color: var(--fg); padding: 5px 14px; font-size: 12px; cursor: pointer; transition: background .1s; }
.api-type-btn:hover { background: rgba(255,255,255,.06); }
.api-type-btn.active { background: var(--btn-bg); color: var(--btn-fg); }
.api-type-btn + .api-type-btn { border-left: 1px solid var(--border); }
.warn-box  { background: rgba(255,152,0,.08); border: 1px solid rgba(255,152,0,.35); border-radius: 4px; padding: 8px 12px; margin-bottom: 12px; font-size: 12px; line-height: 1.6; }
.warn-box code { background: rgba(0,0,0,.3); padding: 1px 5px; border-radius: 3px; }
details > summary { cursor: pointer; font-size: 12px; opacity: .65; padding: 6px 0; }
details[open] > summary { margin-bottom: 8px; }

/* Stats styles */
.stats-global {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px;
  padding: 12px 16px; margin-bottom: 16px;
}
.stats-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; }
.stats-label { opacity: .65; }
.stats-value { font-weight: 600; }
.stats-provider { margin-bottom: 20px; }
.stats-provider-name {
  font-size: 14px; font-weight: 700; margin-bottom: 10px;
  padding: 8px 12px; background: var(--card-bg);
  border: 1px solid var(--border); border-radius: 6px;
  display: flex; align-items: center; gap: 8px;
}
.stats-provider-name::before { content: ""; width: 8px; height: 8px; border-radius: 50%; background: var(--accent); }
.stats-grid {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
}
.stats-card {
  background: var(--card-bg); border: 1px solid var(--border); border-radius: 6px;
  padding: 10px 12px;
}
.stats-card-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: .06em; opacity: .55; margin-bottom: 4px; }
.stats-card-value { font-size: 18px; font-weight: 700; line-height: 1.2; }
.stats-card-sub { font-size: 11px; opacity: .55; margin-top: 3px; }
.run-history { margin-top: 24px; }
.run-history-title { font-size: 13px; font-weight: 700; margin-bottom: 10px; }
.run-table { width: 100%; border-collapse: collapse; font-size: 12px; }
.run-table th {
  text-align: left; padding: 6px 8px; opacity: .55; font-weight: 600;
  text-transform: uppercase; letter-spacing: .05em; font-size: 10px;
  border-bottom: 1px solid var(--border);
}
.run-table td { padding: 7px 8px; border-bottom: 1px solid var(--border); vertical-align: top; }
.run-table tr:last-child td { border-bottom: none; }
.run-table tr:hover td { background: var(--vscode-list-hoverBackground, rgba(128,128,128,.08)); }

/* About tab styles */
.about-section { margin-bottom: 24px; }
.about-section h3 { font-size: 14px; margin-bottom: 8px; }
.feature-list { list-style: none; padding: 0; }
.feature-list li { padding: 4px 0; padding-left: 20px; position: relative; font-size: 13px; line-height: 1.6; }
.feature-list li::before { content: "✓"; position: absolute; left: 0; color: var(--ok); font-weight: 700; }
pre.code-sample {
  background: #0d1117; border: 1px solid var(--border); border-radius: 4px;
  padding: 10px 12px; font-size: 11px; color: #c9d1d9; line-height: 1.6;
  overflow-x: auto; margin-top: 8px;
}
</style>
</head>
<body>

<div class="tab-bar">
  <div class="tab active" data-tab="providers">&#9889; LLM Providers</div>
  <div class="tab" data-tab="settings">&#9881; Settings</div>
  <div class="tab" data-tab="statistics">&#128202; Statistics</div>
  <div class="tab" data-tab="about">&#8505; About</div>
</div>

<!-- ── TAB: LLM Providers ── -->
<div id="tab-providers" class="tab-content active">
<h1>&#9889; CodeAtlas</h1>
<p class="subtitle">Configure your LLM provider for semantic code analysis</p>

${cloudCard('openai',
  'OpenAI <span style="font-weight:400;opacity:.55">&nbsp;GPT-4o, GPT-4o-mini&hellip;</span>',
  'sk-\u2026',
  'Get your key at <strong>platform.openai.com/api-keys</strong>')}

${cloudCard('gemini',
  'Google Gemini <span style="font-weight:400;opacity:.55">&nbsp;2.5 Flash</span>',
  'AIza\u2026',
  'Get your key at <strong>aistudio.google.com/app/apikey</strong>')}

${cloudCard('claude',
  'Anthropic Claude <span style="font-weight:400;opacity:.55">&nbsp;Opus, Sonnet, Haiku</span>',
  'sk-ant-\u2026',
  'Get your key at <strong>console.anthropic.com/settings/keys</strong>')}

<!-- OpenAI-compatible remote server card -->
<div class="card${currentProvider === 'openai-compat' ? ' active' : ''}" id="card-openai-compat">
  <div class="card-header" data-select="openai-compat">
    <input type="radio" name="provider" id="radio-openai-compat" value="openai-compat"${currentProvider === 'openai-compat' ? ' checked' : ''}>
    <label>OpenAI-Compatible Remote <span style="font-weight:400;opacity:.55">&nbsp;vLLM, LiteLLM, Together AI&hellip;</span></label>
    ${badge('openai-compat')}
  </div>
  <div class="body${currentProvider === 'openai-compat' ? ' open' : ''}" id="body-openai-compat">
    <div class="grid2">
      <div class="field">
        <label class="field-label">Base URL</label>
        <input type="text" id="openaiCompatBaseUrl" value="${openaiCompatBaseUrl}" placeholder="http://192.168.1.100:8000/v1">
        <div class="hint">Full URL including <code>/v1</code>. Must expose <code>/v1/chat/completions</code>.</div>
      </div>
      <div class="field">
        <label class="field-label">Model Name</label>
        <input type="text" id="openaiCompatModel" value="${openaiCompatModel}" placeholder="mistral-7b-instruct">
        <div class="hint">Model identifier as expected by the server.</div>
      </div>
    </div>
    <div class="grid2">
      <div class="field">
        <label class="field-label">Context Window (tokens)</label>
        <input type="number" id="openaiCompatContextSize" value="${openaiCompatContextSize}" min="512" step="512" placeholder="8192">
        <div class="hint">Max tokens the server accepts per request. Used to chunk large files correctly. Check your server's model card (e.g. 8192, 16384, 32768).</div>
      </div>
      <div class="field">
        <label class="field-label">API Key <span style="opacity:.5">(optional)</span></label>
        <input type="password" id="apiKey-openai-compat"
          placeholder="${hasKeys['openai-compat'] ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022 (stored)' : 'Leave blank if not required'}">
        <div class="hint">Required for hosted endpoints (Together AI, Anyscale, etc.). Leave blank for self-hosted servers.</div>
      </div>
    </div>
    <div class="row-actions">
      <button type="button" class="btn-primary"   data-action="save-openai-compat">Save Config</button>
      <button type="button" class="btn-secondary" data-action="test" data-provider="openai-compat">Test Connection</button>
      <span id="delete-wrap-openai-compat">${delBtn('openai-compat')}</span>
    </div>
    <div id="status-openai-compat" class="status-area"></div>
  </div>
</div>

<!-- Local card -->
<div class="card${currentProvider === 'local' ? ' active' : ''}" id="card-local">
  <div class="card-header" data-select="local">
    <input type="radio" name="provider" id="radio-local" value="local"${currentProvider === 'local' ? ' checked' : ''}>
    <label>Local / Open-Source <span style="font-weight:400;opacity:.55">&nbsp;Mistral, LLaMA, Phi&hellip;</span></label>
    ${badge('local')}
  </div>
  <div class="body${currentProvider === 'local' ? ' open' : ''}" id="body-local">
    <div class="sec-label">1 &mdash; Model file</div>
    <div class="field">
      <label class="field-label">Model File (.gguf)</label>
      <div class="input-row">
        <input type="text" id="modelPath" placeholder="/path/to/mistral-7b.gguf">
        <button type="button" class="btn-browse" data-action="browse-model">&#128194; Browse</button>
      </div>
      <div class="hint">Any GGUF model file. Download from Hugging Face or use an existing file.</div>
    </div>

    <div class="sec-label">2 &mdash; Server options</div>
    <div class="grid3">
      <div class="field" style="margin-top:0">
        <label class="field-label">Port</label>
        <input type="number" id="serverPort" value="8080" min="1024" max="65535">
      </div>
      <div class="field" style="margin-top:0">
        <label class="field-label">GPU Layers</label>
        <input type="number" id="gpuLayers" value="99" min="0" max="999">
        <div class="hint" style="color:var(--warn)">&#9888; Set to <strong>99</strong> for Apple Silicon / NVIDIA. Use 0 for CPU-only.</div>
      </div>
      <div class="field" style="margin-top:0">
        <label class="field-label">Context Size</label>
        <input type="number" id="contextSize" value="4096" min="512" max="131072" step="512">
      </div>
    </div>

    <details style="margin-top:12px">
      <summary>Advanced &mdash; llama-server binary path</summary>
      ${binaryWarning}
      <div class="field">
        <label class="field-label">Binary Path <span style="opacity:.5">(blank = auto-detect)</span></label>
        <div class="input-row">
          <input type="text" id="binaryPath"
            placeholder="${binaryFound ? 'Auto-detected \u2713' : 'Not found in PATH \u2014 browse to set'}">
          <button type="button" class="btn-browse" data-action="browse-binary">&#128194; Browse</button>
        </div>
        <div class="hint">Install: <code>brew install llama.cpp</code> or download a release binary.</div>
      </div>
    </details>

    <button type="button" id="serverBtn" class="server-btn start" data-action="toggle-server">
      &#9654; Start Inference Server
    </button>

    <div class="server-status">
      <span class="dot stopped" id="statusDot"></span>
      <span id="statusText">Server stopped</span>
    </div>
    <div class="log-box" id="serverLog">
      <span style="opacity:.35">Server output will appear here&hellip;</span>
    </div>

    <hr class="divider">

    <div class="sec-label">Or connect to an existing server</div>

    <div class="field" style="margin-top:8px">
      <label class="field-label">API Type</label>
      <div class="api-type-toggle" id="apiTypeToggle">
        <button type="button" class="api-type-btn${localApiType !== 'ollama' ? ' active' : ''}" data-apitype="openai-compat">OpenAI-compatible</button>
        <button type="button" class="api-type-btn${localApiType === 'ollama' ? ' active' : ''}" data-apitype="ollama">Ollama native</button>
      </div>
      <div class="hint" id="apiTypeHint">${localApiType === 'ollama'
        ? 'Uses Ollama native /api/chat &mdash; URL should NOT include /v1'
        : 'LM Studio, llama.cpp server, Jan.ai, text-generation-webui&hellip;'
      }</div>
    </div>

    <div class="grid2">
      <div class="field">
        <label class="field-label">Base URL</label>
        <input type="text" id="localBaseUrl" value="${localBaseUrl}"
          placeholder="${localApiType === 'ollama' ? 'http://localhost:11434' : 'http://localhost:8080/v1'}">
      </div>
      <div class="field">
        <label class="field-label">Model Name</label>
        <input type="text" id="localModel" value="${localModel}" placeholder="mistral">
      </div>
    </div>

    <div class="grid2">
      <div class="field">
        <label class="field-label">Context Size (tokens)</label>
        <input type="number" id="extContextSize" value="${localContextSize}" min="512" max="131072" step="512">
        <div class="hint">Match your model&rsquo;s context window. Used to size file chunks.</div>
      </div>
      <div class="field" id="extApiKeyField"${localApiType === 'ollama' ? ' style="display:none"' : ''}>
        <label class="field-label">API Key <span style="opacity:.5">(optional)</span></label>
        <input type="password" id="apiKey-local" placeholder="Leave blank for most local servers">
      </div>
    </div>

    <div class="row-actions">
      <button type="button" class="btn-primary"   data-action="save-local">Save Config</button>
      <button type="button" class="btn-secondary" data-action="test" data-provider="local">Test Connection</button>
      <span id="delete-wrap-local">${delBtn('local')}</span>
    </div>
    <div id="status-local" class="status-area"></div>
  </div>
</div>
</div><!-- end tab-providers -->

<!-- ── TAB: Settings ── -->
<div id="tab-settings" class="tab-content">
<h1>&#9881; Settings</h1>
<p class="subtitle">Configure analysis behavior, file selection, and automation</p>

<h2>File Selection</h2>
<div class="card">
  <div class="body open" style="display:block">
    <div class="field">
      <label class="field-label">File Selection — <code>.include.codeatlas</code></label>
      ${includeFileExists
        ? '<div class="msg ok" style="margin-top:6px">&#10003; <code>.include.codeatlas</code> found. Only files and directories listed in it will be analyzed.</div>'
        : `<div class="msg" style="margin-top:6px; background:rgba(255,152,0,.12); color:var(--warn)">
            &#9888; No <code>.include.codeatlas</code> file found in the workspace root.<br>
            Create this file to control which files are analyzed.
          </div>
          <pre class="code-sample"># Directories to include (scanned recursively)
src
lib

# Individual files
main.ts
utils/helpers.py

# Lines starting with # are comments</pre>`
      }
    </div>
    <div class="grid2" style="margin-top:12px">
      <div class="field" style="margin-top:0">
        <label class="field-label">Included Extensions <span style="opacity:.5;font-weight:400">(one per line)</span></label>
        <textarea id="includedExtensions" rows="7"
          style="font-family:var(--vscode-editor-font-family,monospace);resize:vertical"
          placeholder=".ts&#10;.tsx&#10;.js&#10;.py">${includedExtensions.join('\n')}</textarea>
        <div class="hint">File extensions to analyze.</div>
      </div>
      <div class="field" style="margin-top:0">
        <label class="field-label">Exclude Patterns <span style="opacity:.5;font-weight:400">(one per line)</span></label>
        <textarea id="excludePatterns" rows="7"
          style="font-family:var(--vscode-editor-font-family,monospace);resize:vertical"
          placeholder="**/node_modules/**&#10;**/dist/**">${excludePatterns.join('\n')}</textarea>
        <div class="hint">Glob patterns to exclude from analysis.</div>
      </div>
    </div>
  </div>
</div>

<h2>Analysis Settings</h2>
<div class="card">
  <div class="body open" style="display:block">
    <div class="grid3">
      <div class="field" style="margin-top:0">
        <label class="field-label">Requests Per Minute</label>
        <input type="number" id="requestsPerMinute" value="${requestsPerMinute}" min="1" max="10000">
        <div class="hint">Max LLM API calls per minute. Gemini free = 15, OpenAI paid = 500+. Ignored for local models.</div>
      </div>
      <div class="field" style="margin-top:0">
        <label class="field-label">Concurrent Requests</label>
        <input type="number" id="concurrentRequests" value="${concurrentRequests}" min="1" max="20">
        <div class="hint">Parallel LLM requests. 1 = sequential (safe default).</div>
      </div>
      <div class="field" style="margin-top:0">
        <label class="field-label">Max File Size (KB)</label>
        <input type="number" id="maxFileSizeKB" value="${maxFileSizeKB}" min="1" max="10000">
        <div class="hint">Files larger than this are chunked.</div>
      </div>
    </div>

    <div class="field" style="margin-top:16px">
      <label class="field-label">Auto-Update Index</label>
      <div style="display:flex; align-items:center; gap:10px; margin-top:6px">
        <label style="display:flex; align-items:center; gap:6px; cursor:pointer; font-size:13px">
          <input type="checkbox" id="autoUpdateToggle" ${autoUpdate ? 'checked' : ''}
            style="width:15px; height:15px; cursor:pointer">
          Automatically update the index when files change or branches switch
        </label>
      </div>
      <div class="hint" style="margin-top:6px">
        When enabled, CodeAtlas watches for file saves and git branch switches,
        then incrementally updates the semantic index. Requires an existing index (run full analysis first).
      </div>
    </div>
  </div>
</div>

<h2>Index Location</h2>
<div class="card">
  <div class="body open" style="display:block">
    ${indexExists
      ? `<div class="msg ok" style="margin-top:6px">&#10003; Index available at:</div>`
      : `<div class="msg" style="margin-top:6px; background:rgba(255,152,0,.12); color:var(--warn)">
          &#9888; No index found. Run a full analysis first.
        </div>`
    }
    <div style="margin-top:8px; display:flex; align-items:center; gap:8px">
      <input type="text" id="indexPathDisplay" readonly
        value="${currentIndexPath}"
        style="flex:1; font-family:var(--vscode-editor-font-family, monospace); font-size:12px; opacity:.9">
      <button type="button" class="btn-secondary" data-action="copy-index-path" style="flex-shrink:0">&#128203; Copy</button>
    </div>
    <div class="hint" style="margin-top:6px">
      This <code>.codeatlas/current/</code> directory always contains the latest branch&rsquo;s index.
      Key files: <code>index.json</code>, <code>CONTEXT.md</code>, <code>context/</code>.
    </div>
  </div>
</div>

<div class="row-actions" style="margin-top:16px">
  <button type="button" class="btn-primary" data-action="save-settings">Save Settings</button>
</div>
<div id="status-settings" class="status-area"></div>
</div><!-- end tab-settings -->

<!-- ── TAB: Statistics ── -->
<div id="tab-statistics" class="tab-content">
<h1>&#128202; Usage Statistics</h1>
<p class="subtitle">Token usage, file counts, and averages across all workflow runs</p>

<div id="stats-content">
  ${buildStatsHtml()}
</div>

<div class="row-actions" style="margin-top:16px">
  <button type="button" class="btn-secondary" data-action="refresh-stats">&#8635; Refresh</button>
  <button type="button" class="btn-danger" data-action="reset-stats">Reset All Statistics</button>
</div>
<div id="status-usage" class="status-area"></div>
</div><!-- end tab-statistics -->

<!-- ── TAB: About ── -->
<div id="tab-about" class="tab-content">
<h1>&#8505; About CodeAtlas</h1>
<p class="subtitle">Semantic codebase indexing for AI-assisted development</p>

<div class="about-section">
  <h3>What CodeAtlas Does</h3>
  <p style="font-size:13px; line-height:1.7; opacity:.85">
    CodeAtlas analyzes your source code with an LLM to generate plain-English semantic descriptions
    of every file and symbol. The resulting index helps AI code editors (Cursor, Copilot, Claude)
    understand your codebase without reading every file from scratch.
  </p>
</div>

<div class="about-section">
  <h3>Key Features</h3>
  <ul class="feature-list">
    <li>Semantic analysis of TypeScript, JavaScript, Python, Go, Rust, Java, C#, C++, and more</li>
    <li>Intelligent caching — unchanged files are never re-analyzed</li>
    <li>Branch-aware indexing — each git branch has its own semantic index</li>
    <li>Incremental updates — only changed files are re-analyzed on save or branch switch</li>
    <li>Batched analysis — multiple small files analyzed in a single LLM call</li>
    <li>Works with any LLM: OpenAI, Gemini, Claude, Ollama, local GGUF models</li>
    <li>File dependency graph with import resolution</li>
    <li>Keyword-indexed symbol search</li>
  </ul>
</div>

<div class="about-section">
  <h3>How to Use the Index</h3>
  <p style="font-size:13px; line-height:1.7; opacity:.85">
    After running an analysis, the index is stored in <code>.codeatlas/current/</code>.
    Add this directory to your AI editor's context:
  </p>
  <pre class="code-sample">
# In Cursor's rules or Claude's project knowledge, add:
@.codeatlas/current/CONTEXT.md
@.codeatlas/current/index.json

# Or for a specific file context:
@.codeatlas/current/context/src/myFile.ts.md</pre>
</div>

<div class="about-section">
  <h3>.include.codeatlas Format</h3>
  <p style="font-size:13px; line-height:1.7; opacity:.85">
    Create a <code>.include.codeatlas</code> file in your workspace root to control which files are analyzed:
  </p>
  <pre class="code-sample">
# Include a directory (scanned recursively for matching extensions)
src
lib/core

# Include a specific file
config/settings.py

# Lines starting with # are comments
# Empty lines are ignored</pre>
</div>

<div class="about-section">
  <h3>Supported Languages</h3>
  <p style="font-size:13px; line-height:1.7; opacity:.85">
    TypeScript, JavaScript (including React/Vue/Svelte),
    Python, Go, Rust, Java, C#, C++, C, Ruby, PHP, Swift, Kotlin, Scala
  </p>
</div>

<div class="about-section" style="opacity:.6; font-size:12px; margin-top:32px">
  CodeAtlas v0.1.0 &bull; <a href="https://github.com/codeatlas/codeatlas" style="color:var(--accent)">GitHub</a>
</div>
</div><!-- end tab-about -->

<script>
(function() {
  var vscode = acquireVsCodeApi();
  var _serverRunning = false;
  var _apiType = '${localApiType}';

  // ── Tab switching ──────────────────────────────────────────────────────────
  document.querySelectorAll('.tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
      document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
      tab.classList.add('active');
      var tabId = 'tab-' + tab.dataset.tab;
      var content = document.getElementById(tabId);
      if (content) { content.classList.add('active'); }
    });
  });

  // ── API type toggle ────────────────────────────────────────────────────────
  document.querySelectorAll('.api-type-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      _apiType = btn.dataset.apitype;
      document.querySelectorAll('.api-type-btn').forEach(function(b) {
        b.classList.toggle('active', b.dataset.apitype === _apiType);
      });
      var hint     = document.getElementById('apiTypeHint');
      var urlEl    = document.getElementById('localBaseUrl');
      var keyField = document.getElementById('extApiKeyField');
      if (_apiType === 'ollama') {
        if (hint)     { hint.textContent = 'Uses Ollama native /api/chat \u2014 URL should NOT include /v1'; }
        if (urlEl)    { urlEl.placeholder = 'http://localhost:11434'; }
        if (keyField) { keyField.style.display = 'none'; }
      } else {
        if (hint)     { hint.textContent = 'LM Studio, llama.cpp server, Jan.ai, text-generation-webui\u2026'; }
        if (urlEl)    { urlEl.placeholder = 'http://localhost:8080/v1'; }
        if (keyField) { keyField.style.display = ''; }
      }
    });
  });

  // ── Provider selection ─────────────────────────────────────────────────────
  function selectProvider(p) {
    ['openai','gemini','claude','openai-compat','local'].forEach(function(x) {
      var body  = document.getElementById('body-'  + x);
      var card  = document.getElementById('card-'  + x);
      var radio = document.getElementById('radio-' + x);
      if (!body || !card || !radio) { return; }
      var active = (x === p);
      body.classList.toggle('open',   active);
      card.classList.toggle('active', active);
      radio.checked = active;
    });
  }

  document.querySelectorAll('.card-header[data-select]').forEach(function(header) {
    header.addEventListener('click', function(e) {
      if (e.target.tagName === 'INPUT') { return; }
      selectProvider(header.dataset.select);
    });
  });

  document.querySelectorAll('input[name="provider"]').forEach(function(radio) {
    radio.addEventListener('change', function() { selectProvider(radio.value); });
  });

  // ── Button actions ─────────────────────────────────────────────────────────
  document.addEventListener('click', function(e) {
    var btn = e.target.closest('button[data-action]');
    if (!btn) { return; }
    var action   = btn.dataset.action;
    var provider = btn.dataset.provider;

    switch (action) {
      case 'save':               save(provider);           break;
      case 'test':               testProvider(provider);   break;
      case 'delete':             deleteKey(provider);      break;
      case 'save-local':         saveLocal();              break;
      case 'save-openai-compat': saveOpenAICompat();       break;
      case 'save-settings':      saveSettings();           break;
      case 'copy-index-path':    copyIndexPath();          break;
      case 'reset-stats':        resetStats();             break;
      case 'refresh-stats':      vscode.postMessage({ type: 'refreshStats' }); break;
      case 'toggle-server':      toggleServer();           break;
      case 'browse-model':       vscode.postMessage({ type: 'browseModel' });  break;
      case 'browse-binary':      vscode.postMessage({ type: 'browseBinary' }); break;
    }
  });

  // ── Cloud provider save ────────────────────────────────────────────────────
  function save(p) {
    var keyEl   = document.getElementById('apiKey-' + p);
    var modelEl = document.getElementById('model-'  + p);
    if (!keyEl || !modelEl) { return; }
    vscode.postMessage({ type: 'saveConfig', provider: p, apiKey: keyEl.value, model: modelEl.value });
  }

  function testProvider(p) {
    var statusEl = document.getElementById('status-' + p);
    if (statusEl) { statusEl.innerHTML = '<div class="msg info">Testing\u2026</div>'; }
    var keyEl = document.getElementById('apiKey-' + p);
    var modelEl = document.getElementById('model-' + p);
    var baseUrlEl = document.getElementById(p === 'openai-compat' ? 'openaiCompatBaseUrl' : 'localBaseUrl');
    var compat_modelEl = document.getElementById(p === 'openai-compat' ? 'openaiCompatModel' : 'localModel');
    vscode.postMessage({
      type: 'testConnection',
      provider: p,
      apiKey:   keyEl ? keyEl.value : '',
      model:    (modelEl || compat_modelEl) ? (modelEl || compat_modelEl).value : '',
      baseUrl:  baseUrlEl ? baseUrlEl.value : undefined,
      apiType:  _apiType,
    });
  }

  function deleteKey(p) {
    if (!confirm('Clear ' + p + ' configuration?')) { return; }
    vscode.postMessage({ type: 'deleteKey', provider: p });
  }

  function saveLocal() {
    vscode.postMessage({
      type:        'saveLocal',
      baseUrl:     val('localBaseUrl'),
      model:       val('localModel'),
      apiType:     _apiType,
      contextSize: val('extContextSize'),
      apiKey:      val('apiKey-local'),
    });
  }

  function saveOpenAICompat() {
    vscode.postMessage({
      type:        'saveOpenAICompat',
      baseUrl:     val('openaiCompatBaseUrl'),
      model:       val('openaiCompatModel'),
      apiKey:      val('apiKey-openai-compat'),
      contextSize: val('openaiCompatContextSize'),
    });
  }

  function saveSettings() {
    vscode.postMessage({
      type:               'saveSettings',
      requestsPerMinute:  val('requestsPerMinute'),
      concurrentRequests: val('concurrentRequests'),
      maxFileSizeKB:      val('maxFileSizeKB'),
      includedExtensions: val('includedExtensions'),
      excludePatterns:    val('excludePatterns'),
      autoUpdate:         document.getElementById('autoUpdateToggle').checked ? 'true' : 'false',
    });
  }

  function copyIndexPath() {
    var el = document.getElementById('indexPathDisplay');
    if (!el) { return; }
    navigator.clipboard.writeText(el.value).catch(function() {
      el.select();
      document.execCommand('copy');
    });
    var btn = document.querySelector('[data-action="copy-index-path"]');
    if (btn) { btn.textContent = '\u2713 Copied!'; setTimeout(function() { btn.textContent = '\uD83D\uDCCB Copy'; }, 2000); }
  }

  function resetStats() {
    if (!confirm('Reset all usage statistics? This cannot be undone.')) { return; }
    vscode.postMessage({ type: 'resetStats' });
  }

  function toggleServer() {
    if (_serverRunning) {
      vscode.postMessage({ type: 'stopServer' });
    } else {
      vscode.postMessage({
        type:        'startServer',
        modelPath:   val('modelPath'),
        port:        val('serverPort'),
        gpuLayers:   val('gpuLayers'),
        contextSize: val('contextSize'),
        model:       val('localModel') || 'local',
        binaryPath:  val('binaryPath'),
      });
    }
  }

  function val(id) {
    var el = document.getElementById(id);
    return el ? el.value : '';
  }

  function setStatus(elId, type, msg) {
    var el = document.getElementById(elId);
    if (el) { el.innerHTML = '<div class="msg ' + type + '">' + msg + '</div>'; }
  }

  // ── Message from extension ─────────────────────────────────────────────────
  window.addEventListener('message', function(event) {
    var msg = event.data;
    switch (msg.type) {

      case 'saved': {
        var statusEl = document.getElementById('status-' + msg.provider);
        if (statusEl) { statusEl.innerHTML = '<div class="msg ok">&#10003; Saved</div>'; }
        var badge = document.getElementById('badge-' + msg.provider);
        if (badge) {
          badge.className = msg.keyStored ? 'badge ok' : 'badge missing';
          badge.textContent = msg.keyStored ? 'Ready \u2713' : 'Not configured';
        }
        break;
      }

      case 'keyDeleted': {
        var badge2 = document.getElementById('badge-' + msg.provider);
        if (badge2) { badge2.className = 'badge missing'; badge2.textContent = 'Not configured'; }
        var wrap = document.getElementById('delete-wrap-' + msg.provider);
        if (wrap) { wrap.innerHTML = ''; }
        break;
      }

      case 'testStart': {
        var el = document.getElementById('status-' + msg.provider);
        if (el) { el.innerHTML = '<div class="msg info">Testing connection\u2026</div>'; }
        break;
      }

      case 'testSuccess': {
        var el2 = document.getElementById('status-' + msg.provider);
        if (el2) { el2.innerHTML = '<div class="msg ok">&#10003; Connection successful!</div>'; }
        break;
      }

      case 'testError': {
        var el3 = document.getElementById('status-' + msg.provider);
        if (el3) { el3.innerHTML = '<div class="msg err">&#10007; ' + escHtml(msg.error) + '</div>'; }
        break;
      }

      case 'settingsSaved': {
        setStatus('status-settings', 'ok', '\u2713 Settings saved');
        break;
      }

      case 'statsReset': {
        setStatus('status-usage', 'ok', 'Statistics reset');
        vscode.postMessage({ type: 'refreshStats' });
        break;
      }

      case 'statsContent': {
        var statsDiv = document.getElementById('stats-content');
        if (statsDiv) { statsDiv.innerHTML = msg.html; }
        break;
      }

      case 'modelPathSelected': {
        var mp = document.getElementById('modelPath');
        if (mp) { mp.value = msg.path; }
        break;
      }

      case 'binaryPathSelected': {
        var bp = document.getElementById('binaryPath');
        if (bp) { bp.value = msg.path; }
        break;
      }

      case 'serverState': {
        updateServerUI(msg);
        break;
      }

      case 'switchTab': {
        var tabName = msg.tab;
        document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
        document.querySelectorAll('.tab-content').forEach(function(c) { c.classList.remove('active'); });
        var targetBtn = document.querySelector('.tab[data-tab="' + tabName + '"]');
        if (targetBtn) { targetBtn.classList.add('active'); }
        var targetContent = document.getElementById('tab-' + tabName);
        if (targetContent) { targetContent.classList.add('active'); }
        break;
      }
    }
  });

  function updateServerUI(state) {
    _serverRunning = state.status === 'running';
    var dot      = document.getElementById('statusDot');
    var text     = document.getElementById('statusText');
    var btn      = document.getElementById('serverBtn');
    var logBox   = document.getElementById('serverLog');

    if (dot) {
      dot.className = 'dot ' + state.status;
    }
    if (text) {
      var labels = { stopped: 'Server stopped', starting: 'Starting\u2026', running: 'Server running on port ' + state.port, error: 'Server error' };
      text.textContent = labels[state.status] || state.status;
    }
    if (btn) {
      if (state.status === 'running') {
        btn.textContent = '\u25A0 Stop Server'; btn.className = 'server-btn stop';
      } else if (state.status === 'starting') {
        btn.textContent = '\u23F3 Starting\u2026'; btn.className = 'server-btn starting';
      } else {
        btn.textContent = '\u25B6 Start Inference Server'; btn.className = 'server-btn start';
      }
    }
    if (logBox && state.logLine) {
      var wasAtBottom = logBox.scrollHeight - logBox.scrollTop <= logBox.clientHeight + 5;
      var span = document.createElement('div');
      span.textContent = state.logLine;
      logBox.appendChild(span);
      if (wasAtBottom) { logBox.scrollTop = logBox.scrollHeight; }
    }
    if (logBox && state.logs && state.logs.length > 0) {
      logBox.innerHTML = '';
      state.logs.forEach(function(l) {
        var d = document.createElement('div');
        d.textContent = l;
        logBox.appendChild(d);
      });
      logBox.scrollTop = logBox.scrollHeight;
    }
  }

  function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

})();
</script>
</body>
</html>`;
  }

  /** Open the panel and navigate immediately to the Statistics tab. */
  async showStats(): Promise<void> {
    await this.show();
    // Slight delay lets the webview finish loading before we send the tab-switch
    setTimeout(() => {
      this.panel?.webview.postMessage({ type: 'switchTab', tab: 'statistics' });
      this.sendStats();
    }, 200);
  }

  dispose(): void {
    this.disposables.forEach(d => d.dispose());
    this.panel?.dispose();
  }
}
