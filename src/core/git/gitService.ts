import * as cp from 'child_process';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { getWorkspaceRoot } from '../../utils/fileUtils';
import { logger } from '../../utils/logger';

// ─── Git helpers ──────────────────────────────────────────────────────────────

function git(args: string, cwd?: string): string {
  return cp
    .execSync(`git ${args}`, {
      cwd: cwd ?? getWorkspaceRoot(),
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15000,
    })
    .trim();
}

function gitLines(args: string, cwd?: string): string[] {
  const out = git(args, cwd);
  return out
    ? out
        .split('\n')
        .map(l => l.trim())
        .filter(Boolean)
    : [];
}

// ─── Branch operations ────────────────────────────────────────────────────────

/** Returns the current branch name, or HEAD commit hash if detached, or "default" for empty repos. */
export function getCurrentBranch(): string {
  try {
    return git('rev-parse --abbrev-ref HEAD');
  } catch {
    try {
      return git('rev-parse --short HEAD');
    } catch {
      // Empty repo with no commits — fall back to "default"
      return 'default';
    }
  }
}

/** Returns the commit hash that HEAD points to. */
export function getHeadCommit(): string {
  try {
    return git('rev-parse HEAD');
  } catch {
    return '';
  }
}

// ─── Diff operations ──────────────────────────────────────────────────────────

/**
 * Get files that differ between two refs (branches/commits).
 * Returns relative paths of files that were added, modified, or deleted.
 */
export function getChangedFilesBetweenRefs(
  fromRef: string,
  toRef: string,
): { added: string[]; modified: string[]; deleted: string[] } {
  const added: string[] = [];
  const modified: string[] = [];
  const deleted: string[] = [];

  try {
    const lines = gitLines(`diff --name-status ${fromRef}...${toRef}`);
    for (const line of lines) {
      const [status, ...fileParts] = line.split('\t');
      const filePath = fileParts.join('\t');
      if (!filePath) {
        continue;
      }

      switch (status?.[0]) {
        case 'A':
          added.push(filePath);
          break;
        case 'D':
          deleted.push(filePath);
          break;
        case 'M':
        case 'R':
        case 'C':
        default:
          modified.push(filePath);
          break;
      }
    }
  } catch (e) {
    logger.warn(`Could not diff ${fromRef}...${toRef}: ${e}`);
  }

  return { added, modified, deleted };
}

/**
 * Get uncommitted changes (both staged and unstaged) relative to HEAD.
 * Returns relative paths.
 */
export function getUncommittedChanges(): {
  modified: string[];
  deleted: string[];
  untracked: string[];
} {
  const modified: string[] = [];
  const deleted: string[] = [];
  const untracked: string[] = [];

  try {
    // Staged + unstaged tracked changes
    const lines = gitLines('diff --name-status HEAD');
    for (const line of lines) {
      const [status, ...fileParts] = line.split('\t');
      const filePath = fileParts.join('\t');
      if (!filePath) {
        continue;
      }

      if (status?.[0] === 'D') {
        deleted.push(filePath);
      } else {
        modified.push(filePath);
      }
    }

    // Also check staged changes that haven't been committed
    const stagedLines = gitLines('diff --name-status --cached');
    for (const line of stagedLines) {
      const [status, ...fileParts] = line.split('\t');
      const filePath = fileParts.join('\t');
      if (!filePath) {
        continue;
      }

      if (status?.[0] === 'D') {
        if (!deleted.includes(filePath)) {
          deleted.push(filePath);
        }
      } else {
        if (!modified.includes(filePath)) {
          modified.push(filePath);
        }
      }
    }

    // Untracked files (not ignored)
    const untrackedLines = gitLines('ls-files -o --exclude-standard');
    untracked.push(...untrackedLines);
  } catch (e) {
    logger.warn(`Could not get uncommitted changes: ${e}`);
  }

  return { modified, deleted, untracked };
}

/**
 * Get ALL files that have changed relative to the last indexed state.
 * Combines branch diff + uncommitted changes into a single set.
 */
export function getAllChangedFiles(lastIndexedRef?: string): {
  needsAnalysis: string[];
  deleted: string[];
} {
  const needsAnalysis = new Set<string>();
  const deleted = new Set<string>();

  // 1. If we have a previous ref, get committed changes since then
  if (lastIndexedRef) {
    try {
      const headCommit = getHeadCommit();
      if (headCommit && headCommit !== lastIndexedRef) {
        const committed = getChangedFilesBetweenRefs(lastIndexedRef, headCommit);
        for (const f of committed.added) {
          needsAnalysis.add(f);
        }
        for (const f of committed.modified) {
          needsAnalysis.add(f);
        }
        for (const f of committed.deleted) {
          deleted.add(f);
        }
      }
    } catch {
      // If ref is invalid (e.g., force push), treat everything as changed
      logger.warn(
        `Previous ref ${lastIndexedRef} is unreachable — full re-index needed`,
      );
      return { needsAnalysis: [], deleted: [] };
    }
  }

  // 2. Always check uncommitted changes
  const uncommitted = getUncommittedChanges();
  for (const f of uncommitted.modified) {
    needsAnalysis.add(f);
    deleted.delete(f);
  }
  for (const f of uncommitted.untracked) {
    needsAnalysis.add(f);
  }
  for (const f of uncommitted.deleted) {
    deleted.add(f);
    needsAnalysis.delete(f);
  }

  return {
    needsAnalysis: Array.from(needsAnalysis),
    deleted: Array.from(deleted),
  };
}

// ─── Content hashing ──────────────────────────────────────────────────────────

/**
 * Compute a content hash for a file using the same algorithm as git (SHA-1 of blob).
 * This means if the file content matches a previous git state, the hash will be the same.
 * Uses git hash-object if in a git repo, falls back to SHA-256 of content.
 */
export function getFileContentHash(absolutePath: string): string {
  try {
    // git hash-object works on any file, even untracked ones
    return git(`hash-object "${absolutePath}"`);
  } catch {
    // Fallback: compute our own hash
    try {
      const content = fs.readFileSync(absolutePath);
      return crypto.createHash('sha256').update(content).digest('hex');
    } catch {
      return '';
    }
  }
}

/**
 * Get the git blob hash for a file at a specific ref (commit/branch).
 * Returns empty string if the file didn't exist at that ref.
 */
export function getFileHashAtRef(relPath: string, ref: string): string {
  try {
    return git(`rev-parse ${ref}:"${relPath}"`);
  } catch {
    return '';
  }
}

// ─── State snapshot ───────────────────────────────────────────────────────────

export interface GitState {
  branch: string;
  headCommit: string;
  timestamp: string;
}

export function captureGitState(): GitState {
  return {
    branch: getCurrentBranch(),
    headCommit: getHeadCommit(),
    timestamp: new Date().toISOString(),
  };
}

// Re-export path for compatibility
export { path };
