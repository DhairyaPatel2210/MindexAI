import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';

export const MINDEXAI_DIR = '.mindexai';
export const BRANCHES_DIR = 'branches';
export const CACHE_DIR = 'cache';
export const CURRENT_DIR = 'current';
export const CONTEXT_DIR = 'context';
export const GRAPH_FILE = 'graph.json';
export const INDEX_FILE = 'index.json';
export const CONTEXT_OVERVIEW_FILE = 'CONTEXT.md';
export const BRANCH_STATE_FILE = 'branch-state.json';

/** Sentinel value returned/thrown in contexts where no workspace root is available. */
export const WORKSPACE_ROOT_NOT_SET = '__WORKSPACE_ROOT_NOT_SET__';

export function getWorkspaceRoot(): string {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    throw new Error('No workspace folder open');
  }
  return folders[0].uri.fsPath;
}

export function getMindexAIDir(): string {
  return path.join(getWorkspaceRoot(), MINDEXAI_DIR);
}

/**
 * Get the .mindexai directory for a given workspace root.
 * This variant does NOT depend on vscode.workspace.workspaceFolders,
 * making it safe to use in core modules and tests.
 */
export function getMindexAIDirForRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, MINDEXAI_DIR);
}

/**
 * Sanitize a git branch name for use as a filesystem directory name.
 * Replaces `/` with `--` so `feature/foo` becomes `feature--foo`.
 */
export function sanitizeBranchName(branch: string): string {
  return branch.replace(/\//g, '--');
}

/**
 * Get the per-branch directory under `.mindexai/branches/{sanitized-branch}/`.
 */
export function getBranchDir(branch: string): string {
  return path.join(getMindexAIDir(), BRANCHES_DIR, sanitizeBranchName(branch));
}

/**
 * Get the shared content-hash cache directory (`.mindexai/cache/`).
 */
export function getSharedCacheDir(): string {
  return path.join(getMindexAIDir(), CACHE_DIR);
}

// ─── Active branch tracking ──────────────────────────────────────────────────

let _activeBranch: string | undefined;

/**
 * Set the active branch. All branch-aware path helpers will use this.
 * Must be called before any branch-aware path function.
 */
export function setActiveBranch(branch: string): void {
  _activeBranch = branch;
}

/**
 * Get the currently active branch name.
 */
export function getActiveBranch(): string {
  if (!_activeBranch) {
    throw new Error('Active branch not set. Call setActiveBranch() first.');
  }
  return _activeBranch;
}

/**
 * Get the directory for the currently active branch.
 */
function getActiveBranchDir(): string {
  return getBranchDir(getActiveBranch());
}

// ─── Branch-aware path helpers ───────────────────────────────────────────────

export function getContextDir(): string {
  return path.join(getActiveBranchDir(), CONTEXT_DIR);
}

export function getGraphFilePath(): string {
  return path.join(getActiveBranchDir(), GRAPH_FILE);
}

export function getIndexFilePath(): string {
  return path.join(getActiveBranchDir(), INDEX_FILE);
}

export function getContextOverviewPath(): string {
  return path.join(getActiveBranchDir(), CONTEXT_OVERVIEW_FILE);
}

export function getBranchStatePath(branch?: string): string {
  const dir = branch ? getBranchDir(branch) : getActiveBranchDir();
  return path.join(dir, BRANCH_STATE_FILE);
}

export function getContextFilePath(relativeFilePath: string): string {
  // e.g. src/foo/bar.ts -> .mindexai/branches/main/context/src/foo/bar.ts.md
  return path.join(getContextDir(), relativeFilePath + '.md');
}

/**
 * Get the stable `.mindexai/current/` directory path.
 * This always points to the latest indexed branch's output — use this path
 * when giving the index to an AI code editor.
 */
export function getCurrentIndexDir(): string {
  return path.join(getMindexAIDir(), CURRENT_DIR);
}

/**
 * Copy the active branch's output files to `.mindexai/current/` so there is
 * always a stable, predictable path to the latest index.
 * Copies: index.json, CONTEXT.md, graph.json, and context/ directory.
 */
export function publishCurrentIndex(): void {
  const branchDir = getActiveBranchDir();
  const currentDir = getCurrentIndexDir();

  // Remove old current dir and recreate
  try { fs.rmSync(currentDir, { recursive: true, force: true }); } catch { /* ok */ }
  ensureDir(currentDir);

  // Copy top-level files
  for (const file of [INDEX_FILE, CONTEXT_OVERVIEW_FILE, GRAPH_FILE]) {
    const src = path.join(branchDir, file);
    const dst = path.join(currentDir, file);
    try { fs.copyFileSync(src, dst); } catch { /* file may not exist yet */ }
  }

  // Copy context/ directory recursively
  const srcContext = path.join(branchDir, CONTEXT_DIR);
  const dstContext = path.join(currentDir, CONTEXT_DIR);
  if (fs.existsSync(srcContext)) {
    copyDirRecursive(srcContext, dstContext);
  }
}

function copyDirRecursive(src: string, dst: string): void {
  ensureDir(dst);
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const dstPath = path.join(dst, entry.name);
    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, dstPath);
    } else {
      fs.copyFileSync(srcPath, dstPath);
    }
  }
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function ensureMindexAIDirs(): void {
  ensureDir(getMindexAIDir());
  ensureDir(getSharedCacheDir());
  ensureDir(getActiveBranchDir());
  ensureDir(getContextDir());
}

export function writeJson(filePath: string, data: unknown): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

export function readJson<T>(filePath: string): T | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

export function writeText(filePath: string, content: string): void {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, 'utf-8');
}

export function readText(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}

export function fileExists(filePath: string): boolean {
  return fs.existsSync(filePath);
}

export function getFileSizeKB(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size / 1024;
  } catch {
    return 0;
  }
}

export function toRelativePath(absolutePath: string): string {
  const root = getWorkspaceRoot();
  return path.relative(root, absolutePath);
}

export function toAbsolutePath(relativePath: string): string {
  return path.join(getWorkspaceRoot(), relativePath);
}

export const INCLUDE_FILE = '.include.mindexai';

/**
 * Check if the workspace root is inside a git repository.
 */
export function isGitRepo(): boolean {
  try {
    cp.execSync('git rev-parse --is-inside-work-tree', {
      cwd: getWorkspaceRoot(),
      stdio: 'pipe',
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns the path to the .include.mindexai file.
 */
export function getIncludeFilePath(): string {
  return path.join(getWorkspaceRoot(), INCLUDE_FILE);
}

/**
 * Check if a .include.mindexai file exists in the workspace root.
 */
export function hasIncludeFile(): boolean {
  return fs.existsSync(getIncludeFilePath());
}

/**
 * Create a default .include.mindexai file in the workspace root.
 */
export function createIncludeFile(): void {
  const filePath = getIncludeFilePath();
  const content = [
    '# Directories to include (scanned recursively)',
    'src',
    '',
    '# Individual files',
    '# main.ts',
    '',
    '# Lines starting with # are comments',
    '',
  ].join('\n');
  writeText(filePath, content);
}

/**
 * Parse the .include.mindexai file. Each non-empty, non-comment line is
 * treated as a file or directory path (relative to workspace root).
 * Returns the list of resolved entries.
 */
function parseIncludeFile(): string[] {
  const filePath = getIncludeFilePath();
  if (!fs.existsSync(filePath)) { return []; }
  const content = fs.readFileSync(filePath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && !line.startsWith('#'));
}

/**
 * Collect source files using the `.include.mindexai` file.
 * Only files/directories listed in that file are considered.
 * Each entry is either a file path or a directory — directories are scanned
 * recursively for files matching includedExtensions.
 */
export async function collectSourceFiles(): Promise<string[]> {
  const config = vscode.workspace.getConfiguration('mindexai');
  const includedExtensions = config.get<string[]>('includedExtensions', []);
  const excludePatterns = config.get<string[]>('excludePatterns', []);
  const extSet = new Set(includedExtensions.map(e => e.toLowerCase()));

  if (!hasIncludeFile()) {
    // Fall back to VS Code glob-based collection if no .include.mindexai file
    return collectSourceFilesViaGlob(includedExtensions, excludePatterns);
  }

  return collectSourceFilesViaInclude(extSet, excludePatterns);
}

/**
 * Collect files based on entries in .include.mindexai.
 * Entries can be individual files or directories.
 * Directories are scanned recursively for matching extensions.
 */
function collectSourceFilesViaInclude(
  extSet: Set<string>,
  excludePatterns: string[]
): string[] {
  const root = getWorkspaceRoot();
  const entries = parseIncludeFile();
  const result: string[] = [];

  const minimatchPatterns = excludePatterns.map(p =>
    p.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')
  );

  function isExcluded(relPath: string): boolean {
    for (const pat of minimatchPatterns) {
      if (new RegExp(pat).test(relPath)) { return true; }
    }
    return false;
  }

  function scanDir(dirPath: string): void {
    let items: fs.Dirent[];
    try {
      items = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch { return; }

    for (const item of items) {
      const fullPath = path.join(dirPath, item.name);
      const relPath = path.relative(root, fullPath);

      if (relPath.startsWith(MINDEXAI_DIR)) { continue; }
      if (isExcluded(relPath)) { continue; }

      if (item.isDirectory()) {
        scanDir(fullPath);
      } else if (item.isFile()) {
        const ext = path.extname(item.name).toLowerCase();
        if (extSet.has(ext)) {
          result.push(fullPath);
        }
      }
    }
  }

  for (const entry of entries) {
    const fullPath = path.join(root, entry);
    if (!fs.existsSync(fullPath)) { continue; }

    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else if (stat.isFile()) {
      const relPath = path.relative(root, fullPath);
      if (relPath.startsWith(MINDEXAI_DIR)) { continue; }
      if (isExcluded(relPath)) { continue; }
      const ext = path.extname(fullPath).toLowerCase();
      if (extSet.has(ext)) {
        result.push(fullPath);
      }
    }
  }

  return result.sort();
}

/**
 * Original VS Code glob-based file collection (fallback when no .include.mindexai).
 */
async function collectSourceFilesViaGlob(
  includedExtensions: string[],
  excludePatterns: string[]
): Promise<string[]> {
  const extensionPattern = `**/*{${includedExtensions.join(',')}}`;
  const uris = await vscode.workspace.findFiles(
    extensionPattern,
    `{${excludePatterns.join(',')}}`
  );

  return uris
    .map(uri => uri.fsPath)
    .filter(p => {
      const rel = toRelativePath(p);
      return !rel.startsWith(MINDEXAI_DIR);
    })
    .sort();
}

export function chunkText(text: string, maxChars: number): string[] {
  if (text.length <= maxChars) {
    return [text];
  }

  const chunks: string[] = [];
  const lines = text.split('\n');
  let current = '';

  for (const line of lines) {
    if (current.length + line.length + 1 > maxChars && current.length > 0) {
      chunks.push(current);
      current = line;
    } else {
      current = current ? current + '\n' + line : line;
    }
  }

  if (current) {
    chunks.push(current);
  }

  return chunks;
}

export function detectLanguage(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const languageMap: Record<string, string> = {
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript (React)',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript (React)',
    '.py': 'Python',
    '.go': 'Go',
    '.rs': 'Rust',
    '.java': 'Java',
    '.cs': 'C#',
    '.cpp': 'C++',
    '.c': 'C',
    '.h': 'C/C++ Header',
    '.hpp': 'C++ Header',
    '.rb': 'Ruby',
    '.php': 'PHP',
    '.swift': 'Swift',
    '.kt': 'Kotlin',
    '.scala': 'Scala',
    '.vue': 'Vue',
    '.svelte': 'Svelte',
  };
  return languageMap[ext] || 'Unknown';
}

/**
 * Returns the path to the .gitignore file in the workspace root.
 */
export function getGitignorePath(): string {
  return path.join(getWorkspaceRoot(), '.gitignore');
}

export type GitignoreResult =
  | { status: 'added' }
  | { status: 'already-present' }
  | { status: 'no-gitignore'; isGitRepo: boolean };

const MINDEXAI_GITIGNORE_PATTERNS = ['.mindexai/'];

/**
 * Add .mindexai/ to the workspace .gitignore.
 * Returns the result so the caller can surface appropriate feedback.
 */
export function addMindexAIToGitignore(): GitignoreResult {
  const gitignorePath = getGitignorePath();

  if (!fs.existsSync(gitignorePath)) {
    return { status: 'no-gitignore', isGitRepo: isGitRepo() };
  }

  let content = fs.readFileSync(gitignorePath, 'utf-8');
  const patternsToAdd = MINDEXAI_GITIGNORE_PATTERNS.filter(
    p => !content.includes(p) && !content.includes('.mindexai/**')
  );

  if (patternsToAdd.length === 0) {
    return { status: 'already-present' };
  }

  if (!content.endsWith('\n')) { content += '\n'; }
  content += '\n# MindexAI\n' + patternsToAdd.join('\n') + '\n';
  writeText(gitignorePath, content);
  return { status: 'added' };
}

/**
 * Create a new .gitignore in the workspace root containing the MindexAI patterns.
 */
export function createGitignoreWithMindexAI(): void {
  const gitignorePath = getGitignorePath();
  const content = '# MindexAI\n' + MINDEXAI_GITIGNORE_PATTERNS.join('\n') + '\n';
  writeText(gitignorePath, content);
}
