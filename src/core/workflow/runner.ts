import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { ILLMProvider } from '../../llm/types';
import { buildDependencyGraph, DependencyGraph } from '../analyzer/graphBuilder';
import {
  analyzeFile,
  analyzeFileBatch,
  partitionForBatching,
  renderContextMarkdown,
  FileContext,
} from '../analyzer/fileAnalyzer';
import { buildIndex, persistIndex, persistContextOverview, SemanticIndex } from '../analyzer/indexer';
import {
  collectSourceFiles,
  ensureCodeAtlasDirs,
  writeJson,
  writeText,
  readJson,
  getGraphFilePath,
  getContextFilePath,
  getIndexFilePath,
  toRelativePath,
  toAbsolutePath,
  setActiveBranch,
  isGitRepo,
  publishCurrentIndex,
} from '../../utils/fileUtils';
import { RateLimiter } from '../../llm/rateLimiter';
import { UsageTracker, persistWorkflowUsage } from '../stats/usageStats';
import { logger } from '../../utils/logger';
import {
  getCurrentBranch,
  getFileContentHash,
  getAllChangedFiles,
  getHeadCommit,
} from '../git/gitService';
import {
  batchCacheContexts,
  cacheFileContext,
  getCachedFileContext,
  loadBranchState,
  updateBranchState,
  removeFromBranchState,
  partitionByCacheHit,
} from '../cache/contextCache';

export interface WorkflowOptions {
  requestsPerMinute: number;
  maxFileSizeKB: number;
  /** Max characters per file chunk sent to the LLM. Auto-computed from context size for local models. */
  maxChunkChars: number;
  /** If true, all files are analyzed individually — no batching (required for small-context local models). */
  batchFiles: boolean;
  /** Number of LLM requests to run in parallel. 1 = sequential (default). */
  concurrentRequests: number;
}

export interface WorkflowResult {
  filesAnalyzed: number;
  filesFromCache: number;
  symbolsIndexed: number;
  errors: string[];
  duration: number;
}

let _currentWorkflow: vscode.CancellationTokenSource | null = null;

export function isWorkflowRunning(): boolean {
  return _currentWorkflow !== null;
}

export function cancelWorkflow(): void {
  _currentWorkflow?.cancel();
}

/**
 * Resolve and set the active branch before running any workflow.
 * Returns the branch name and current HEAD commit.
 */
function activateBranch(): { branch: string; headCommit: string } {
  const branch = isGitRepo() ? getCurrentBranch() : 'default';
  setActiveBranch(branch);
  const headCommit = isGitRepo() ? getHeadCommit() : '';
  return { branch, headCommit };
}

// ─── Full Workflow (with caching) ─────────────────────────────────────────────

export async function runFullWorkflow(
  llm: ILLMProvider,
  options: WorkflowOptions
): Promise<WorkflowResult> {
  if (_currentWorkflow) {
    throw new Error('A workflow is already running. Cancel it first.');
  }

  const cts = new vscode.CancellationTokenSource();
  _currentWorkflow = cts;
  const abortController = new AbortController();
  cts.token.onCancellationRequested(() => abortController.abort());
  const signal = abortController.signal;

  const startTime = Date.now();
  const errors: string[] = [];

  try {
    return await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'CodeAtlas', cancellable: true },
      async (progress, token) => {
        token.onCancellationRequested(() => cts.cancel());
        logger.show();

        // ── Activate branch ─────────────────────────────────────────────
        const { branch, headCommit } = activateBranch();
        const isUnlimitedRpm = llm.name === 'local' || llm.name === 'openai-compat';
        const effectiveRpm = isUnlimitedRpm ? 10_000 : options.requestsPerMinute;
        logger.section(`CodeAtlas Full Analysis`);
        logger.info(`Branch: ${branch} | Provider: ${llm.name}${isUnlimitedRpm ? ' (no rate limit)' : `, RPM cap: ${options.requestsPerMinute}`}`);

        // ── Step 1: Collect files ─────────────────────────────────────────
        progress.report({ message: 'Collecting source files…', increment: 0 });
        const sourceFiles = await collectSourceFiles();
        if (sourceFiles.length === 0) {
          throw new Error('No source files found. Check your includedExtensions setting.');
        }
        logger.info(`Found ${sourceFiles.length} source files`);
        checkCancellation(cts.token);

        // ── Step 2: Ensure dirs ───────────────────────────────────────────
        ensureCodeAtlasDirs();

        // ── Step 3: Build dependency graph ────────────────────────────────
        progress.report({ message: 'Building dependency graph…', increment: 5 });
        const graph = await buildDependencyGraph(sourceFiles);
        writeJson(getGraphFilePath(), graph);
        logger.info(`Graph: ${graph.stats.totalFiles} files, ${graph.stats.totalSymbols} symbols, ${graph.stats.totalEdges} edges`);
        checkCancellation(cts.token);

        // ── Step 4: Check shared cache for files that don't need re-analysis
        progress.report({ message: 'Checking cache…', increment: 8 });
        const sortedFiles = topologicalSort(graph);
        const allNodes = sortedFiles
          .map(p => graph.files[p])
          .filter(Boolean)
          .filter(n => n.sizeBytes / 1024 <= options.maxFileSizeKB * 5);

        // Compute content hashes and check shared cache
        const filesWithHashes = allNodes.map(node => ({
          relativePath: node.path,
          contentHash: getFileContentHash(node.absolutePath),
        }));

        const { cached, uncached } = partitionByCacheHit(filesWithHashes);
        const cachedContexts: FileContext[] = cached.map(c => c.ctx);

        logger.info(`Cache: ${cached.length} files from cache, ${uncached.length} files need analysis`);

        // Write cached context files to this branch's context dir
        for (const { ctx } of cached) {
          writeText(getContextFilePath(ctx.relativePath), renderContextMarkdown(ctx));
        }

        // ── Step 5: Analyze uncached files ────────────────────────────────
        const uncachedNodes = uncached
          .map(p => graph.files[p])
          .filter(Boolean);

        const { batches, large } = options.batchFiles
          ? partitionForBatching(uncachedNodes)
          : { batches: [], large: uncachedNodes };

        const estimatedRequests = batches.length + large.length;

        if (estimatedRequests > 0) {
          logger.info(
            options.batchFiles
              ? `Analysis plan: ${batches.length} batch requests (${batches.reduce((s, b) => s + b.length, 0)} small files) ` +
                `+ ${large.length} individual requests = ${estimatedRequests} total API calls`
              : `Analysis plan: ${large.length} individual requests (batching disabled for local model)`
          );
          logger.info(`Max chunk size: ${options.maxChunkChars.toLocaleString()} chars (~${Math.round(options.maxChunkChars / 4)} tokens)`);
          if (!isUnlimitedRpm) {
            logger.info(`Rate limit: ${effectiveRpm} RPM — estimated time: ~${Math.ceil(estimatedRequests / effectiveRpm)} min`);
          }
        } else {
          logger.info('All files served from cache — no LLM calls needed');
        }

        const limiter = new RateLimiter(effectiveRpm);
        const tracker = new UsageTracker();
        const analyzedContexts: FileContext[] = [];
        const newCacheEntries: Array<{ contentHash: string; ctx: FileContext }> = [];
        let done = 0;
        const total = estimatedRequests;
        const concurrency = options.concurrentRequests;

        if (concurrency > 1) {
          logger.info(`Running analysis with ${concurrency} concurrent requests`);
        }

        // Process batches
        const batchTasks = batches.map(batch => async () => {
          const names = batch.map(n => path.basename(n.path)).join(', ');
          progress.report({
            message: `Batch (${batch.length} files): ${names} — ${++done}/${total}`,
            increment: total > 0 ? Math.round((1 / total) * 70) : 0,
          });
          return analyzeFileBatch(batch, graph, llm, limiter, signal, tracker);
        });

        const batchOutcomes = await runConcurrent(batchTasks, concurrency);
        for (let i = 0; i < batchOutcomes.length; i++) {
          const outcome = batchOutcomes[i];
          if (outcome.error) {
            if ((outcome.error as Error).name === 'AbortError') { throw new vscode.CancellationError(); }
            const names = batches[i].map(n => path.basename(n.path)).join(', ');
            const msg = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
            logger.error(`Batch failed: ${names}`, outcome.error);
            errors.push(`Batch error [${names}]: ${msg}`);
            continue;
          }
          for (const ctx of outcome.result!) {
            analyzedContexts.push(ctx);
            writeText(getContextFilePath(ctx.relativePath), renderContextMarkdown(ctx));
            const hash = filesWithHashes.find(f => f.relativePath === ctx.relativePath)?.contentHash;
            if (hash) { newCacheEntries.push({ contentHash: hash, ctx }); }
          }
        }

        // Process individual files
        const largeTasks = large.map(node => async () => {
          progress.report({
            message: `${path.basename(node.path)} — ${++done}/${total}`,
            increment: total > 0 ? Math.round((1 / total) * 70) : 0,
          });
          return analyzeFile(node, graph, llm, limiter, signal, options.maxChunkChars, tracker);
        });

        const largeOutcomes = await runConcurrent(largeTasks, concurrency);
        for (let i = 0; i < largeOutcomes.length; i++) {
          const outcome = largeOutcomes[i];
          if (outcome.error) {
            if ((outcome.error as Error).name === 'AbortError') { throw new vscode.CancellationError(); }
            const msg = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
            logger.error(`Failed: ${large[i].path}`, outcome.error);
            errors.push(`Error: ${large[i].path}: ${msg}`);
            continue;
          }
          const ctx = outcome.result!;
          analyzedContexts.push(ctx);
          writeText(getContextFilePath(ctx.relativePath), renderContextMarkdown(ctx));
          const hash = filesWithHashes.find(f => f.relativePath === ctx.relativePath)?.contentHash;
          if (hash) { newCacheEntries.push({ contentHash: hash, ctx }); }
        }

        checkCancellation(cts.token);

        // ── Step 6: Cache newly analyzed contexts & update branch state ──
        if (newCacheEntries.length > 0) {
          batchCacheContexts(newCacheEntries, branch, headCommit);
        }

        // Always update branch state with all file hashes (cached + new)
        const allFileHashes: Record<string, string> = {};
        for (const fh of filesWithHashes) { allFileHashes[fh.relativePath] = fh.contentHash; }
        updateBranchState(branch, headCommit, allFileHashes);

        // ── Step 7: Build index ───────────────────────────────────────────
        progress.report({ message: 'Building semantic index…', increment: 90 });
        const allContexts = [...cachedContexts, ...analyzedContexts];
        const index = buildIndex(allContexts, graph);
        persistIndex(index);
        persistContextOverview(index, graph);
        publishCurrentIndex();

        progress.report({ message: 'Done!', increment: 100 });
        const duration = Date.now() - startTime;
        logger.info(
          `Complete in ${(duration / 1000).toFixed(1)}s — ${allContexts.length} files ` +
          `(${cached.length} from cache, ${analyzedContexts.length} analyzed), ${index.totalSymbols} symbols`
        );

        persistWorkflowUsage(llm.name, tracker, analyzedContexts.length, cached.length, errors.length);

        return {
          filesAnalyzed: analyzedContexts.length,
          filesFromCache: cached.length,
          symbolsIndexed: index.totalSymbols,
          errors,
          duration,
        };
      }
    );
  } finally {
    _currentWorkflow = null;
  }
}

// ─── Incremental Update Workflow ──────────────────────────────────────────────

export async function runIncrementalUpdate(
  llm: ILLMProvider,
  options: WorkflowOptions
): Promise<WorkflowResult> {
  if (_currentWorkflow) {
    throw new Error('A workflow is already running. Cancel it first.');
  }

  const cts = new vscode.CancellationTokenSource();
  _currentWorkflow = cts;
  const abortController = new AbortController();
  cts.token.onCancellationRequested(() => abortController.abort());
  const signal = abortController.signal;

  const startTime = Date.now();
  const errors: string[] = [];

  try {
    return await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'CodeAtlas: Updating', cancellable: true },
      async (progress, token) => {
        token.onCancellationRequested(() => cts.cancel());

        // ── Activate branch ─────────────────────────────────────────────
        const { branch, headCommit } = activateBranch();
        const isUnlimitedRpm = llm.name === 'local' || llm.name === 'openai-compat';
        const effectiveRpm = isUnlimitedRpm ? 10_000 : options.requestsPerMinute;
        logger.section(`CodeAtlas Incremental Update`);
        logger.info(`Branch: ${branch} | Provider: ${llm.name}${isUnlimitedRpm ? ' (no rate limit)' : `, RPM cap: ${effectiveRpm}`}`);

        // ── Check prerequisites ───────────────────────────────────────────
        const existingIndex = readJson<SemanticIndex>(getIndexFilePath());
        if (!existingIndex) {
          logger.info('No existing index for this branch — falling back to full workflow');
          _currentWorkflow = null;
          return runFullWorkflow(llm, options);
        }

        const branchState = loadBranchState(branch);
        if (!branchState) {
          logger.info('No branch state found — falling back to full workflow');
          _currentWorkflow = null;
          return runFullWorkflow(llm, options);
        }

        // ── Detect changes ────────────────────────────────────────────────
        progress.report({ message: 'Detecting changes…', increment: 0 });

        const { needsAnalysis: changedRelPaths, deleted: deletedRelPaths } =
          getAllChangedFiles(branchState.headCommit);

        if (changedRelPaths.length === 0 && deletedRelPaths.length === 0) {
          logger.info('No changes detected — index is up to date');
          return {
            filesAnalyzed: 0,
            filesFromCache: 0,
            symbolsIndexed: existingIndex.totalSymbols,
            errors: [],
            duration: Date.now() - startTime,
          };
        }

        logger.info(`Changes detected: ${changedRelPaths.length} modified/added, ${deletedRelPaths.length} deleted`);

        // ── Collect current source files & rebuild graph ──────────────────
        progress.report({ message: 'Rebuilding dependency graph…', increment: 10 });
        const sourceFiles = await collectSourceFiles();
        ensureCodeAtlasDirs();
        const graph = await buildDependencyGraph(sourceFiles);
        writeJson(getGraphFilePath(), graph);
        checkCancellation(cts.token);

        // ── Filter changed files to only those in current source set ──────
        const config = vscode.workspace.getConfiguration('codeatlas');
        const includedExtensions = new Set(
          config.get<string[]>('includedExtensions', []).map(e => e.toLowerCase())
        );

        const relevantChanged = changedRelPaths.filter(relPath => {
          const ext = path.extname(relPath).toLowerCase();
          return includedExtensions.has(ext) && graph.files[relPath];
        });

        const relevantDeleted = deletedRelPaths.filter(relPath =>
          existingIndex.files[relPath]
        );

        logger.info(`Relevant changes: ${relevantChanged.length} files to update, ${relevantDeleted.length} to remove`);

        if (relevantChanged.length === 0 && relevantDeleted.length === 0) {
          // Update branch state headCommit even if no relevant changes
          updateBranchState(branch, headCommit, {});
          return {
            filesAnalyzed: 0,
            filesFromCache: 0,
            symbolsIndexed: existingIndex.totalSymbols,
            errors: [],
            duration: Date.now() - startTime,
          };
        }

        // ── Check shared cache for reverted files ────────────────────────
        progress.report({ message: 'Checking cache for reverted files…', increment: 20 });

        const filesWithHashes = relevantChanged.map(relPath => ({
          relativePath: relPath,
          contentHash: getFileContentHash(toAbsolutePath(relPath)),
        }));

        const { cached, uncached } = partitionByCacheHit(filesWithHashes);
        logger.info(`Cache hits: ${cached.length} files restored from cache, ${uncached.length} need LLM analysis`);

        // Write cached context files to this branch's context dir
        for (const { ctx } of cached) {
          writeText(getContextFilePath(ctx.relativePath), renderContextMarkdown(ctx));
        }

        // ── Analyze uncached files ────────────────────────────────────────
        const limiter = new RateLimiter(effectiveRpm);
        const tracker = new UsageTracker();
        const analyzedContexts: FileContext[] = [];
        const newCacheEntries: Array<{ contentHash: string; ctx: FileContext }> = [];

        const uncachedNodes = uncached
          .map(relPath => graph.files[relPath])
          .filter(Boolean);

        const total = uncachedNodes.length;
        let done = 0;
        const concurrency = options.concurrentRequests;

        if (concurrency > 1 && total > 0) {
          logger.info(`Running incremental analysis with ${concurrency} concurrent requests`);
        }

        const uncachedTasks = uncachedNodes.map(node => async () => {
          progress.report({
            message: `Updating ${path.basename(node.path)} — ${++done}/${total}`,
            increment: total > 0 ? Math.round((1 / total) * 60) : 0,
          });
          return analyzeFile(node, graph, llm, limiter, signal, options.maxChunkChars, tracker);
        });

        const uncachedOutcomes = await runConcurrent(uncachedTasks, concurrency);
        for (let i = 0; i < uncachedOutcomes.length; i++) {
          const outcome = uncachedOutcomes[i];
          if (outcome.error) {
            if ((outcome.error as Error).name === 'AbortError') { throw new vscode.CancellationError(); }
            const msg = outcome.error instanceof Error ? outcome.error.message : String(outcome.error);
            logger.error(`Failed: ${uncachedNodes[i].path}`, outcome.error);
            errors.push(`Error: ${uncachedNodes[i].path}: ${msg}`);
            continue;
          }
          const ctx = outcome.result!;
          analyzedContexts.push(ctx);
          writeText(getContextFilePath(ctx.relativePath), renderContextMarkdown(ctx));
          const hash = filesWithHashes.find(f => f.relativePath === ctx.relativePath)?.contentHash;
          if (hash) { newCacheEntries.push({ contentHash: hash, ctx }); }
        }

        checkCancellation(cts.token);

        // ── Remove deleted files ──────────────────────────────────────────
        if (relevantDeleted.length > 0) {
          removeFromBranchState(branch, relevantDeleted);
          for (const relPath of relevantDeleted) {
            const ctxFile = getContextFilePath(relPath);
            try { fs.unlinkSync(ctxFile); } catch { /* already gone */ }
          }
          logger.info(`Removed ${relevantDeleted.length} deleted files from index`);
        }

        // ── Cache new results & update branch state ───────────────────────
        if (newCacheEntries.length > 0) {
          batchCacheContexts(newCacheEntries, branch, headCommit);
        }

        // Update branch state with all changed file hashes
        const fileHashMap: Record<string, string> = {};
        for (const fh of filesWithHashes) { fileHashMap[fh.relativePath] = fh.contentHash; }
        updateBranchState(branch, headCommit, fileHashMap);

        // ── Rebuild index by merging existing + updated contexts ──────────
        progress.report({ message: 'Rebuilding semantic index…', increment: 90 });

        const changedSet = new Set([...relevantChanged, ...relevantDeleted]);
        const unchangedContexts: FileContext[] = [];

        for (const [filePath, fileEntry] of Object.entries(existingIndex.files)) {
          if (changedSet.has(filePath)) { continue; }
          const existingSymbols = Object.values(existingIndex.symbols)
            .flat()
            .filter(s => s.file === filePath);

          unchangedContexts.push({
            relativePath: filePath,
            language: fileEntry.language,
            overview: fileEntry.overview,
            symbols: existingSymbols.map(s => ({
              name: s.name,
              kind: s.kind,
              line: s.line,
              purpose: s.purpose,
              behavior: s.behavior,
              limitations: s.limitations,
            })),
            dependencies: fileEntry.dependencies,
            analyzedAt: fileEntry.analyzedAt,
            chunkCount: 1,
          });
        }

        const allContexts = [
          ...unchangedContexts,
          ...cached.map(c => c.ctx),
          ...analyzedContexts,
        ];

        const index = buildIndex(allContexts, graph);
        persistIndex(index);
        persistContextOverview(index, graph);
        publishCurrentIndex();

        const duration = Date.now() - startTime;
        logger.info(
          `Incremental update in ${(duration / 1000).toFixed(1)}s — ` +
          `${analyzedContexts.length} analyzed, ${cached.length} from cache, ` +
          `${relevantDeleted.length} removed, ${index.totalSymbols} total symbols`
        );

        persistWorkflowUsage(llm.name, tracker, analyzedContexts.length, cached.length, errors.length);

        progress.report({ message: 'Done!', increment: 100 });

        return {
          filesAnalyzed: analyzedContexts.length,
          filesFromCache: cached.length,
          symbolsIndexed: index.totalSymbols,
          errors,
          duration,
        };
      }
    );
  } finally {
    _currentWorkflow = null;
  }
}

// ─── Single File Analysis ─────────────────────────────────────────────────────

export async function runSingleFileAnalysis(
  filePath: string,
  llm: ILLMProvider,
  options: Pick<WorkflowOptions, 'requestsPerMinute' | 'maxFileSizeKB' | 'maxChunkChars'>
): Promise<void> {
  // Activate branch before any path operations
  activateBranch();

  const sourceFiles = await collectSourceFiles();
  const graph = await buildDependencyGraph(sourceFiles);
  ensureCodeAtlasDirs();

  const relPath = toRelativePath(filePath);
  const fileNode = graph.files[relPath];
  if (!fileNode) {
    throw new Error(`File not in workspace source files: ${relPath}`);
  }

  return vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title: `CodeAtlas: Analyzing ${path.basename(filePath)}`,
      cancellable: false,
    },
    async (progress) => {
      // Check shared cache first
      const contentHash = getFileContentHash(filePath);
      const cachedCtx = getCachedFileContext(contentHash);

      if (cachedCtx) {
        progress.report({ message: 'Restored from cache' });
        writeText(getContextFilePath(relPath), renderContextMarkdown(cachedCtx));
        logger.info(`Single-file analysis (from cache): ${relPath}`);
        return;
      }

      progress.report({ message: 'Analyzing with LLM…' });
      const limiter = new RateLimiter(options.requestsPerMinute);
      const tracker = new UsageTracker();
      const ctx = await analyzeFile(fileNode, graph, llm, limiter, undefined, options.maxChunkChars, tracker);
      writeText(getContextFilePath(relPath), renderContextMarkdown(ctx));

      // Cache the result in shared cache and update branch state
      if (contentHash) {
        const { branch, headCommit } = activateBranch();
        cacheFileContext(contentHash, ctx);
        updateBranchState(branch, headCommit, { [relPath]: contentHash });
      }

      persistWorkflowUsage(llm.name, tracker, 1, 0, 0);

      progress.report({ message: 'Done!' });
      logger.info(`Single-file analysis complete: ${relPath}`);
    }
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function topologicalSort(graph: DependencyGraph): string[] {
  const visited = new Set<string>();
  const result: string[] = [];

  function visit(p: string): void {
    if (visited.has(p)) { return; }
    visited.add(p);
    const node = graph.files[p];
    if (node) {
      for (const dep of node.imports) { visit(dep); }
    }
    result.push(p);
  }

  for (const p of Object.keys(graph.files)) { visit(p); }
  return result;
}

function checkCancellation(token: vscode.CancellationToken): void {
  if (token.isCancellationRequested) {
    throw new vscode.CancellationError();
  }
}

/**
 * Run an array of async tasks with at most `concurrency` running in parallel.
 */
async function runConcurrent<T>(
  tasks: Array<() => Promise<T>>,
  concurrency: number,
): Promise<Array<{ result?: T; error?: unknown }>> {
  const results: Array<{ result?: T; error?: unknown }> = new Array(tasks.length);

  if (concurrency <= 1) {
    for (let i = 0; i < tasks.length; i++) {
      try {
        results[i] = { result: await tasks[i]() };
      } catch (e) {
        results[i] = { error: e };
      }
    }
    return results;
  }

  let next = 0;

  async function worker(): Promise<void> {
    while (next < tasks.length) {
      const i = next++;
      try {
        results[i] = { result: await tasks[i]() };
      } catch (e) {
        results[i] = { error: e };
        if ((e as Error).name === 'AbortError') {
          next = tasks.length;
          return;
        }
      }
    }
  }

  const workerCount = Math.min(concurrency, tasks.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
