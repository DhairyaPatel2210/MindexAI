import * as cp from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { getWorkspaceRoot, toRelativePath } from '../../utils/fileUtils';
import { logger } from '../../utils/logger';

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

  const workspaceRoot = getWorkspaceRoot();
  const files: Record<string, FileNode> = {};

  // Initialize all file nodes
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

  // Extract symbols via ctags if available, otherwise use regex fallback
  const ctagsAvailable = await isCtagsAvailable();
  if (ctagsAvailable) {
    logger.info('ctags detected — using it for symbol extraction');
    await extractSymbolsWithCtags(workspaceRoot, files);
  } else {
    logger.info('ctags not found — using built-in regex parser for symbol extraction');
    extractSymbolsWithRegex(files);
  }

  // Build import graph by parsing import statements
  buildImportGraph(files, workspaceRoot);

  const totalSymbols = Object.values(files).reduce((sum, f) => sum + f.symbols.length, 0);
  const totalEdges = Object.values(files).reduce((sum, f) => sum + f.imports.length, 0);

  logger.info(`Graph built: ${Object.keys(files).length} files, ${totalSymbols} symbols, ${totalEdges} edges`);

  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    workspaceRoot,
    stats: {
      totalFiles: Object.keys(files).length,
      totalSymbols,
      totalEdges,
    },
    files,
  };
}

async function isCtagsAvailable(): Promise<boolean> {
  return new Promise(resolve => {
    cp.exec('ctags --version', { timeout: 3000 }, (err) => {
      resolve(!err);
    });
  });
}

async function extractSymbolsWithCtags(
  workspaceRoot: string,
  files: Record<string, FileNode>
): Promise<void> {
  return new Promise(resolve => {
    // Run ctags with fields for kind, line number, and signature
    const args = [
      '--output-format=json',
      '--fields=+nkzS',
      '--recurse=yes',
      '--exclude=node_modules',
      '--exclude=.git',
      '--exclude=.codeatlas',
      '--exclude=dist',
      '--exclude=build',
      '--exclude=out',
      '.',
    ];

    const proc = cp.spawn('ctags', args, {
      cwd: workspaceRoot,
      timeout: 30000,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      if (code !== 0 && stderr) {
        logger.warn(`ctags exited with code ${code}: ${stderr}`);
      }

      for (const line of stdout.split('\n')) {
        if (!line.trim()) { continue; }
        try {
          const tag = JSON.parse(line) as {
            name: string;
            kind: string;
            line?: number;
            signature?: string;
            path?: string;
          };

          const relPath = tag.path ? tag.path.replace(/^\.\//, '') : undefined;
          if (relPath && files[relPath]) {
            files[relPath].symbols.push({
              name: tag.name,
              kind: normalizeKind(tag.kind),
              line: tag.line || 0,
              signature: tag.signature,
            });
          }
        } catch {
          // non-JSON line from ctags, skip
        }
      }

      resolve();
    });

    proc.on('error', () => {
      logger.warn('ctags spawn failed, falling back to regex');
      extractSymbolsWithRegex(files);
      resolve();
    });
  });
}

function extractSymbolsWithRegex(files: Record<string, FileNode>): void {
  for (const [relPath, fileNode] of Object.entries(files)) {
    try {
      const content = fs.readFileSync(fileNode.absolutePath, 'utf-8');
      fileNode.symbols = extractSymbolsFromContent(content, relPath);
    } catch (e) {
      logger.warn(`Could not read ${relPath}: ${e}`);
    }
  }
}

export function extractSymbolsFromContent(content: string, filePath: string): SymbolEntry[] {
  const symbols: SymbolEntry[] = [];
  const lines = content.split('\n');
  const ext = path.extname(filePath).toLowerCase();

  const patterns: Array<{ kind: string; regex: RegExp }> = [
    // TypeScript/JavaScript
    { kind: 'function',  regex: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)\s*[(<]/ },
    { kind: 'class',     regex: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/ },
    { kind: 'interface', regex: /^(?:export\s+)?interface\s+(\w+)/ },
    { kind: 'type',      regex: /^(?:export\s+)?type\s+(\w+)\s*=/ },
    { kind: 'enum',      regex: /^(?:export\s+)?enum\s+(\w+)/ },
    { kind: 'const',     regex: /^(?:export\s+)?const\s+(\w+)\s*[:=]/ },
    { kind: 'method',    regex: /^\s+(?:async\s+)?(\w+)\s*\([^)]*\)\s*(?::\s*\S+\s*)?\{/ },
    // Python
    { kind: 'function',  regex: /^def\s+(\w+)\s*\(/ },
    { kind: 'class',     regex: /^class\s+(\w+)[\s:(]/ },
    { kind: 'method',    regex: /^\s+def\s+(\w+)\s*\(/ },
    // Go
    { kind: 'function',  regex: /^func\s+(\w+)\s*\(/ },
    { kind: 'method',    regex: /^func\s+\(\w+\s+\*?\w+\)\s+(\w+)\s*\(/ },
    { kind: 'struct',    regex: /^type\s+(\w+)\s+struct/ },
    { kind: 'interface', regex: /^type\s+(\w+)\s+interface/ },
    // Rust
    { kind: 'function',  regex: /^(?:pub\s+)?(?:async\s+)?fn\s+(\w+)\s*[(<]/ },
    { kind: 'struct',    regex: /^(?:pub\s+)?struct\s+(\w+)/ },
    { kind: 'trait',     regex: /^(?:pub\s+)?trait\s+(\w+)/ },
    { kind: 'enum',      regex: /^(?:pub\s+)?enum\s+(\w+)/ },
    // Java
    { kind: 'class',      regex: /^(?:public\s+)?(?:abstract\s+)?(?:final\s+)?class\s+(\w+)/ },
    { kind: 'interface',  regex: /^(?:public\s+)?interface\s+(\w+)/ },
    { kind: 'enum',       regex: /^(?:public\s+)?enum\s+(\w+)/ },
    { kind: 'annotation', regex: /^(?:public\s+)?@interface\s+(\w+)/ },
    { kind: 'method',     regex: /^\s+(?:public|private|protected|static|final|synchronized|native|abstract|default)[\s\w<>\[\]]+\s+(\w+)\s*\([^)]*\)\s*(?:throws\s+\S+\s*)?[{;]/ },
  ];

  // Select language-specific patterns based on file extension to avoid
  // cross-language false positives
  const isJava = ext === '.java';
  const isPython = ext === '.py';
  const isGoLang = ext === '.go';
  const isRust = ext === '.rs';
  const isTsJs = ['.ts', '.tsx', '.js', '.jsx'].includes(ext);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const { kind, regex } of patterns) {
      // Skip patterns that don't apply to this language
      if (isJava) {
        // Only use Java patterns (class/interface/enum/annotation/method) and skip TS/JS/Python/Go/Rust patterns
        const javaKinds = ['class', 'interface', 'enum', 'annotation', 'method'];
        // Java method regex uses a special marker (has "synchronized|native|abstract|default")
        const isJavaPattern = (kind === 'method' && regex.source.includes('synchronized')) ||
          (kind !== 'method' && javaKinds.includes(kind) && regex.source.includes('public'));
        if (!isJavaPattern) { continue; }
      } else if (isPython) {
        // Only use Python-style patterns (def/class at start of line, indented def)
        const isPythonPattern = regex.source.startsWith('^def') ||
          regex.source.startsWith('^class') ||
          regex.source.startsWith('^\\s+def');
        if (!isPythonPattern) { continue; }
      } else if (isGoLang) {
        const isGoPattern = regex.source.startsWith('^func') ||
          regex.source.startsWith('^type');
        if (!isGoPattern) { continue; }
      } else if (isRust) {
        const isRustPattern = regex.source.includes('(?:pub');
        if (!isRustPattern) { continue; }
      } else if (isTsJs) {
        // Skip Java, Python, Go, Rust patterns for TS/JS files
        const isNonTsJsPattern =
          regex.source.startsWith('^def') ||
          regex.source.startsWith('^class\\s') ||
          regex.source.startsWith('^func') ||
          regex.source.startsWith('^type') ||
          (regex.source.includes('(?:pub') && !regex.source.includes('export')) ||
          regex.source.includes('synchronized');
        if (isNonTsJsPattern) { continue; }
      }

      const match = line.match(regex);
      if (match) {
        symbols.push({
          name: match[1],
          kind,
          line: i + 1,
          signature: line.trim().substring(0, 120),
        });
        break;
      }
    }
  }

  return symbols;
}

function buildImportGraph(files: Record<string, FileNode>, workspaceRoot: string): void {
  for (const [relPath, fileNode] of Object.entries(files)) {
    try {
      const content = fs.readFileSync(fileNode.absolutePath, 'utf-8');
      const importedPaths = extractImports(content, relPath, workspaceRoot, files);
      fileNode.imports = importedPaths;

      for (const dep of importedPaths) {
        if (files[dep]) {
          files[dep].importedBy.push(relPath);
        }
      }
    } catch (e) {
      logger.warn(`Could not parse imports for ${relPath}: ${e}`);
    }
  }
}

export function extractImports(
  content: string,
  currentFile: string,
  workspaceRoot: string,
  allFiles: Record<string, FileNode>
): string[] {
  const imports: string[] = [];
  const currentDir = path.dirname(path.join(workspaceRoot, currentFile));
  const ext = path.extname(currentFile).toLowerCase();
  const seen = new Set<string>();

  // ── Java import handling ──────────────────────────────────────────────────
  if (ext === '.java') {
    const javaImportPattern = /^import\s+(?:static\s+)?([a-zA-Z_$][\w$.]+);/gm;
    let match;
    javaImportPattern.lastIndex = 0;
    while ((match = javaImportPattern.exec(content)) !== null) {
      const fqn = match[1];
      // Wildcard imports (com.example.*) can't be resolved to a specific file
      if (fqn.endsWith('.*')) { continue; }

      // Convert fully-qualified name to a file path
      // e.g. com.example.Foo -> com/example/Foo.java
      const parts = fqn.split('.');
      const javaRelPath = parts.join('/') + '.java';

      // Look for a file in allFiles that ends with this path
      // e.g. src/main/java/com/example/Foo.java
      for (const candidateRelPath of Object.keys(allFiles)) {
        const normalized = candidateRelPath.replace(/\\/g, '/');
        if (normalized.endsWith(javaRelPath) || normalized.endsWith('/' + javaRelPath)) {
          if (!seen.has(normalized)) {
            seen.add(normalized);
            imports.push(normalized);
          }
          break;
        }
      }
    }
    return imports;
  }

  // ── Relative import handling (TS/JS/Python/Go/etc.) ───────────────────────
  const importPatterns = [
    // TS/JS: import ... from '...'
    /(?:import|export)\s+(?:.*?\s+from\s+)?['"](\.[^'"]+)['"]/g,
    // TS/JS: require('...')
    /require\s*\(\s*['"](\.[^'"]+)['"]\s*\)/g,
    // Python: from . import / from .module import
    /from\s+(\.+\S+)\s+import/g,
    // Go: "./package"
    /import\s+["'](\.[^"']+)["']/g,
  ];

  for (const pattern of importPatterns) {
    let match;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(content)) !== null) {
      let importPath = match[1];
      if (!importPath.startsWith('.')) { continue; }

      // Resolve relative path
      const resolved = path.resolve(currentDir, importPath);
      const relResolved = path.relative(workspaceRoot, resolved);

      // Try with and without extensions
      const candidates = [
        relResolved,
        relResolved + '.ts',
        relResolved + '.tsx',
        relResolved + '.js',
        relResolved + '.jsx',
        relResolved + '.py',
        relResolved + '.go',
        relResolved + '/index.ts',
        relResolved + '/index.js',
      ];

      for (const candidate of candidates) {
        const normalized = candidate.replace(/\\/g, '/');
        if (allFiles[normalized] && !seen.has(normalized)) {
          seen.add(normalized);
          imports.push(normalized);
          break;
        }
      }
    }
  }

  return imports;
}

function normalizeKind(kind: string): string {
  const kindMap: Record<string, string> = {
    'f': 'function',
    'c': 'class',
    'm': 'method',
    'v': 'variable',
    'p': 'property',
    'i': 'interface',
    't': 'type',
    'e': 'enum',
    'g': 'enum',
    'n': 'namespace',
    's': 'struct',
    'd': 'define',
    'r': 'trait',
  };
  return kindMap[kind] || kind;
}

function getLanguageFromPath(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const map: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'typescript',
    '.js': 'javascript', '.jsx': 'javascript',
    '.py': 'python', '.go': 'go', '.rs': 'rust',
    '.java': 'java', '.cs': 'csharp',
    '.cpp': 'cpp', '.c': 'c', '.h': 'c',
    '.rb': 'ruby', '.php': 'php',
    '.swift': 'swift', '.kt': 'kotlin',
    '.scala': 'scala', '.vue': 'vue', '.svelte': 'svelte',
  };
  return map[ext] || 'unknown';
}
