import * as path from 'path';
import * as fs from 'fs';
import { FileContext, ChunkCacheEntry } from '../analyzer/fileAnalyzer';
import {
  getSharedCacheDir,
  getBranchStatePath,
  ensureDir,
  readJson,
  writeJson,
} from '../../utils/fileUtils';
import { logger } from '../../utils/logger';

// ─── Shared content-hash cache ──────────────────────────────────────────────
// Stored under .codeatlas/cache/ — shared across ALL branches.
// Keyed by content hash so identical file content is never re-analyzed.

interface CacheEntry {
  contentHash: string;
  fileContext: FileContext;
  cachedAt: string;
  /** Per-chunk hashes for chunk-level delta on next change. Optional for backward compat. */
  chunkEntries?: ChunkCacheEntry[];
}

function getCacheEntryPath(contentHash: string): string {
  // Use first 2 chars as subdirectory to avoid huge flat directories
  const subdir = contentHash.substring(0, 2);
  return path.join(getSharedCacheDir(), subdir, `${contentHash}.json`);
}

/**
 * Store a FileContext in the shared cache, keyed by content hash.
 * Optionally includes chunk-level entries for delta analysis on next change.
 */
export function cacheFileContext(
  contentHash: string,
  ctx: FileContext,
  chunkEntries?: ChunkCacheEntry[],
): void {
  if (!contentHash) {
    return;
  }
  const entryPath = getCacheEntryPath(contentHash);
  const entry: CacheEntry = {
    contentHash,
    fileContext: ctx,
    cachedAt: new Date().toISOString(),
    chunkEntries,
  };
  writeJson(entryPath, entry);
}

/**
 * Retrieve a cached FileContext by content hash from the shared cache.
 * Returns null if not cached.
 */
export function getCachedFileContext(contentHash: string): FileContext | null {
  if (!contentHash) {
    return null;
  }
  const entryPath = getCacheEntryPath(contentHash);
  const entry = readJson<CacheEntry>(entryPath);
  return entry?.fileContext ?? null;
}

/**
 * Check if a cached context exists for a given content hash.
 */
export function hasCachedContext(contentHash: string): boolean {
  if (!contentHash) {
    return false;
  }
  return fs.existsSync(getCacheEntryPath(contentHash));
}

/**
 * Retrieve chunk-level cache entries from a previous file version.
 * Returns null if the hash has no cached data or no chunk entries (old format).
 */
export function getCachedChunkEntries(contentHash: string): ChunkCacheEntry[] | null {
  if (!contentHash) {
    return null;
  }
  const entryPath = getCacheEntryPath(contentHash);
  const entry = readJson<CacheEntry>(entryPath);
  return entry?.chunkEntries ?? null;
}

// ─── Per-branch state ────────────────────────────────────────────────────────
// Stored under .codeatlas/branches/{name}/branch-state.json
// Each branch tracks its OWN headCommit so incremental diffs are correct.

export interface BranchState {
  version: string;
  /** The branch name this state belongs to */
  branch: string;
  /** HEAD commit when this branch was last indexed */
  headCommit: string;
  /** ISO timestamp of last index run */
  lastIndexedAt: string;
  /** Per-file mapping: relative path → content hash that was last indexed */
  fileHashes: Record<string, string>;
}

/**
 * Load the branch state for a specific branch.
 * Returns null if the branch has never been indexed.
 */
export function loadBranchState(branch: string): BranchState | null {
  const statePath = getBranchStatePath(branch);
  const existing = readJson<BranchState>(statePath);
  if (existing?.version === '1.0' && existing.branch === branch) {
    return existing;
  }
  return null;
}

/**
 * Save the branch state for the active branch.
 */
export function saveBranchState(state: BranchState): void {
  const statePath = getBranchStatePath(state.branch);
  writeJson(statePath, state);
}

/**
 * Update the branch state after a workflow run.
 * Merges new file hashes and updates the headCommit.
 */
export function updateBranchState(
  branch: string,
  headCommit: string,
  fileHashes: Record<string, string>,
): void {
  const existing = loadBranchState(branch);
  const state: BranchState = existing ?? {
    version: '1.0',
    branch,
    headCommit: '',
    lastIndexedAt: '',
    fileHashes: {},
  };

  // Merge new hashes
  for (const [filePath, hash] of Object.entries(fileHashes)) {
    state.fileHashes[filePath] = hash;
  }

  state.headCommit = headCommit;
  state.lastIndexedAt = new Date().toISOString();
  saveBranchState(state);
}

/**
 * Remove deleted files from the branch state.
 */
export function removeFromBranchState(
  branch: string,
  filePaths: string[],
): void {
  const state = loadBranchState(branch);
  if (!state) {
    return;
  }
  for (const p of filePaths) {
    delete state.fileHashes[p];
  }
  saveBranchState(state);
}

/**
 * Check if a branch has been previously indexed (has a branch-state.json).
 */
export function hasBranchIndex(branch: string): boolean {
  return fs.existsSync(getBranchStatePath(branch));
}

// ─── Batch operations ────────────────────────────────────────────────────────

/**
 * Batch-cache multiple FileContexts into the shared cache and update branch state.
 * Supports optional chunk entries for chunk-level delta caching.
 */
export function batchCacheContexts(
  contexts: Array<{ contentHash: string; ctx: FileContext; chunkEntries?: ChunkCacheEntry[] }>,
  branch: string,
  headCommit: string,
): void {
  ensureDir(getSharedCacheDir());

  const fileHashes: Record<string, string> = {};

  for (const { contentHash, ctx, chunkEntries } of contexts) {
    cacheFileContext(contentHash, ctx, chunkEntries);
    fileHashes[ctx.relativePath] = contentHash;
  }

  updateBranchState(branch, headCommit, fileHashes);
  logger.info(`Cached ${contexts.length} file contexts`);
}

/**
 * Given a set of files with their current content hashes, determine which
 * files can be restored from the shared cache and which need re-analysis.
 */
export function partitionByCacheHit(
  files: Array<{ relativePath: string; contentHash: string }>,
): {
  cached: Array<{ relativePath: string; ctx: FileContext }>;
  uncached: string[];
} {
  const cached: Array<{ relativePath: string; ctx: FileContext }> = [];
  const uncached: string[] = [];

  for (const { relativePath, contentHash } of files) {
    const ctx = getCachedFileContext(contentHash);
    if (ctx) {
      cached.push({ relativePath, ctx });
    } else {
      uncached.push(relativePath);
    }
  }

  return { cached, uncached };
}
