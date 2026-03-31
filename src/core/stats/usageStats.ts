import * as fs from 'fs';
import * as path from 'path';
import { LLMResponse } from '../../llm/types';
import { getCodeAtlasDir } from '../../utils/fileUtils';
import { logger } from '../../utils/logger';

// ─── Per-provider stats (persisted) ──────────────────────────────────────────

export interface ProviderStats {
  inputTokens: number;
  outputTokens: number;
  /** Fallback total when provider doesn't split input/output */
  unsplitTokens: number;
  requestCount: number;
  filesAnalyzed: number;
  filesFromCache: number;
  errors: number;
  totalDurationMs: number;
  lastUsed: string;
}

export interface RunRecord {
  timestamp: string;
  provider: string;
  inputTokens: number;
  outputTokens: number;
  filesAnalyzed: number;
  filesFromCache: number;
  durationMs: number;
  errors: number;
}

export interface UsageStatsData {
  version: 1;
  providers: Record<string, ProviderStats>;
  global: {
    workflowRuns: number;
    firstUsed: string;
    lastUsed: string;
  };
  runHistory: RunRecord[];
}

// ─── Stats display with averages ─────────────────────────────────────────────

export interface StatsDisplay {
  providers: Array<{
    name: string;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalTokens: number;
    requestCount: number;
    filesAnalyzed: number;
    filesFromCache: number;
    errors: number;
    workflowRuns: number;
    avgInputTokensPerRun: number;
    avgOutputTokensPerRun: number;
    avgFilesPerRun: number;
    durationMin: number;
    lastUsed: string;
  }>;
  global: {
    workflowRuns: number;
    firstUsed: string;
    lastUsed: string;
  };
  recentRuns: RunRecord[];
}

export function getStatsDisplay(data: UsageStatsData): StatsDisplay {
  const workflowRuns = data.global.workflowRuns;
  return {
    providers: Object.entries(data.providers).map(([name, p]) => ({
      name,
      totalInputTokens: p.inputTokens,
      totalOutputTokens: p.outputTokens,
      totalTokens: p.inputTokens + p.outputTokens + p.unsplitTokens,
      requestCount: p.requestCount,
      filesAnalyzed: p.filesAnalyzed,
      filesFromCache: p.filesFromCache,
      errors: p.errors,
      workflowRuns,
      avgInputTokensPerRun: workflowRuns > 0 ? Math.round(p.inputTokens / workflowRuns) : 0,
      avgOutputTokensPerRun: workflowRuns > 0 ? Math.round(p.outputTokens / workflowRuns) : 0,
      avgFilesPerRun: workflowRuns > 0
        ? Math.round((p.filesAnalyzed + p.filesFromCache) / workflowRuns)
        : 0,
      durationMin: Math.round(p.totalDurationMs / 60000 * 10) / 10,
      lastUsed: p.lastUsed,
    })),
    global: data.global,
    recentRuns: (data.runHistory ?? []).slice(-20).reverse(),
  };
}

// ─── In-memory tracker (per-workflow run) ────────────────────────────────────

/**
 * Lightweight accumulator that travels with a single workflow run.
 * Thread-safe in JS: all mutations happen in synchronous increments
 * between `await` boundaries.
 */
export class UsageTracker {
  private _inputTokens = 0;
  private _outputTokens = 0;
  private _unsplitTokens = 0;
  private _requestCount = 0;
  private _totalDurationMs = 0;

  /**
   * Record a single LLM API call.
   * Call this immediately after `llm.complete()` returns.
   */
  recordCall(response: LLMResponse, durationMs: number): void {
    this._requestCount++;
    this._totalDurationMs += durationMs;

    if (response.inputTokens != null || response.outputTokens != null) {
      this._inputTokens += response.inputTokens ?? 0;
      this._outputTokens += response.outputTokens ?? 0;
    } else if (response.tokensUsed != null) {
      // Provider only gave a combined total (shouldn't happen for cloud, but safe fallback)
      this._unsplitTokens += response.tokensUsed;
    }
  }

  get inputTokens(): number { return this._inputTokens; }
  get outputTokens(): number { return this._outputTokens; }
  get unsplitTokens(): number { return this._unsplitTokens; }
  get requestCount(): number { return this._requestCount; }
  get totalDurationMs(): number { return this._totalDurationMs; }
}

// ─── Persistence ─────────────────────────────────────────────────────────────

function statsFilePath(): string {
  return path.join(getCodeAtlasDir(), 'usage-stats.json');
}

function emptyStats(): UsageStatsData {
  const now = new Date().toISOString();
  return {
    version: 1,
    providers: {},
    global: { workflowRuns: 0, firstUsed: now, lastUsed: now },
    runHistory: [],
  };
}

function emptyProviderStats(): ProviderStats {
  return {
    inputTokens: 0,
    outputTokens: 0,
    unsplitTokens: 0,
    requestCount: 0,
    filesAnalyzed: 0,
    filesFromCache: 0,
    errors: 0,
    totalDurationMs: 0,
    lastUsed: new Date().toISOString(),
  };
}

export function loadUsageStats(): UsageStatsData {
  try {
    const raw = fs.readFileSync(statsFilePath(), 'utf-8');
    const data = JSON.parse(raw) as UsageStatsData;
    if (data.version !== 1) { return emptyStats(); }
    if (!data.runHistory) { data.runHistory = []; }
    return data;
  } catch {
    return emptyStats();
  }
}

function saveUsageStats(data: UsageStatsData): void {
  try {
    const dir = path.dirname(statsFilePath());
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(statsFilePath(), JSON.stringify(data, null, 2), 'utf-8');
  } catch (e) {
    logger.error('Failed to save usage stats', e);
  }
}

/**
 * Merge a completed workflow run's tracker into the persisted stats.
 * Call once at the end of each full/incremental/single-file workflow.
 */
export function persistWorkflowUsage(
  providerName: string,
  tracker: UsageTracker,
  filesAnalyzed: number,
  filesFromCache: number,
  errorCount: number,
): void {
  const data = loadUsageStats();
  const now = new Date().toISOString();

  // Ensure provider entry exists
  if (!data.providers[providerName]) {
    data.providers[providerName] = emptyProviderStats();
  }

  const p = data.providers[providerName];
  p.inputTokens += tracker.inputTokens;
  p.outputTokens += tracker.outputTokens;
  p.unsplitTokens += tracker.unsplitTokens;
  p.requestCount += tracker.requestCount;
  p.filesAnalyzed += filesAnalyzed;
  p.filesFromCache += filesFromCache;
  p.errors += errorCount;
  p.totalDurationMs += tracker.totalDurationMs;
  p.lastUsed = now;

  // Update global
  data.global.workflowRuns++;
  data.global.lastUsed = now;

  // Append run record (keep last 20)
  const record: RunRecord = {
    timestamp: now,
    provider: providerName,
    inputTokens: tracker.inputTokens,
    outputTokens: tracker.outputTokens,
    filesAnalyzed,
    filesFromCache,
    durationMs: tracker.totalDurationMs,
    errors: errorCount,
  };
  data.runHistory.push(record);
  if (data.runHistory.length > 20) { data.runHistory = data.runHistory.slice(-20); }

  saveUsageStats(data);
  logger.info(
    `Usage: ${tracker.requestCount} requests, ` +
    `${tracker.inputTokens} input + ${tracker.outputTokens} output tokens ` +
    `(${providerName})`
  );
}

/**
 * Reset all persisted usage statistics.
 */
export function resetUsageStats(): void {
  saveUsageStats(emptyStats());
  logger.info('Usage statistics reset');
}
