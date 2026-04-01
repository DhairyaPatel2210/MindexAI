import * as fs from 'fs';
import * as crypto from 'crypto';
import * as path from 'path';
import { ILLMProvider, RateLimitError } from '../../llm/types';
import { FileNode, DependencyGraph, SymbolEntry } from './graphBuilder';
import { chunkText } from '../../utils/fileUtils';
import { RateLimiter } from '../../llm/rateLimiter';
import { UsageTracker } from '../stats/usageStats';
import { logger } from '../../utils/logger';

export interface FileContext {
  relativePath: string;
  language: string;
  overview: string;
  symbols: SymbolContext[];
  dependencies: string[];
  analyzedAt: string;
  chunkCount: number;
}

export interface SymbolContext {
  name: string;
  kind: string;
  line: number;
  purpose: string;
  behavior: string;
  parameters?: string;
  returns?: string;
  limitations?: string;
  usedBy?: string[];
  uses?: string[];
}

export interface SemanticChunk {
  /** Deterministic id: `filePath::chunk_N` */
  id: string;
  filePath: string;
  /** Raw source text of this chunk — symbol code only (NO preamble) */
  content: string;
  /** SHA-256 of content — used as cache key for delta */
  contentHash: string;
  /** Symbol names DEFINED in this chunk */
  symbolNames: string[];
  /** Imported symbol names USED (referenced) in this chunk */
  referencedSymbols: string[];
  startLine: number;
  endLine: number;
}

/** Result of extractSemanticChunks — preamble is separate for efficient packing */
export interface SemanticChunkResult {
  /** File preamble (imports, module docs) — shared across all chunks */
  preamble: string;
  /** Per-symbol chunks — each hashed individually */
  chunks: SemanticChunk[];
}

/** A group of chunks packed together for a single LLM call */
export interface ChunkGroup {
  /** Chunks included in this group */
  chunks: SemanticChunk[];
  /** Combined content: preamble + all chunk contents */
  combinedContent: string;
  /** Merged dependency context for all chunks in this group */
  depContext: string;
  /** Merged symbol names across all chunks */
  symbolNames: string[];
}

// Gemini 2.0 Flash supports up to 1M tokens — use a generous chunk size
// to avoid unnecessary splitting. At ~4 chars/token this is ~150k tokens.
const MAX_CHUNK_CHARS = 60_000;

// Files smaller than this (bytes) are candidates for batching
export const BATCH_SIZE_THRESHOLD_BYTES = 6_000;

// How many small files to pack into one batch request
const FILES_PER_BATCH = 6;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze a single file using symbol-boundary semantic chunking.
 *
 * Two-level design:
 *   SemanticChunk (per-symbol) → unit of HASHING/CACHING (fine-grained delta)
 *   ChunkGroup (packed chunks) → unit of LLM CALL (minimizes API calls)
 *
 * Optional `previousChunkEntries` enables chunk-level delta: only groups
 * containing changed chunks are re-analyzed via LLM.
 */
export async function analyzeFile(
  fileNode: FileNode,
  graph: DependencyGraph,
  llm: ILLMProvider,
  limiter: RateLimiter,
  signal?: AbortSignal,
  maxChunkChars = MAX_CHUNK_CHARS,
  tracker?: UsageTracker,
  previousChunkEntries?: ChunkCacheEntry[],
): Promise<AnalyzeFileResult> {
  const content = fs.readFileSync(fileNode.absolutePath, 'utf-8');

  // Trivial file — no LLM call needed
  if (isTrivialFile(fileNode, content)) {
    logger.info(`Skipping trivial file: ${fileNode.path}`);
    return { context: syntheticContext(fileNode), chunkEntries: [] };
  }

  // Split into per-symbol semantic chunks
  const { preamble, chunks: allChunks } = extractSemanticChunks(fileNode, content, graph, maxChunkChars);

  if (allChunks.length === 0) {
    return { context: syntheticContext(fileNode), chunkEntries: [] };
  }

  // Build a lookup of previous chunk hashes for delta
  const prevHashMap = new Map<string, ChunkCacheEntry>();
  if (previousChunkEntries) {
    for (const entry of previousChunkEntries) {
      prevHashMap.set(entry.chunkHash, entry);
    }
  }

  // Separate cached vs uncached chunks
  const cachedResults: Array<{ chunkIndex: number; chunk: SemanticChunk; entry: ChunkCacheEntry }> = [];
  const uncachedChunks: Array<{ chunkIndex: number; chunk: SemanticChunk }> = [];

  for (let i = 0; i < allChunks.length; i++) {
    const chunk = allChunks[i];
    const cachedEntry = prevHashMap.get(chunk.contentHash);
    if (cachedEntry) {
      cachedResults.push({ chunkIndex: i, chunk, entry: cachedEntry });
    } else {
      uncachedChunks.push({ chunkIndex: i, chunk });
    }
  }

  if (cachedResults.length > 0) {
    logger.info(
      `${fileNode.path}: ${cachedResults.length}/${allChunks.length} chunks from cache, ` +
      `${uncachedChunks.length} need LLM analysis`,
    );
  }

  // Collect results from cached chunks
  const overviews: string[] = [];
  let symbolContexts: SymbolContext[] = [];
  const newChunkEntries: ChunkCacheEntry[] = [];

  for (const { chunkIndex, entry } of cachedResults) {
    if (entry.result.overview) {
      overviews.push(entry.result.overview);
    }
    symbolContexts.push(...entry.result.symbols);
    newChunkEntries.push({ ...entry, chunkIndex });
  }

  // Pack uncached chunks into groups for LLM calls (best-fit)
  const uncachedOnly = uncachedChunks.map(u => u.chunk);
  const groups = packChunksForAnalysis(uncachedOnly, preamble, fileNode, graph, maxChunkChars);

  let failedGroups = 0;
  const totalGroups = groups.length;

  for (let g = 0; g < groups.length; g++) {
    const group = groups[g];
    const isFirstGroup = g === 0 && cachedResults.length === 0; // only include overview if nothing cached for first

    const result = await callWithRetry(
      () =>
        analyzeChunk(
          group.combinedContent,
          fileNode,
          group.depContext,
          llm,
          limiter,
          isFirstGroup,
          g + 1,
          totalGroups,
          signal,
          tracker,
          group.symbolNames,
        ),
      `${fileNode.path} group ${g + 1}/${totalGroups} (${group.chunks.length} chunks)`,
    );

    if (!result) {
      failedGroups++;
      logger.warn(`Group ${g + 1}/${totalGroups} failed for ${fileNode.path}`);
      // Record empty results for all chunks in this group
      for (const chunk of group.chunks) {
        const idx = allChunks.indexOf(chunk);
        newChunkEntries.push({
          chunkHash: chunk.contentHash,
          chunkIndex: idx,
          result: { overview: '', symbols: [] },
        });
      }
      continue;
    }

    if (result.overview) {
      overviews.push(result.overview);
    }
    symbolContexts.push(...(result.symbols ?? []));

    // Map returned symbols back to their source chunks for per-chunk caching
    for (const chunk of group.chunks) {
      const idx = allChunks.indexOf(chunk);
      const chunkSymbols = (result.symbols ?? []).filter(s =>
        chunk.symbolNames.includes(s.name)
      );
      // Symbols that don't match any chunk go to the first chunk in the group
      const unmatchedSymbols = chunk === group.chunks[0]
        ? (result.symbols ?? []).filter(s =>
            !group.chunks.some(c => c.symbolNames.includes(s.name))
          )
        : [];
      newChunkEntries.push({
        chunkHash: chunk.contentHash,
        chunkIndex: idx,
        result: {
          overview: chunk === group.chunks[0] ? (result.overview ?? '') : '',
          symbols: [...chunkSymbols, ...unmatchedSymbols],
        },
      });
    }
  }

  if (failedGroups === totalGroups && cachedResults.length === 0) {
    throw new Error(
      `Analysis failed for ${fileNode.path}: all ${totalGroups} groups returned no parseable response`,
    );
  }

  for (const sym of symbolContexts) {
    sym.uses = fileNode.imports;
    sym.usedBy = fileNode.importedBy.slice(0, 10);
  }

  return {
    context: {
      relativePath: fileNode.path,
      language: fileNode.language,
      overview: overviews.join('\n\n'),
      symbols: symbolContexts,
      dependencies: fileNode.imports,
      analyzedAt: new Date().toISOString(),
      chunkCount: allChunks.length,
    },
    chunkEntries: newChunkEntries,
  };
}

/** Result of analyzeFile — includes chunk entries for cache storage */
export interface AnalyzeFileResult {
  context: FileContext;
  chunkEntries: ChunkCacheEntry[];
}

/** Per-chunk cache data stored alongside the file-level cache entry */
export interface ChunkCacheEntry {
  chunkHash: string;
  chunkIndex: number;
  result: { overview: string; symbols: SymbolContext[] };
}

/**
 * Analyze multiple small files in a SINGLE LLM request.
 * Returns one FileContext per file. Trivial files get synthetic context.
 */
export async function analyzeFileBatch(
  fileNodes: FileNode[],
  graph: DependencyGraph,
  llm: ILLMProvider,
  limiter: RateLimiter,
  signal?: AbortSignal,
  tracker?: UsageTracker,
): Promise<FileContext[]> {
  if (fileNodes.length === 0) {
    return [];
  }

  // Separate trivial files — they don't need LLM calls
  const trivialResults: FileContext[] = [];
  const nonTrivialNodes: FileNode[] = [];
  for (const node of fileNodes) {
    const content = fs.readFileSync(node.absolutePath, 'utf-8');
    if (isTrivialFile(node, content)) {
      trivialResults.push(syntheticContext(node));
    } else {
      nonTrivialNodes.push(node);
    }
  }

  if (nonTrivialNodes.length === 0) {
    return trivialResults;
  }

  const systemPrompt = buildSystemPrompt();

  // Build a combined prompt with all non-trivial files
  // For small batch files, extract a single SemanticChunk to get
  // relevance-based dependency context
  const fileSections = nonTrivialNodes.map((node) => {
    const content = fs.readFileSync(node.absolutePath, 'utf-8');
    const { chunks } = extractSemanticChunks(node, content, graph);
    // Small files are single-chunk; use chunk dep context if available
    const depCtx = chunks.length > 0
      ? buildChunkDependencyContext(chunks[0], node, graph)
      : buildDependencyContextForFile(node, graph);
    const depNote = depCtx ? `\nDependencies: ${depCtx}` : '';
    return [
      `### FILE: ${node.path}`,
      `Language: ${node.language}${depNote}`,
      '```' + node.language,
      content,
      '```',
    ].join('\n');
  });

  const paths = nonTrivialNodes.map((n) => n.path);
  const nodeCount = nonTrivialNodes.length;

  // Build a concrete example using the actual file paths so the model
  // uses the exact key format without guessing.
  const exampleEntries = paths.slice(0, 2)
    .map(p => `"${p}": {"overview": "...", "symbols": []}`)
    .join(', ');
  const exampleJson = `{${exampleEntries}}`;

  const userPrompt = [
    'OUTPUT ONLY A SINGLE RAW JSON OBJECT — nothing else.',
    'Your entire response MUST start with { and end with }.',
    'Do NOT use markdown code fences. Do NOT wrap in arrays. Do NOT add any text before or after the JSON.',
    '',
    `Analyze these ${nodeCount} source files and return ONE JSON object with exactly ${nodeCount} top-level key${nodeCount > 1 ? 's' : ''}:`,
    paths.map(p => `  "${p}"`).join('\n'),
    '',
    'Each key maps to:',
    '{ "overview": "2-3 sentence description of the file", "symbols": [ { "name": "...", "kind": "function|class|method|interface|type|variable|constant|enum|struct|trait", "line": 0, "purpose": "...", "behavior": "...", "parameters": "...", "returns": "...", "limitations": "..." } ] }',
    '',
    `Example (use the actual file paths shown above as keys):`,
    exampleJson,
    '',
    '---',
    '',
    fileSections.join('\n\n---\n\n'),
  ].join('\n');

  const batchLabel = `batch [${nonTrivialNodes.map((n) => path.basename(n.path)).join(', ')}]`;

  try {
    const raw = await callWithRetry(async () => {
      await limiter.acquire();
      const t0 = Date.now();
      const response = await llm.complete(
        [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        8192,
        signal,
      );
      if (tracker) { tracker.recordCall(response, Date.now() - t0); }
      return response;
    }, batchLabel);

    const rawContent = typeof raw === 'string' ? raw : raw?.content;
    if (!rawContent) {
      logger.warn(
        `Batch returned no content for ${batchLabel}, falling back to individual analysis`,
      );
      const fallback = await individualFallback(nonTrivialNodes, graph, llm, limiter, signal, MAX_CHUNK_CHARS, tracker);
      return [...trivialResults, ...fallback];
    }

    const batchResult = parseBatchResponse(rawContent, nonTrivialNodes, graph);
    if (batchResult === null) {
      logger.warn(
        `Batch parse failed for ${batchLabel}, falling back to individual analysis`,
      );
      const fallback = await individualFallback(nonTrivialNodes, graph, llm, limiter, signal, MAX_CHUNK_CHARS, tracker);
      return [...trivialResults, ...fallback];
    }
    return [...trivialResults, ...batchResult];
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw e;
    } // propagate cancellation
    // Context-size exceeded or other hard error — fall back to individual files
    logger.warn(
      `Batch failed (${e instanceof Error ? e.message.slice(0, 80) : e}), analyzing files individually`,
    );
    const fallback = await individualFallback(nonTrivialNodes, graph, llm, limiter, signal, MAX_CHUNK_CHARS, tracker);
    return [...trivialResults, ...fallback];
  }
}

/** Analyze each file individually — used as fallback when batch fails. */
async function individualFallback(
  fileNodes: FileNode[],
  graph: DependencyGraph,
  llm: ILLMProvider,
  limiter: RateLimiter,
  signal?: AbortSignal,
  maxChunkChars = MAX_CHUNK_CHARS,
  tracker?: UsageTracker,
): Promise<FileContext[]> {
  const results: FileContext[] = [];
  for (const node of fileNodes) {
    if (signal?.aborted) {
      break;
    }
    try {
      const { context } = await analyzeFile(node, graph, llm, limiter, signal, maxChunkChars, tracker);
      results.push(context);
    } catch (e) {
      if ((e as Error).name === 'AbortError') {
        throw e;
      } // propagate cancellation
      logger.error(`Individual analysis failed for ${node.path}`, e);
      results.push(emptyFileContext(node));
    }
  }
  return results;
}

function emptyFileContext(node: FileNode): FileContext {
  return {
    relativePath: node.path,
    language: node.language,
    overview: '',
    symbols: [],
    dependencies: node.imports,
    analyzedAt: new Date().toISOString(),
    chunkCount: 0,
  };
}

// ─── Batch grouping helper ────────────────────────────────────────────────────

/**
 * Split a list of files into batches of small files and a list of large files.
 * Small files are grouped FILES_PER_BATCH at a time for batch analysis.
 * Large files are returned individually for single-file analysis.
 */
export function partitionForBatching(fileNodes: FileNode[]): {
  batches: FileNode[][];
  large: FileNode[];
} {
  const small: FileNode[] = [];
  const large: FileNode[] = [];

  for (const node of fileNodes) {
    if (node.sizeBytes <= BATCH_SIZE_THRESHOLD_BYTES) {
      small.push(node);
    } else {
      large.push(node);
    }
  }

  const batches: FileNode[][] = [];
  for (let i = 0; i < small.length; i += FILES_PER_BATCH) {
    batches.push(small.slice(i, i + FILES_PER_BATCH));
  }

  return { batches, large };
}

// ─── Internals ────────────────────────────────────────────────────────────────

interface ChunkResult {
  overview: string;
  symbols: SymbolContext[];
}

async function analyzeChunk(
  content: string,
  fileNode: FileNode,
  depContext: string,
  llm: ILLMProvider,
  limiter: RateLimiter,
  includeOverview: boolean,
  chunkNum?: number,
  totalChunks?: number,
  signal?: AbortSignal,
  tracker?: UsageTracker,
  chunkSymbolNames?: string[],
): Promise<ChunkResult> {
  const chunkLabel =
    chunkNum && totalChunks ? ` (chunk ${chunkNum}/${totalChunks})` : '';
  const depSection = depContext ? `\n\nDependencies: ${depContext}` : '';
  const symbolHint = chunkSymbolNames && chunkSymbolNames.length > 0
    ? `\nThis chunk defines: ${chunkSymbolNames.join(', ')}`
    : '';
  const overviewField = includeOverview
    ? '"overview": "<2-3 sentence description of this file\'s purpose and role>",'
    : '"overview": "",';

  const userPrompt = [
    'OUTPUT ONLY A SINGLE RAW JSON OBJECT — nothing else.',
    'Your entire response MUST start with { and end with }.',
    'Do NOT use markdown code fences. Do NOT add any text, explanation, or preamble before or after the JSON.',
    '',
    `Analyze this ${fileNode.language} file: ${fileNode.path}${chunkLabel}${depSection}${symbolHint}`,
    '',
    `Return this exact JSON structure (no extra keys, no wrapping object):`,
    `{ ${overviewField} "symbols": [ { "name":"...", "kind":"function|class|method|interface|type|variable|constant|enum|struct|trait", "line":0, "purpose":"...", "behavior":"...", "parameters":"...", "returns":"...", "limitations":"..." } ] }`,
    '',
    '```' + fileNode.language,
    content,
    '```',
  ].join('\n');

  await limiter.acquire();
  const t0 = Date.now();
  const response = await llm.complete(
    [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: userPrompt },
    ],
    4096,
    signal,
  );
  const elapsed = Date.now() - t0;
  if (tracker) { tracker.recordCall(response, elapsed); }
  logger.info(
    `LLM ← ${fileNode.path}${chunkLabel} in ${(elapsed / 1000).toFixed(1)}s (${response.content.length} chars)`,
  );

  return parseChunkResponse(response.content, fileNode.path, includeOverview);
}

function parseChunkResponse(
  raw: string,
  filePath: string,
  includeOverview: boolean,
): ChunkResult {
  const parsed = extractJson<{ overview?: string; symbols?: RawSymbol[] }>(raw);
  if (!parsed) {
    const preview = raw.slice(0, 120).replace(/\n/g, ' ');
    throw new Error(`LLM returned unparseable JSON for ${filePath} — response starts with: ${preview}`);
  }
  return {
    overview: includeOverview ? (parsed.overview ?? '') : '',
    symbols: normalizeSymbols(parsed.symbols ?? []),
  };
}

function parseBatchResponse(
  raw: string | undefined,
  fileNodes: FileNode[],
  graph: DependencyGraph,
): FileContext[] | null {
  if (!raw) {
    logger.warn('parseBatchResponse received empty content');
    return null;
  }
  const parsed =
    extractJson<Record<string, { overview?: string; symbols?: RawSymbol[] }>>(
      raw,
    );
  if (!parsed) {
    logger.warn(
      `Could not parse batch LLM response — raw starts with: ${raw.slice(0, 120).replace(/\n/g, ' ')}`,
    );
    return null;
  }
  const data = parsed;

  return fileNodes.map((node) => {
    // Try exact path match first, then basename match as fallback
    const entry =
      data[node.path] ??
      data[node.path.replace(/\\/g, '/')] ??
      Object.values(data).find((_, i) =>
        Object.keys(data)[i].endsWith(path.basename(node.path)),
      ) ??
      {};

    const symbols = normalizeSymbols(
      (entry as { overview?: string; symbols?: RawSymbol[] }).symbols ?? [],
    ).map((sym) => ({
      ...sym,
      uses: node.imports,
      usedBy: node.importedBy.slice(0, 10),
    }));

    return {
      relativePath: node.path,
      language: node.language,
      overview: (entry as { overview?: string }).overview ?? '',
      symbols,
      dependencies: node.imports,
      analyzedAt: new Date().toISOString(),
      chunkCount: 1,
    };
  });
}

/**
 * Robustly extract a JSON object from an LLM response that may contain:
 * - Markdown code fences (```json ... ```)
 * - Preamble text before the JSON
 * - Trailing text after the JSON
 * Finds the first '{' and its matching closing '}' to isolate the object.
 */
export function extractJson<T>(raw: string): T | null {
  if (!raw) {
    return null;
  }

  // Strip markdown code fences
  let text = raw.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '');

  // Fast path: entire string is valid JSON
  try {
    return JSON.parse(text) as T;
  } catch {
    /* fall through */
  }

  // Find the first '{' and walk to its matching '}'
  const start = text.indexOf('{');
  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escape) {
      escape = false;
      continue;
    }
    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) {
      continue;
    }
    if (ch === '{') {
      depth++;
    }
    if (ch === '}') {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(text.slice(start, i + 1)) as T;
        } catch {
          return null;
        }
      }
    }
  }

  return null;
}

interface RawSymbol {
  name?: string;
  kind?: string;
  line?: number;
  purpose?: string;
  behavior?: string;
  parameters?: string;
  returns?: string;
  limitations?: string;
}

export function normalizeSymbols(raw: RawSymbol[]): SymbolContext[] {
  return raw.map((s) => ({
    name: s.name ?? 'unknown',
    kind: s.kind ?? 'unknown',
    line: s.line ?? 0,
    purpose: s.purpose ?? '',
    behavior: s.behavior ?? '',
    parameters: s.parameters,
    returns: s.returns,
    limitations: s.limitations,
  }));
}

// ─── Semantic chunking ───────────────────────────────────────────────────────

/** Minimum content length to consider a file worth sending to the LLM */
const TRIVIAL_FILE_THRESHOLD = 50;

/**
 * Returns true when a file has no extractable symbols and negligible content.
 * These files get a synthetic FileContext without an LLM call.
 */
export function isTrivialFile(fileNode: FileNode, content: string): boolean {
  return fileNode.symbols.length === 0 && content.trim().length < TRIVIAL_FILE_THRESHOLD;
}

/**
 * Build a synthetic FileContext for trivial/empty files — no LLM call needed.
 */
function syntheticContext(node: FileNode): FileContext {
  return {
    relativePath: node.path,
    language: node.language,
    overview: 'Trivial or empty file with no significant logic.',
    symbols: [],
    dependencies: node.imports,
    analyzedAt: new Date().toISOString(),
    chunkCount: 0,
  };
}

/**
 * Collect all symbol names exported by every file this file imports.
 * Used to detect which imported symbols appear in a chunk.
 */
function collectImportedSymbolNames(
  fileNode: FileNode,
  graph: DependencyGraph,
): Set<string> {
  const names = new Set<string>();
  for (const dep of fileNode.imports) {
    const depNode = graph.files[dep];
    if (!depNode) { continue; }
    for (const s of depNode.symbols) {
      names.add(s.name);
    }
  }
  return names;
}

/**
 * Scan chunk content for references to imported symbol names.
 * Uses word-boundary matching to avoid partial-name false positives.
 */
function extractReferencedSymbols(
  chunkContent: string,
  importedNames: Set<string>,
): string[] {
  const found: string[] = [];
  for (const name of importedNames) {
    // Skip very short names (1-2 chars) to avoid false positives
    if (name.length <= 2) { continue; }
    // Word-boundary check: the name must not be preceded/followed by a word char
    const regex = new RegExp(`\\b${escapeRegex(name)}\\b`);
    if (regex.test(chunkContent)) {
      found.push(name);
    }
  }
  return found;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hashContent(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Determines how many lines above a symbol's start line belong to it
 * (decorators, annotations, doc comments).
 */
function findDecoratorStart(lines: string[], symbolLine0: number): number {
  let start = symbolLine0;
  for (let i = symbolLine0 - 1; i >= 0; i--) {
    const trimmed = lines[i].trim();
    if (
      trimmed.startsWith('@') ||       // Java/Python/TS decorators
      trimmed.startsWith('#[') ||      // Rust attributes
      trimmed.startsWith('///') ||     // Rust/C# doc comments
      trimmed.startsWith('/**') ||     // JSDoc
      trimmed.startsWith('*') ||       // JSDoc continuation
      trimmed.startsWith('//') ||      // line comments directly above
      trimmed.startsWith('#') && !trimmed.startsWith('#!') // Python comments (not shebang)
    ) {
      start = i;
    } else {
      break;
    }
  }
  return start;
}

interface SymbolRegion {
  name: string;
  kind: string;
  startLine: number; // 0-indexed
  endLine: number;   // 0-indexed, inclusive
}

/**
 * Split a file into SemanticChunks using symbol line-number boundaries
 * from existing ctags/regex extraction.
 *
 * Algorithm:
 * 1. Sort symbols by line number.
 * 2. Identify preamble (lines before first symbol — imports, module docs).
 * 3. Each symbol owns from its line (adjusted for decorators) to next symbol's adjusted start - 1.
 * 4. Group adjacent symbol regions into chunks respecting maxChunkChars.
 * 5. Prepend preamble to every chunk so LLM always has import context.
 * 6. Compute contentHash, symbolNames, referencedSymbols per chunk.
 */
/**
 * Split a file into per-symbol SemanticChunks.
 * Each chunk = one symbol region, hashed independently (NO preamble in content).
 * Preamble (imports, module docs) is returned separately for efficient packing.
 *
 * Oversized single symbols are split with line-based fallback.
 */
export function extractSemanticChunks(
  fileNode: FileNode,
  content: string,
  graph: DependencyGraph,
  maxChunkChars: number = MAX_CHUNK_CHARS,
): SemanticChunkResult {
  // Trivial file — no chunks, no LLM
  if (isTrivialFile(fileNode, content)) {
    return { preamble: '', chunks: [] };
  }

  const lines = content.split('\n');

  // No symbols but substantial content (config files, CSS, etc.) — single chunk
  if (fileNode.symbols.length === 0) {
    const importedNames = collectImportedSymbolNames(fileNode, graph);
    const refs = extractReferencedSymbols(content, importedNames);
    return {
      preamble: '',
      chunks: [{
        id: `${fileNode.path}::chunk_0`,
        filePath: fileNode.path,
        content,
        contentHash: hashContent(content),
        symbolNames: [],
        referencedSymbols: refs,
        startLine: 0,
        endLine: lines.length - 1,
      }],
    };
  }

  // Sort symbols by line (1-indexed from ctags/regex)
  const sorted = [...fileNode.symbols].sort((a, b) => a.line - b.line);

  // Build symbol regions with decorator attachment
  const regions: SymbolRegion[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const sym = sorted[i];
    const rawStart = sym.line - 1; // convert to 0-indexed
    const adjustedStart = findDecoratorStart(lines, rawStart);
    const endLine = i < sorted.length - 1
      ? sorted[i + 1].line - 2  // up to line before next symbol's raw start
      : lines.length - 1;       // last symbol owns to EOF

    regions.push({
      name: sym.name,
      kind: sym.kind,
      startLine: adjustedStart,
      endLine: Math.max(adjustedStart, endLine), // safety: end >= start
    });
  }

  // Fix overlapping regions: if decorator attachment pulled a region's start
  // above the previous region's end, clamp to avoid overlap.
  for (let i = 1; i < regions.length; i++) {
    if (regions[i].startLine <= regions[i - 1].endLine) {
      regions[i].startLine = regions[i - 1].endLine + 1;
    }
  }

  // Preamble: lines before the first region (imports, module docstring)
  const preambleEnd = regions[0].startLine - 1;
  const preamble = preambleEnd >= 0
    ? lines.slice(0, preambleEnd + 1).join('\n')
    : '';
  const preambleLen = preamble.length;

  // Collect imported symbol names for reference detection
  const importedNames = collectImportedSymbolNames(fileNode, graph);

  // Create one chunk per symbol region (NO grouping — packing happens later)
  const chunks: SemanticChunk[] = [];

  for (const region of regions) {
    const regionText = lines.slice(region.startLine, region.endLine + 1).join('\n');
    const regionLen = regionText.length;

    // If a single region exceeds limit even alone, fall back to line-based split
    if (regionLen + preambleLen + 1 > maxChunkChars) {
      const subChunks = chunkText(regionText, maxChunkChars - preambleLen - 1);
      for (const sub of subChunks) {
        const refs = extractReferencedSymbols(sub, importedNames);
        chunks.push({
          id: `${fileNode.path}::chunk_${chunks.length}`,
          filePath: fileNode.path,
          content: sub,
          contentHash: hashContent(sub),
          symbolNames: [region.name],
          referencedSymbols: refs,
          startLine: region.startLine,
          endLine: region.endLine,
        });
      }
      continue;
    }

    const refs = extractReferencedSymbols(regionText, importedNames);
    chunks.push({
      id: `${fileNode.path}::chunk_${chunks.length}`,
      filePath: fileNode.path,
      content: regionText,
      contentHash: hashContent(regionText),
      symbolNames: [region.name],
      referencedSymbols: refs,
      startLine: region.startLine,
      endLine: region.endLine,
    });
  }

  return { preamble, chunks };
}

/**
 * Pack whole semantic chunks into groups for LLM calls using best-fit.
 * Each group fits within maxChunkChars (including preamble).
 * If the next sequential chunk doesn't fit, scan remaining chunks for
 * a smaller one that does — maximizes utilization per LLM call.
 */
export function packChunksForAnalysis(
  chunks: SemanticChunk[],
  preamble: string,
  fileNode: FileNode,
  graph: DependencyGraph,
  maxChunkChars: number = MAX_CHUNK_CHARS,
): ChunkGroup[] {
  if (chunks.length === 0) { return []; }

  const preambleLen = preamble.length;
  // 1 for newline between preamble and body, 1 for newline between chunks
  const overhead = preambleLen > 0 ? preambleLen + 1 : 0;
  const budget = maxChunkChars - overhead;

  const groups: ChunkGroup[] = [];
  const used = new Set<number>(); // indices of chunks already placed

  // Process chunks: try sequential order, but fill gaps with smaller chunks
  let i = 0;
  while (used.size < chunks.length) {
    // Start a new group
    const groupChunks: SemanticChunk[] = [];
    let groupBodyLen = 0;

    // Find the first unplaced chunk to seed this group
    while (i < chunks.length && used.has(i)) { i++; }
    if (i >= chunks.length) {
      // All remaining unplaced chunks — find first one
      for (let k = 0; k < chunks.length; k++) {
        if (!used.has(k)) { i = k; break; }
      }
    }

    // Add chunks sequentially while they fit
    for (let j = i; j < chunks.length; j++) {
      if (used.has(j)) { continue; }
      const chunkLen = chunks[j].content.length;
      const separator = groupBodyLen > 0 ? 1 : 0; // newline between chunks
      if (groupBodyLen + chunkLen + separator <= budget) {
        groupChunks.push(chunks[j]);
        used.add(j);
        groupBodyLen += chunkLen + separator;
      }
    }

    // If sequential scan missed any earlier chunks that could fit, try them too
    for (let j = 0; j < i; j++) {
      if (used.has(j)) { continue; }
      const chunkLen = chunks[j].content.length;
      const separator = groupBodyLen > 0 ? 1 : 0;
      if (groupBodyLen + chunkLen + separator <= budget) {
        groupChunks.push(chunks[j]);
        used.add(j);
        groupBodyLen += chunkLen + separator;
      }
    }

    if (groupChunks.length === 0) {
      // Safety: shouldn't happen, but avoid infinite loop
      // Force-add the next unplaced chunk (it exceeds budget alone — already split)
      for (let k = 0; k < chunks.length; k++) {
        if (!used.has(k)) {
          groupChunks.push(chunks[k]);
          used.add(k);
          break;
        }
      }
    }

    // Build the combined content and dep context for this group
    const body = groupChunks.map(c => c.content).join('\n');
    const combinedContent = preamble ? preamble + '\n' + body : body;

    // Merge dep context: union of all referenced symbols across chunks
    const allRefs = new Set<string>();
    for (const c of groupChunks) {
      for (const ref of c.referencedSymbols) { allRefs.add(ref); }
    }
    const depContext = buildGroupDependencyContext(allRefs, fileNode, graph);

    const symbolNames = groupChunks.flatMap(c => c.symbolNames);

    groups.push({ chunks: groupChunks, combinedContent, depContext, symbolNames });

    i++;
  }

  return groups;
}

/**
 * Build dependency context for a group of chunks — union of all referenced symbols.
 */
function buildGroupDependencyContext(
  referencedSymbols: Set<string>,
  fileNode: FileNode,
  graph: DependencyGraph,
): string {
  if (fileNode.imports.length === 0 || referencedSymbols.size === 0) {
    return '';
  }
  const lines: string[] = [];
  for (const dep of fileNode.imports) {
    const depNode = graph.files[dep];
    if (!depNode) { continue; }
    const relevant = depNode.symbols.filter(s => referencedSymbols.has(s.name));
    if (relevant.length > 0) {
      const names = relevant.map(s => `${s.name}(${s.kind})`).join(', ');
      lines.push(`\`${dep}\`: ${names}`);
    }
  }
  return lines.join('; ');
}

/**
 * Build dependency context for a specific chunk — includes only symbols from
 * imported files that are actually referenced in this chunk's content.
 * No artificial cap on number of imports checked.
 */
function buildChunkDependencyContext(
  chunk: SemanticChunk,
  fileNode: FileNode,
  graph: DependencyGraph,
): string {
  if (fileNode.imports.length === 0 || chunk.referencedSymbols.length === 0) {
    return '';
  }
  const refSet = new Set(chunk.referencedSymbols);
  const lines: string[] = [];

  for (const dep of fileNode.imports) {
    const depNode = graph.files[dep];
    if (!depNode) { continue; }

    const relevant = depNode.symbols.filter(s => refSet.has(s.name));
    if (relevant.length > 0) {
      const names = relevant.map(s => `${s.name}(${s.kind})`).join(', ');
      lines.push(`\`${dep}\`: ${names}`);
    }
  }
  return lines.join('; ');
}

// Keep the old function signature available for batch analysis of small files
// that don't go through semantic chunking
function buildDependencyContextForFile(
  fileNode: FileNode,
  graph: DependencyGraph,
): string {
  if (fileNode.imports.length === 0) {
    return '';
  }
  const lines: string[] = [];
  for (const dep of fileNode.imports) {
    const depNode = graph.files[dep];
    if (!depNode) {
      continue;
    }
    const names = depNode.symbols.map((s) => `${s.name}(${s.kind})`).join(', ');
    if (names) {
      lines.push(`\`${dep}\` exports: ${names}`);
    }
  }
  return lines.join('; ');
}

function buildSystemPrompt(): string {
  return (
    'You are a senior software engineer creating semantic documentation of source code. ' +
    'Your output will be used by AI coding assistants to understand the codebase semantically. ' +
    'Be precise, concise, and informative. Focus on WHAT the code does, WHY it exists, and WHAT its limitations are. ' +
    'Do not reproduce actual code. Describe behavior in plain English. Always output only valid JSON.'
  );
}

// ─── Retry wrapper ────────────────────────────────────────────────────────────

/** True when the error is a context-window-exceeded failure — retrying won't help. */
function isContextSizeError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  return /exceed_context_size|context.*(size|length)|too.?many.?tokens|prompt.*too.?long/i.test(
    msg,
  );
}

/** True when the error is a transient network issue worth retrying. */
function isTransientNetworkError(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e);
  const name = e instanceof Error ? e.name : '';
  return (
    /terminated|econnreset|econnrefused|etimedout|und_err_socket|fetch failed|network|socket hang up/i.test(
      msg,
    ) ||
    (name === 'TypeError' && /terminated|fetch/i.test(msg))
  );
}

/**
 * Retries `fn` up to MAX_RETRIES times on RateLimitError or transient network errors.
 * On context-size errors throws immediately (caller must handle).
 * On other permanent failures returns undefined so callers can degrade gracefully.
 */
async function callWithRetry<T>(
  fn: () => Promise<T>,
  label: string,
): Promise<T | undefined> {
  const MAX_RETRIES = 3;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (e) {
      // Cancellation: propagate immediately — do not retry or swallow
      if ((e as Error).name === 'AbortError') {
        throw e;
      }
      // Context-size errors: no point retrying — propagate so caller can adapt
      if (isContextSizeError(e)) {
        logger.warn(`Context size exceeded for "${label}" — skipping retries`);
        throw e;
      }

      const isRetryable =
        e instanceof RateLimitError || isTransientNetworkError(e);

      if (isRetryable && attempt < MAX_RETRIES) {
        const waitMs =
          e instanceof RateLimitError
            ? e.retryAfterMs
            : Math.min(2000 * attempt, 10_000); // exponential backoff for network errors
        const waitSec = Math.ceil(waitMs / 1000);
        logger.warn(
          `Retryable error on "${label}" (attempt ${attempt}/${MAX_RETRIES}). Waiting ${waitSec}s… — ${(e as Error).message ?? e}`,
        );
        await sleep(waitMs);
        continue;
      }

      logger.error(`LLM call failed for "${label}"`, e);
      if (attempt === MAX_RETRIES) {
        return undefined;
      }
    }
  }
  return undefined;
}

// ─── Markdown renderer ────────────────────────────────────────────────────────

export function renderContextMarkdown(ctx: FileContext): string {
  const lines: string[] = [];

  lines.push(`# ${ctx.relativePath}`);
  lines.push(`**Language:** ${ctx.language}  `);
  lines.push(`**Analyzed:** ${ctx.analyzedAt}  `);
  lines.push('');

  // Trivial file — no symbols, synthetic overview
  if (ctx.chunkCount === 0 && ctx.overview === 'Trivial or empty file with no significant logic.') {
    lines.push('> **Trivial file** — no significant logic to analyze.');
    return lines.join('\n');
  }

  // If analysis failed completely (no overview, no symbols), write an explicit notice
  if (!ctx.overview && ctx.symbols.length === 0 && ctx.chunkCount === 0) {
    lines.push(
      '> **Analysis failed** — this file could not be processed by the LLM.',
    );
    lines.push(
      '> Common causes: file exceeds the model\'s context window, or the LLM returned unparseable output.',
    );
    lines.push(
      '> Re-run the workflow with a larger context window or a cloud provider to analyze this file.',
    );
    return lines.join('\n');
  }

  if (ctx.overview) {
    lines.push('## Overview');
    lines.push(ctx.overview);
    lines.push('');
  }

  if (ctx.dependencies.length > 0) {
    lines.push('## Dependencies');
    for (const dep of ctx.dependencies) {
      lines.push(`- \`${dep}\``);
    }
    lines.push('');
  }

  if (ctx.symbols.length > 0) {
    lines.push('## Symbols');
    lines.push('');
    for (const sym of ctx.symbols) {
      lines.push(`### \`${sym.name}\` *(${sym.kind})*`);
      if (sym.line > 0) {
        lines.push(`**Line:** ${sym.line}  `);
      }
      lines.push(`**Purpose:** ${sym.purpose}  `);
      lines.push('');
      lines.push(`**Behavior:** ${sym.behavior}`);
      lines.push('');
      if (sym.parameters) {
        lines.push(`**Parameters:** ${sym.parameters}  `);
      }
      if (sym.returns) {
        lines.push(`**Returns:** ${sym.returns}  `);
      }
      if (sym.limitations) {
        lines.push(`**Limitations:** ${sym.limitations}  `);
      }
      if (sym.usedBy?.length) {
        lines.push(
          `**Used by:** ${sym.usedBy.map((f) => `\`${f}\``).join(', ')}  `,
        );
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
