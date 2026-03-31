import * as fs from 'fs';
import * as path from 'path';
import { ILLMProvider, RateLimitError } from '../../llm/types';
import { FileNode, DependencyGraph } from './graphBuilder';
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

// Gemini 2.0 Flash supports up to 1M tokens — use a generous chunk size
// to avoid unnecessary splitting. At ~4 chars/token this is ~150k tokens.
const MAX_CHUNK_CHARS = 60_000;

// Files smaller than this (bytes) are candidates for batching
export const BATCH_SIZE_THRESHOLD_BYTES = 6_000;

// How many small files to pack into one batch request
const FILES_PER_BATCH = 6;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyze a single file. Uses the rate limiter before every LLM call.
 */
export async function analyzeFile(
  fileNode: FileNode,
  graph: DependencyGraph,
  llm: ILLMProvider,
  limiter: RateLimiter,
  signal?: AbortSignal,
  maxChunkChars = MAX_CHUNK_CHARS,
  tracker?: UsageTracker,
): Promise<FileContext> {
  const content = fs.readFileSync(fileNode.absolutePath, 'utf-8');
  const depContext = buildDependencyContext(fileNode, graph);
  const chunks = chunkText(content, maxChunkChars);

  let overview = '';
  let symbolContexts: SymbolContext[] = [];

  if (chunks.length === 1) {
    const result = await callWithRetry(
      () =>
        analyzeChunk(
          content,
          fileNode,
          depContext,
          llm,
          limiter,
          true,
          undefined,
          undefined,
          signal,
          tracker,
        ),
      fileNode.path,
    );
    if (!result) {
      throw new Error(
        `Analysis failed for ${fileNode.path}: LLM returned no parseable response after retries`,
      );
    }
    overview = result.overview ?? '';
    symbolContexts = result.symbols ?? [];
  } else {
    logger.info(`File ${fileNode.path} split into ${chunks.length} chunks`);
    const overviews: string[] = [];
    let failedChunks = 0;

    for (let i = 0; i < chunks.length; i++) {
      const isFirst = i === 0;
      const result = await callWithRetry(
        () =>
          analyzeChunk(
            chunks[i],
            fileNode,
            isFirst ? depContext : '',
            llm,
            limiter,
            isFirst,
            i + 1,
            chunks.length,
            signal,
            tracker,
          ),
        `${fileNode.path} chunk ${i + 1}/${chunks.length}`,
      );
      if (!result) {
        failedChunks++;
        logger.warn(`Chunk ${i + 1}/${chunks.length} failed for ${fileNode.path}`);
        continue;
      }
      if (result.overview) {
        overviews.push(result.overview);
      }
      symbolContexts.push(...(result.symbols ?? []));
    }

    if (failedChunks === chunks.length) {
      throw new Error(
        `Analysis failed for ${fileNode.path}: all ${chunks.length} chunks returned no parseable response`,
      );
    }

    overview = overviews.join('\n\n');
  }

  for (const sym of symbolContexts) {
    sym.uses = fileNode.imports;
    sym.usedBy = fileNode.importedBy.slice(0, 10);
  }

  return {
    relativePath: fileNode.path,
    language: fileNode.language,
    overview,
    symbols: symbolContexts,
    dependencies: fileNode.imports,
    analyzedAt: new Date().toISOString(),
    chunkCount: chunks.length,
  };
}

/**
 * Analyze multiple small files in a SINGLE LLM request.
 * Returns one FileContext per file.
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

  const systemPrompt = buildSystemPrompt();

  // Build a combined prompt with all files
  const fileSections = fileNodes.map((node) => {
    const content = fs.readFileSync(node.absolutePath, 'utf-8');
    const depCtx = buildDependencyContext(node, graph);
    const depNote = depCtx ? `\nDependencies: ${depCtx}` : '';
    return [
      `### FILE: ${node.path}`,
      `Language: ${node.language}${depNote}`,
      '```' + node.language,
      content,
      '```',
    ].join('\n');
  });

  const paths = fileNodes.map((n) => n.path);

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
    `Analyze these ${fileNodes.length} source files and return ONE JSON object with exactly ${fileNodes.length} top-level key${fileNodes.length > 1 ? 's' : ''}:`,
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

  const batchLabel = `batch [${fileNodes.map((n) => path.basename(n.path)).join(', ')}]`;

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
      // All retries failed — fall back to individual analysis
      logger.warn(
        `Batch returned no content for ${batchLabel}, falling back to individual analysis`,
      );
      return individualFallback(fileNodes, graph, llm, limiter, signal, MAX_CHUNK_CHARS, tracker);
    }

    const batchResult = parseBatchResponse(rawContent, fileNodes, graph);
    if (batchResult === null) {
      logger.warn(
        `Batch parse failed for ${batchLabel}, falling back to individual analysis`,
      );
      return individualFallback(fileNodes, graph, llm, limiter, signal, MAX_CHUNK_CHARS, tracker);
    }
    return batchResult;
  } catch (e) {
    if ((e as Error).name === 'AbortError') {
      throw e;
    } // propagate cancellation
    // Context-size exceeded or other hard error — fall back to individual files
    logger.warn(
      `Batch failed (${e instanceof Error ? e.message.slice(0, 80) : e}), analyzing files individually`,
    );
    return individualFallback(fileNodes, graph, llm, limiter, signal, MAX_CHUNK_CHARS, tracker);
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
      results.push(
        await analyzeFile(node, graph, llm, limiter, signal, maxChunkChars, tracker),
      );
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
): Promise<ChunkResult> {
  const chunkLabel =
    chunkNum && totalChunks ? ` (chunk ${chunkNum}/${totalChunks})` : '';
  const depSection = depContext ? `\n\nDependencies: ${depContext}` : '';
  const overviewField = includeOverview
    ? '"overview": "<2-3 sentence description of this file\'s purpose and role>",'
    : '"overview": "",';

  const userPrompt = [
    'OUTPUT ONLY A SINGLE RAW JSON OBJECT — nothing else.',
    'Your entire response MUST start with { and end with }.',
    'Do NOT use markdown code fences. Do NOT add any text, explanation, or preamble before or after the JSON.',
    '',
    `Analyze this ${fileNode.language} file: ${fileNode.path}${chunkLabel}${depSection}`,
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

function buildDependencyContext(
  fileNode: FileNode,
  graph: DependencyGraph,
): string {
  if (fileNode.imports.length === 0) {
    return '';
  }
  const lines: string[] = [];
  for (const dep of fileNode.imports.slice(0, 5)) {
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
