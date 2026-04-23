import { FileContext, SymbolContext } from './fileAnalyzer';
import { DependencyGraph } from './graphBuilder';
import {
  writeJson,
  writeText,
  getIndexFilePath,
  getContextOverviewPath,
  getContextFilePath,
} from '../../utils/fileUtils';
import { logger } from '../../utils/logger';

// ─── Index Schema ────────────────────────────────────────────────────────────

export interface SymbolIndexEntry {
  name: string;
  kind: string;
  file: string;
  line: number;
  purpose: string;
  behavior: string;
  limitations?: string;
  contextFile: string;     // path to .md context file
}

export interface FileIndexEntry {
  path: string;
  language: string;
  overview: string;
  symbols: string[];       // symbol names
  dependencies: string[];
  importedBy: string[];
  contextFile: string;
  analyzedAt: string;
}

export interface SemanticIndex {
  version: string;
  generatedAt: string;
  totalFiles: number;
  totalSymbols: number;
  /**
   * Flat symbol index — keyed by "SymbolName" for instant lookup.
   * Collisions (same name, different files) are stored as arrays.
   */
  symbols: Record<string, SymbolIndexEntry[]>;
  /** File index keyed by relative path */
  files: Record<string, FileIndexEntry>;
  /**
   * Inverted keyword index mapping plain-english terms → symbol names.
   * Enables lightweight semantic search without embeddings.
   */
  keywords: Record<string, string[]>;
}

// ─── Index Builder ────────────────────────────────────────────────────────────

export function buildIndex(
  fileContexts: FileContext[],
  graph: DependencyGraph
): SemanticIndex {
  // Use Object.create(null) so keys like "constructor", "toString", "__proto__"
  // don't collide with Object.prototype properties.
  const symbols: Record<string, SymbolIndexEntry[]> = Object.create(null);
  const files: Record<string, FileIndexEntry> = Object.create(null);
  const keywords: Record<string, string[]> = Object.create(null);

  for (const ctx of fileContexts) {
    const contextFile = getContextFilePath(ctx.relativePath)
      .replace(/\\/g, '/');

    // File entry
    const graphNode = graph.files[ctx.relativePath];
    files[ctx.relativePath] = {
      path: ctx.relativePath,
      language: ctx.language,
      overview: ctx.overview,
      symbols: ctx.symbols.map(s => s.name),
      dependencies: ctx.dependencies,
      importedBy: graphNode?.importedBy || [],
      contextFile,
      analyzedAt: ctx.analyzedAt,
    };

    // Symbol entries
    for (const sym of ctx.symbols) {
      const entry: SymbolIndexEntry = {
        name: sym.name,
        kind: sym.kind,
        file: ctx.relativePath,
        line: sym.line,
        purpose: sym.purpose,
        behavior: sym.behavior,
        limitations: sym.limitations,
        contextFile,
      };

      if (!symbols[sym.name]) {
        symbols[sym.name] = [];
      }
      symbols[sym.name].push(entry);

      // Build keyword index from purpose + behavior text
      indexKeywords(sym, ctx.relativePath, keywords);
    }
  }

  const totalSymbols = Object.values(symbols).reduce((s, arr) => s + arr.length, 0);
  logger.info(`Index built: ${Object.keys(files).length} files, ${totalSymbols} symbols, ${Object.keys(keywords).length} keywords`);

  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    totalFiles: Object.keys(files).length,
    totalSymbols,
    symbols,
    files,
    keywords,
  };
}

function indexKeywords(
  sym: SymbolContext,
  filePath: string,
  keywords: Record<string, string[]>
): void {
  const text = [sym.name, sym.purpose, sym.behavior, sym.limitations || ''].join(' ');
  const words = extractMeaningfulWords(text);

  for (const word of words) {
    if (!keywords[word]) {
      keywords[word] = [];
    }
    const ref = `${filePath}::${sym.name}`;
    if (!keywords[word].includes(ref)) {
      keywords[word].push(ref);
    }
  }
}

export function extractMeaningfulWords(text: string): string[] {
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'be',
    'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'shall', 'can', 'that',
    'this', 'it', 'its', 'not', 'if', 'then', 'else', 'when', 'where',
    'which', 'who', 'how', 'what', 'why', 'all', 'any', 'both', 'each',
    'into', 'through', 'during', 'before', 'after', 'above', 'below',
    'up', 'down', 'out', 'off', 'over', 'under', 'again', 'further',
    'once', 'also', 'just', 'only', 'own', 'same', 'so', 'than', 'too',
    'very', 's', 't', 'can', 'now', 'will', 'just', 'don', 'no', 'such',
    'whether', 'either', 'neither', 'upon', 'while',
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 3 && !stopWords.has(w))
    .filter((w, i, arr) => arr.indexOf(w) === i); // unique
}

// ─── Persistence ─────────────────────────────────────────────────────────────

export function persistIndex(index: SemanticIndex): void {
  writeJson(getIndexFilePath(), index);
  logger.info(`Index written to ${getIndexFilePath()}`);
}

export function persistContextOverview(
  index: SemanticIndex,
  graph: DependencyGraph
): void {
  const lines: string[] = [];

  lines.push('# MindexAI — Codebase Semantic Context');
  lines.push('');
  lines.push('> Generated by MindexAI. Use this file as the entry point for LLM tools.');
  lines.push(`> Last updated: ${index.generatedAt}`);
  lines.push('');

  lines.push('## Codebase Stats');
  lines.push(`- **Total files analyzed:** ${index.totalFiles}`);
  lines.push(`- **Total symbols indexed:** ${index.totalSymbols}`);
  lines.push(`- **Dependency edges:** ${graph.stats.totalEdges}`);
  lines.push('');

  lines.push('## How to Use This Index');
  lines.push('');
  lines.push('All context files are in `.mindexai/context/`. Each source file has a corresponding');
  lines.push('`.md` file describing its symbols in plain English.');
  lines.push('');
  lines.push('- **`index.json`** — Full semantic index. Contains every symbol with plain-English descriptions.');
  lines.push('- **`graph.json`** — File dependency graph. Shows import relationships.');
  lines.push('- **`context/<path>.md`** — Per-file English descriptions.');
  lines.push('');

  lines.push('## File Overview');
  lines.push('');

  // Group by directory
  const byDir: Record<string, FileIndexEntry[]> = {};
  for (const entry of Object.values(index.files)) {
    const dir = entry.path.includes('/')
      ? entry.path.substring(0, entry.path.lastIndexOf('/'))
      : '.';
    if (!byDir[dir]) { byDir[dir] = []; }
    byDir[dir].push(entry);
  }

  for (const [dir, entries] of Object.entries(byDir).sort()) {
    lines.push(`### \`${dir}/\``);
    for (const entry of entries.sort((a, b) => a.path.localeCompare(b.path))) {
      const overview = inlineOverview(entry.overview);
      lines.push(`- **\`${entry.path}\`** — ${overview}`);
    }
    lines.push('');
  }

  lines.push('## Key Symbols');
  lines.push('');
  lines.push('Top-level exported symbols across the codebase:');
  lines.push('');

  // Show top symbols (classes, main functions)
  const topSymbols = Object.values(index.symbols)
    .flat()
    .filter(s => ['class', 'interface', 'function', 'struct', 'trait'].includes(s.kind))
    .slice(0, 50);

  for (const sym of topSymbols) {
    lines.push(`- **\`${sym.name}\`** (${sym.kind}) in \`${sym.file}\` — ${sym.purpose}`);
  }

  writeText(getContextOverviewPath(), lines.join('\n'));
  logger.info(`Context overview written to ${getContextOverviewPath()}`);
}

/**
 * Format an overview string for inline use in a markdown list item.
 * - Collapses embedded newlines to spaces (keeps the list item on one line)
 * - Truncates with … at 200 chars
 * - Falls back to italicised placeholder if empty
 */
export function inlineOverview(overview: string | undefined): string {
  if (!overview?.trim()) { return '_No overview available_'; }
  const flat = overview.replace(/[\r\n]+/g, ' ').replace(/\s{2,}/g, ' ').trim();
  return flat.length > 200 ? flat.substring(0, 197) + '…' : flat;
}
