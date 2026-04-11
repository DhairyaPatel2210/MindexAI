import * as path from 'path';
import * as fs from 'fs';
import { getWorkspaceRoot, toRelativePath } from '../../utils/fileUtils';
import { logger } from '../../utils/logger';
import { initTreeSitter, parseFile, ParseResult } from './treeSitterParser';

export interface SymbolEntry {
  name: string;
  kind: string;
  line: number;
  signature?: string;
}

export interface FileNode {
  path: string;            // relative
  absolutePath: string;
  language: string;
  sizeBytes: number;
  symbols: SymbolEntry[];
  imports: string[];       // relative paths of files this file imports
  importedBy: string[];    // relative paths of files that import this file
}

export interface DependencyGraph {
  version: string;
  generatedAt: string;
  workspaceRoot: string;
  stats: {
    totalFiles: number;
    totalSymbols: number;
    totalEdges: number;
  };
  files: Record<string, FileNode>;
}

export async function buildDependencyGraph(sourceFiles: string[]): Promise<DependencyGraph> {
  logger.info(`Building dependency graph for ${sourceFiles.length} files`);

  // Ensure tree-sitter is ready (no-op if already initialised).
  await initTreeSitter();

  const workspaceRoot = getWorkspaceRoot();
  const files: Record<string, FileNode> = {};

  // Initialise file nodes
  for (const absPath of sourceFiles) {
    const relPath = toRelativePath(absPath);
    const stat = fs.statSync(absPath);
    files[relPath] = {
      path: relPath,
      absolutePath: absPath,
      language: getLanguageFromPath(absPath),
      sizeBytes: stat.size,
      symbols: [],
      imports: [],
      importedBy: [],
    };
  }

  // Single parse pass: extract symbols + raw import specifiers for every file.
  const parseResults = new Map<string, ParseResult>();

  for (const [relPath, fileNode] of Object.entries(files)) {
    let content: string;
    try {
      content = fs.readFileSync(fileNode.absolutePath, 'utf-8');
    } catch (e) {
      logger.warn(`Could not read ${relPath}: ${e}`);
      parseResults.set(relPath, { symbols: [], importPaths: [] });
      continue;
    }

    const result = parseFile(content, relPath);
    fileNode.symbols = result.symbols;
    parseResults.set(relPath, result);
  }

  // Build the import graph using the pre-parsed raw specifiers.
  _buildImportGraph(files, parseResults, workspaceRoot);

  const totalSymbols = Object.values(files).reduce((sum, f) => sum + f.symbols.length, 0);
  const totalEdges   = Object.values(files).reduce((sum, f) => sum + f.imports.length, 0);

  logger.info(`Graph built: ${Object.keys(files).length} files, ${totalSymbols} symbols, ${totalEdges} edges`);

  return {
    version:     '1.0',
    generatedAt: new Date().toISOString(),
    workspaceRoot,
    stats: {
      totalFiles:   Object.keys(files).length,
      totalSymbols,
      totalEdges,
    },
    files,
  };
}

// ── Import graph construction ─────────────────────────────────────────────────

function _buildImportGraph(
  files:        Record<string, FileNode>,
  parseResults: Map<string, ParseResult>,
  workspaceRoot: string
): void {
  for (const [relPath, fileNode] of Object.entries(files)) {
    const rawPaths = parseResults.get(relPath)?.importPaths ?? [];
    const resolved = resolveImportPaths(rawPaths, relPath, workspaceRoot, files);
    fileNode.imports = resolved;

    for (const dep of resolved) {
      if (files[dep]) {
        files[dep].importedBy.push(relPath);
      }
    }
  }
}

// ── Import resolution (pure path logic — no file I/O, no parsing) ─────────────

/**
 * Resolves an array of raw import specifiers (as produced by tree-sitter)
 * into relative file paths that exist in the workspace.
 *
 * Rules per language:
 *  - Java   : FQN  (com.example.Foo)  → file-path search
 *  - Python : relative dotted paths (.module, ..pkg.sub)
 *  - Rust   : crate-relative use paths (crate::mod, super::mod, self::mod)
 *  - TS/JS/Go: relative paths starting with "./" or "../"
 *
 * Non-matching specifiers (stdlib, node_modules, absolute Go imports, etc.)
 * are silently ignored — they cannot be resolved to workspace files.
 */
export function resolveImportPaths(
  rawPaths:      string[],
  currentFile:   string,
  workspaceRoot: string,
  allFiles:      Record<string, FileNode>
): string[] {
  const resolved: string[] = [];
  const seen    = new Set<string>();
  const ext     = path.extname(currentFile).toLowerCase();
  const fileDir = path.dirname(path.join(workspaceRoot, currentFile));

  // ── Java ──────────────────────────────────────────────────────────────────
  if (ext === '.java') {
    for (const fqn of rawPaths) {
      if (fqn.endsWith('.*')) { continue; } // wildcard imports unresolvable

      // com.example.Foo → com/example/Foo.java; search workspace files.
      const javaRel = fqn.replace(/\./g, '/') + '.java';
      for (const candidate of Object.keys(allFiles)) {
        const norm = candidate.replace(/\\/g, '/');
        if ((norm.endsWith('/' + javaRel) || norm === javaRel) && !seen.has(norm)) {
          seen.add(norm);
          resolved.push(norm);
          break;
        }
      }
    }
    return resolved;
  }

  // ── Python ────────────────────────────────────────────────────────────────
  if (ext === '.py') {
    for (const raw of rawPaths) {
      if (!raw.startsWith('.')) { continue; } // skip absolute (stdlib/third-party)

      // Count leading dots to determine how many levels up to go.
      const dotMatch = raw.match(/^(\.+)/);
      const dots     = dotMatch ? dotMatch[1].length : 1;
      const rest     = raw.slice(dots).replace(/\./g, '/');

      let base = fileDir;
      // One dot = current package; two dots = parent package; etc.
      for (let i = 1; i < dots; i++) { base = path.dirname(base); }

      const absBase = rest ? path.resolve(base, rest) : base;
      _tryExtensions(absBase, workspaceRoot, allFiles, seen, resolved, ['.py', '/__init__.py']);
    }
    return resolved;
  }

  // ── Rust ──────────────────────────────────────────────────────────────────
  if (ext === '.rs') {
    const currentDir = path.dirname(currentFile);

    for (const raw of rawPaths) {
      if (raw.startsWith('crate::')) {
        // `crate::` is relative to the crate root (usually src/).
        // We don't know the crate root without parsing Cargo.toml, so perform a
        // suffix search across all workspace files — reliable for standard layouts.
        const modPath = raw.slice('crate::'.length).replace(/::/g, '/');
        _rustSuffixSearch(modPath, allFiles, seen, resolved);

      } else if (raw.startsWith('super::')) {
        // `super::` is relative to the parent module directory.
        const modPath = raw.slice('super::'.length).replace(/::/g, '/');
        const abs = path.resolve(workspaceRoot, currentDir, '..', modPath);
        _tryExtensions(abs, workspaceRoot, allFiles, seen, resolved, ['.rs', '/mod.rs']);

      } else if (raw.startsWith('self::')) {
        // `self::` is relative to the current module directory.
        const modPath = raw.slice('self::'.length).replace(/::/g, '/');
        const abs = path.resolve(workspaceRoot, currentDir, modPath);
        _tryExtensions(abs, workspaceRoot, allFiles, seen, resolved, ['.rs', '/mod.rs']);
      }
      // External crates (std::, third-party) — cannot resolve to workspace files.
    }
    return resolved;
  }

  // ── TypeScript / JavaScript / TSX / JSX / Go ──────────────────────────────
  // All these use relative paths starting with "./" or "../".
  const tsJsGoExts = ['.ts', '.tsx', '.js', '.jsx', '.go', '/index.ts', '/index.tsx', '/index.js'];

  for (const raw of rawPaths) {
    if (!raw.startsWith('.')) { continue; } // skip node_modules / stdlib
    const abs = path.resolve(fileDir, raw);
    _tryExtensions(abs, workspaceRoot, allFiles, seen, resolved, tsJsGoExts);
  }

  return resolved;
}

/**
 * Tries `resolved` bare, then `resolved + each extension` and pushes the first
 * match found in `allFiles` into `out`.
 */
function _tryExtensions(
  resolved:     string,
  workspaceRoot: string,
  allFiles:     Record<string, FileNode>,
  seen:         Set<string>,
  out:          string[],
  extensions:   string[]
): void {
  const base       = path.relative(workspaceRoot, resolved);
  const candidates = [base, ...extensions.map(e => base + e)];

  for (const c of candidates) {
    const norm = c.replace(/\\/g, '/');
    if (allFiles[norm] && !seen.has(norm)) {
      seen.add(norm);
      out.push(norm);
      return;
    }
  }
}

/**
 * For `crate::` Rust paths: searches all workspace files whose path ends with
 * `modPath.rs` or `modPath/mod.rs`. This sidesteps needing to know the exact
 * crate root (which varies by project layout).
 */
function _rustSuffixSearch(
  modPath: string,
  allFiles: Record<string, FileNode>,
  seen:    Set<string>,
  out:     string[]
): void {
  const suffixes = [modPath + '.rs', modPath + '/mod.rs'];
  for (const candidate of Object.keys(allFiles)) {
    const norm = candidate.replace(/\\/g, '/');
    for (const suffix of suffixes) {
      if ((norm === suffix || norm.endsWith('/' + suffix)) && !seen.has(norm)) {
        seen.add(norm);
        out.push(norm);
        return;
      }
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getLanguageFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript',
    '.py': 'python', '.go': 'go', '.rs': 'rust',
    '.java': 'java',
    '.vue': 'vue',
  };
  return map[ext] || 'unknown';
}
