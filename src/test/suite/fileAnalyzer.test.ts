import * as assert from 'assert';
import {
  extractJson,
  normalizeSymbols,
  renderContextMarkdown,
  partitionForBatching,
  extractSemanticChunks,
  packChunksForAnalysis,
  isTrivialFile,
  BATCH_SIZE_THRESHOLD_BYTES,
  FileContext,
  SemanticChunk,
  SemanticChunkResult,
} from '../../core/analyzer/fileAnalyzer';
import type { FileNode, DependencyGraph, SymbolEntry } from '../../core/analyzer/graphBuilder';

// ── extractJson ───────────────────────────────────────────────────────────────

suite('fileAnalyzer — extractJson', () => {
  test('parses clean JSON object', () => {
    const raw = '{"overview":"A helper module","symbols":[]}';
    const result = extractJson<{ overview: string }>(raw);
    assert.ok(result, 'Should parse valid JSON');
    assert.strictEqual(result!.overview, 'A helper module');
  });

  test('parses JSON with trailing text after closing brace', () => {
    const raw = '{"overview":"test","symbols":[{"name":"foo"}]}\n\nSome trailing text';
    const result = extractJson<{ overview: string; symbols: Array<{ name: string }> }>(raw);
    assert.ok(result, 'Should extract JSON even with trailing text');
    assert.strictEqual(result!.overview, 'test');
    assert.strictEqual(result!.symbols.length, 1);
  });

  test('strips markdown code fence ```json', () => {
    const raw = '```json\n{"key":"value"}\n```';
    const result = extractJson<{ key: string }>(raw);
    assert.ok(result, 'Should strip json code fence');
    assert.strictEqual(result!.key, 'value');
  });

  test('strips markdown code fence ``` (no lang)', () => {
    const raw = '```\n{"key":"value"}\n```';
    const result = extractJson<{ key: string }>(raw);
    assert.ok(result, 'Should strip bare code fence');
    assert.strictEqual(result!.key, 'value');
  });

  test('extracts JSON from LLM prose prefix', () => {
    const raw = 'Here is the analysis:\n\n{"overview":"Auth module","symbols":[]}';
    const result = extractJson<{ overview: string }>(raw);
    assert.ok(result, 'Should extract JSON from prose with prefix');
    assert.strictEqual(result!.overview, 'Auth module');
  });

  test('handles nested objects', () => {
    const raw = '{"outer":{"inner":{"deep":true}}}';
    const result = extractJson<{ outer: { inner: { deep: boolean } } }>(raw);
    assert.ok(result);
    assert.strictEqual(result!.outer.inner.deep, true);
  });

  test('handles braces inside strings', () => {
    const raw = '{"code":"{this is not a brace}","name":"test"}';
    const result = extractJson<{ code: string; name: string }>(raw);
    assert.ok(result);
    assert.strictEqual(result!.code, '{this is not a brace}');
    assert.strictEqual(result!.name, 'test');
  });

  test('handles escaped quotes in strings', () => {
    const raw = '{"msg":"He said \\"hello\\""}';
    const result = extractJson<{ msg: string }>(raw);
    assert.ok(result);
    assert.strictEqual(result!.msg, 'He said "hello"');
  });

  test('returns null for empty string', () => {
    assert.strictEqual(extractJson(''), null);
  });

  test('returns null when no JSON object found', () => {
    const result = extractJson('This is just plain text with no JSON');
    assert.strictEqual(result, null);
  });

  test('returns null for invalid/truncated JSON', () => {
    const result = extractJson('{"truncated":');
    assert.strictEqual(result, null);
  });

  test('parses JSON array wrapped in object', () => {
    const raw = '{"symbols":[{"name":"foo","kind":"function"},{"name":"Bar","kind":"class"}]}';
    type R = { symbols: Array<{ name: string; kind: string }> };
    const result = extractJson<R>(raw);
    assert.ok(result);
    assert.strictEqual(result!.symbols.length, 2);
    assert.strictEqual(result!.symbols[0].name, 'foo');
  });
});

// ── normalizeSymbols ──────────────────────────────────────────────────────────

suite('fileAnalyzer — normalizeSymbols', () => {
  test('normalizes complete symbol', () => {
    const raw = [{
      name: 'fetchData',
      kind: 'function',
      line: 42,
      purpose: 'Fetches remote data',
      behavior: 'Makes HTTP GET request',
      parameters: 'url (string)',
      returns: 'Promise<Response>',
      limitations: 'No timeout configured',
    }];
    const result = normalizeSymbols(raw);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].name, 'fetchData');
    assert.strictEqual(result[0].kind, 'function');
    assert.strictEqual(result[0].line, 42);
    assert.strictEqual(result[0].purpose, 'Fetches remote data');
  });

  test('fills in defaults for missing fields', () => {
    const result = normalizeSymbols([{}]);
    assert.strictEqual(result[0].name, 'unknown');
    assert.strictEqual(result[0].kind, 'unknown');
    assert.strictEqual(result[0].line, 0);
    assert.strictEqual(result[0].purpose, '');
    assert.strictEqual(result[0].behavior, '');
  });

  test('handles array with multiple symbols', () => {
    const raw = [
      { name: 'Alpha', kind: 'class', line: 1, purpose: 'p1', behavior: 'b1' },
      { name: 'beta', kind: 'function', line: 10, purpose: 'p2', behavior: 'b2' },
    ];
    const result = normalizeSymbols(raw);
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[1].name, 'beta');
  });

  test('returns empty array for empty input', () => {
    assert.deepStrictEqual(normalizeSymbols([]), []);
  });

  test('preserves optional fields when present', () => {
    const raw = [{
      name: 'x', kind: 'function', line: 1,
      purpose: 'p', behavior: 'b',
      parameters: 'a: string',
      returns: 'void',
      limitations: 'none',
    }];
    const result = normalizeSymbols(raw);
    assert.strictEqual(result[0].parameters, 'a: string');
    assert.strictEqual(result[0].returns, 'void');
    assert.strictEqual(result[0].limitations, 'none');
  });
});

// ── renderContextMarkdown ─────────────────────────────────────────────────────

suite('fileAnalyzer — renderContextMarkdown', () => {
  function makeCtx(overrides: Partial<FileContext> = {}): FileContext {
    return {
      relativePath: 'src/app.ts',
      language: 'TypeScript',
      overview: 'Entry point for the application',
      symbols: [],
      dependencies: [],
      analyzedAt: '2025-01-01T00:00:00.000Z',
      chunkCount: 1,
      ...overrides,
    };
  }

  test('includes file path as heading', () => {
    const md = renderContextMarkdown(makeCtx());
    assert.ok(md.includes('# src/app.ts'), 'Should include file path as h1');
  });

  test('includes language', () => {
    const md = renderContextMarkdown(makeCtx({ language: 'Python' }));
    assert.ok(md.includes('Python'), 'Should include language');
  });

  test('includes overview', () => {
    const md = renderContextMarkdown(makeCtx({ overview: 'This is the entry point' }));
    assert.ok(md.includes('This is the entry point'), 'Should include overview text');
  });

  test('includes symbol names', () => {
    const ctx = makeCtx({
      symbols: [{
        name: 'processRequest',
        kind: 'function',
        line: 10,
        purpose: 'Handles incoming requests',
        behavior: 'Validates and dispatches',
      }],
    });
    const md = renderContextMarkdown(ctx);
    assert.ok(md.includes('processRequest'), 'Should include symbol name');
    assert.ok(md.includes('function'), 'Should include symbol kind');
  });

  test('includes dependencies', () => {
    const ctx = makeCtx({ dependencies: ['src/utils.ts', 'src/config.ts'] });
    const md = renderContextMarkdown(ctx);
    assert.ok(md.includes('src/utils.ts') || md.includes('Dependencies'),
      'Should mention dependencies');
  });

  test('shows failure notice for empty context', () => {
    const ctx = makeCtx({ overview: '', symbols: [], chunkCount: 0 });
    const md = renderContextMarkdown(ctx);
    assert.ok(
      md.includes('Analysis failed') || md.includes('could not be processed'),
      'Should indicate analysis failure for empty context'
    );
  });

  test('returns a non-empty string', () => {
    const md = renderContextMarkdown(makeCtx());
    assert.ok(md.length > 10, 'Should produce meaningful output');
  });
});

// ── partitionForBatching ──────────────────────────────────────────────────────

suite('fileAnalyzer — partitionForBatching', () => {
  function makeNode(sizeBytes: number, name = 'file.ts'): FileNode {
    return {
      path: name,
      absolutePath: `/workspace/${name}`,
      language: 'TypeScript',
      sizeBytes,
      symbols: [],
      imports: [],
      importedBy: [],
    };
  }

  test('separates small and large files', () => {
    const small = makeNode(BATCH_SIZE_THRESHOLD_BYTES - 1, 'small.ts');
    const large = makeNode(BATCH_SIZE_THRESHOLD_BYTES + 1, 'large.ts');
    const { batches, large: largeFiles } = partitionForBatching([small, large]);
    assert.ok(batches.some(batch => batch.includes(small)), 'Small file should be in a batch');
    assert.ok(largeFiles.includes(large), 'Large file should be in large list');
  });

  test('groups small files into batches of 6', () => {
    const files = Array.from({ length: 13 }, (_, i) =>
      makeNode(100, `file${i}.ts`)
    );
    const { batches, large } = partitionForBatching(files);
    assert.strictEqual(large.length, 0, 'No large files');
    // 13 files → batches of 6: [6, 6, 1]
    assert.strictEqual(batches.length, 3, 'Should have 3 batches');
    assert.strictEqual(batches[0].length, 6);
    assert.strictEqual(batches[1].length, 6);
    assert.strictEqual(batches[2].length, 1);
  });

  test('returns empty batches and large for empty input', () => {
    const { batches, large } = partitionForBatching([]);
    assert.strictEqual(batches.length, 0);
    assert.strictEqual(large.length, 0);
  });

  test('file exactly at threshold is treated as small', () => {
    const borderline = makeNode(BATCH_SIZE_THRESHOLD_BYTES, 'borderline.ts');
    const { batches, large } = partitionForBatching([borderline]);
    assert.strictEqual(batches.length, 1);
    assert.strictEqual(large.length, 0);
  });

  test('all large files go into large list', () => {
    const files = Array.from({ length: 5 }, (_, i) =>
      makeNode(1_000_000, `large${i}.ts`)
    );
    const { batches, large } = partitionForBatching(files);
    assert.strictEqual(batches.length, 0);
    assert.strictEqual(large.length, 5);
  });
});

// ── isTrivialFile ────────────────────────────────────────────────────────────

suite('fileAnalyzer — isTrivialFile', () => {
  function makeNode(opts: Partial<FileNode> = {}): FileNode {
    return {
      path: opts.path ?? 'src/empty.ts',
      absolutePath: opts.absolutePath ?? '/workspace/src/empty.ts',
      language: opts.language ?? 'TypeScript',
      sizeBytes: opts.sizeBytes ?? 0,
      symbols: opts.symbols ?? [],
      imports: opts.imports ?? [],
      importedBy: opts.importedBy ?? [],
    };
  }

  test('empty file is trivial', () => {
    assert.strictEqual(isTrivialFile(makeNode(), ''), true);
  });

  test('whitespace-only file is trivial', () => {
    assert.strictEqual(isTrivialFile(makeNode(), '   \n\n  \t  '), true);
  });

  test('small file with no symbols is trivial', () => {
    assert.strictEqual(isTrivialFile(makeNode(), 'export {};'), true);
  });

  test('file with symbols is NOT trivial even if small', () => {
    const node = makeNode({
      symbols: [{ name: 'foo', kind: 'function', line: 1 }],
    });
    assert.strictEqual(isTrivialFile(node, 'function foo() {}'), false);
  });

  test('large file with no symbols is NOT trivial', () => {
    const longContent = '/* ' + 'x'.repeat(200) + ' */';
    assert.strictEqual(isTrivialFile(makeNode(), longContent), false);
  });
});

// ── extractSemanticChunks ────────────────────────────────────────────────────

suite('fileAnalyzer — extractSemanticChunks', () => {
  function makeGraph(files: Record<string, Partial<FileNode>> = {}): DependencyGraph {
    const fullFiles: Record<string, FileNode> = {};
    for (const [p, partial] of Object.entries(files)) {
      fullFiles[p] = {
        path: p,
        absolutePath: `/workspace/${p}`,
        language: partial.language ?? 'TypeScript',
        sizeBytes: partial.sizeBytes ?? 100,
        symbols: partial.symbols ?? [],
        imports: partial.imports ?? [],
        importedBy: partial.importedBy ?? [],
      };
    }
    return {
      version: '1.0',
      generatedAt: new Date().toISOString(),
      workspaceRoot: '/workspace',
      stats: { totalFiles: Object.keys(fullFiles).length, totalSymbols: 0, totalEdges: 0 },
      files: fullFiles,
    };
  }

  function makeNode(opts: Partial<FileNode> = {}): FileNode {
    return {
      path: opts.path ?? 'src/app.ts',
      absolutePath: opts.absolutePath ?? '/workspace/src/app.ts',
      language: opts.language ?? 'TypeScript',
      sizeBytes: opts.sizeBytes ?? 500,
      symbols: opts.symbols ?? [],
      imports: opts.imports ?? [],
      importedBy: opts.importedBy ?? [],
    };
  }

  test('returns empty chunks for trivial file', () => {
    const node = makeNode({ sizeBytes: 10 });
    const graph = makeGraph();
    const { chunks } = extractSemanticChunks(node, '', graph);
    assert.strictEqual(chunks.length, 0);
  });

  test('returns single chunk for file with no symbols but substantial content', () => {
    const content = '/* ' + 'x'.repeat(200) + ' */';
    const node = makeNode({ sizeBytes: content.length });
    const graph = makeGraph();
    const { chunks } = extractSemanticChunks(node, content, graph);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0].symbolNames.length, 0);
  });

  test('creates one chunk per symbol', () => {
    const content = [
      'import { helper } from "./utils";',
      '',
      'function foo() {',
      '  return 1;',
      '}',
      '',
      'function bar() {',
      '  return helper();',
      '}',
    ].join('\n');

    const node = makeNode({
      symbols: [
        { name: 'foo', kind: 'function', line: 3 },
        { name: 'bar', kind: 'function', line: 7 },
      ],
      imports: ['src/utils.ts'],
    });

    const graph = makeGraph({
      'src/app.ts': node,
      'src/utils.ts': {
        symbols: [{ name: 'helper', kind: 'function', line: 1 }],
      },
    });

    const { preamble, chunks } = extractSemanticChunks(node, content, graph, 10_000);
    // Two symbols → two chunks (per-symbol)
    assert.strictEqual(chunks.length, 2);
    assert.deepStrictEqual(chunks[0].symbolNames, ['foo']);
    assert.deepStrictEqual(chunks[1].symbolNames, ['bar']);
    // Preamble is separate and contains the import
    assert.ok(preamble.includes('import { helper }'), 'Preamble should contain imports');
    // Chunk content does NOT contain preamble
    assert.ok(!chunks[0].content.includes('import { helper }'),
      'Chunk content should NOT include preamble');
    // 'bar' chunk references 'helper' from utils
    assert.ok(chunks[1].referencedSymbols.includes('helper'),
      'Should detect referenced symbol "helper" in bar chunk');
  });

  test('preamble is returned separately from chunk content', () => {
    const funcBody = '  const x = ' + '"a"'.repeat(100) + ';\n';
    const content = [
      'import { dep } from "./dep";',
      '',
      'function alpha() {',
      funcBody,
      '}',
      '',
      'function beta() {',
      funcBody,
      '}',
    ].join('\n');

    const node = makeNode({
      symbols: [
        { name: 'alpha', kind: 'function', line: 3 },
        { name: 'beta', kind: 'function', line: 7 },
      ],
    });

    const graph = makeGraph({ 'src/app.ts': node });

    const { preamble, chunks } = extractSemanticChunks(node, content, graph);
    assert.ok(preamble.includes('import { dep }'), 'Preamble should have imports');
    assert.strictEqual(chunks.length, 2, 'Two symbols → two chunks');
    assert.ok(chunks[0].symbolNames.includes('alpha'));
    assert.ok(chunks[1].symbolNames.includes('beta'));
  });

  test('each chunk has a unique contentHash', () => {
    const content = [
      'function foo() { return 1; }',
      'function bar() { return 2; }',
    ].join('\n');

    const node = makeNode({
      symbols: [
        { name: 'foo', kind: 'function', line: 1 },
        { name: 'bar', kind: 'function', line: 2 },
      ],
    });

    const graph = makeGraph({ 'src/app.ts': node });

    const { chunks } = extractSemanticChunks(node, content, graph);
    assert.strictEqual(chunks.length, 2);
    assert.notStrictEqual(chunks[0].contentHash, chunks[1].contentHash,
      'Different chunks should have different hashes');
  });

  test('attaches decorators to the symbol below', () => {
    const content = [
      'import { Injectable } from "./di";',
      '',
      '@Injectable()',
      'class MyService {',
      '  doWork() {}',
      '}',
    ].join('\n');

    const node = makeNode({
      symbols: [
        { name: 'MyService', kind: 'class', line: 4 },
      ],
    });

    const graph = makeGraph({ 'src/app.ts': node });

    const { chunks } = extractSemanticChunks(node, content, graph, 10_000);
    assert.strictEqual(chunks.length, 1);
    assert.ok(chunks[0].content.includes('@Injectable()'),
      'Chunk should include decorator above the symbol');
  });

  test('chunk IDs are deterministic', () => {
    const content = 'function foo() {}\nfunction bar() {}';
    const node = makeNode({
      path: 'src/test.ts',
      symbols: [
        { name: 'foo', kind: 'function', line: 1 },
        { name: 'bar', kind: 'function', line: 2 },
      ],
    });
    const graph = makeGraph({ 'src/test.ts': node });

    const { chunks } = extractSemanticChunks(node, content, graph, 10_000);
    assert.strictEqual(chunks[0].id, 'src/test.ts::chunk_0');
  });

  test('referencedSymbols only includes imported names actually used in chunk', () => {
    const content = [
      'import { used, unused } from "./dep";',
      '',
      'function process() {',
      '  return used();',
      '}',
    ].join('\n');

    const node = makeNode({
      symbols: [{ name: 'process', kind: 'function', line: 3 }],
      imports: ['src/dep.ts'],
    });

    const graph = makeGraph({
      'src/app.ts': node,
      'src/dep.ts': {
        symbols: [
          { name: 'used', kind: 'function', line: 1 },
          { name: 'unused', kind: 'function', line: 5 },
        ],
      },
    });

    const { chunks } = extractSemanticChunks(node, content, graph, 10_000);
    assert.ok(chunks[0].referencedSymbols.includes('used'),
      'Should include "used" in referencedSymbols');
    assert.ok(!chunks[0].referencedSymbols.includes('unused'),
      'Should NOT include "unused" in referencedSymbols');
  });
});

// ── packChunksForAnalysis ────────────────────────────────────────────────────

suite('fileAnalyzer — packChunksForAnalysis', () => {
  function makeGraph(files: Record<string, Partial<FileNode>> = {}): DependencyGraph {
    const fullFiles: Record<string, FileNode> = {};
    for (const [p, partial] of Object.entries(files)) {
      fullFiles[p] = {
        path: p, absolutePath: `/workspace/${p}`, language: 'TypeScript',
        sizeBytes: 100, symbols: [], imports: [], importedBy: [],
        ...partial,
      };
    }
    return {
      version: '1.0', generatedAt: '', workspaceRoot: '/workspace',
      stats: { totalFiles: 0, totalSymbols: 0, totalEdges: 0 },
      files: fullFiles,
    };
  }

  function makeChunk(name: string, contentLen: number): SemanticChunk {
    const content = name + ' '.repeat(Math.max(0, contentLen - name.length));
    return {
      id: `file::${name}`, filePath: 'file.ts', content,
      contentHash: `hash_${name}`, symbolNames: [name],
      referencedSymbols: [], startLine: 0, endLine: 0,
    };
  }

  function makeNode(): FileNode {
    return {
      path: 'file.ts', absolutePath: '/workspace/file.ts', language: 'TypeScript',
      sizeBytes: 1000, symbols: [], imports: [], importedBy: [],
    };
  }

  test('packs all small chunks into one group', () => {
    const chunks = [makeChunk('a', 10), makeChunk('b', 10), makeChunk('c', 10)];
    const groups = packChunksForAnalysis(chunks, '', makeNode(), makeGraph(), 10_000);
    assert.strictEqual(groups.length, 1, 'All small chunks should fit in one group');
    assert.strictEqual(groups[0].chunks.length, 3);
  });

  test('splits into multiple groups when chunks exceed budget', () => {
    const chunks = [makeChunk('a', 100), makeChunk('b', 100), makeChunk('c', 100)];
    // Budget = 150 chars, so only 1 chunk fits per group
    const groups = packChunksForAnalysis(chunks, '', makeNode(), makeGraph(), 150);
    assert.ok(groups.length >= 2, `Expected >= 2 groups, got ${groups.length}`);
  });

  test('fills gaps with smaller chunks (best-fit)', () => {
    // Chunks: large(80), small(10), large(80), small(10)
    // Budget = 100. Sequential would put large(80) alone, wasting 20 chars.
    // Best-fit should pack large(80) + small(10) together.
    const chunks = [
      makeChunk('large1', 80),
      makeChunk('small1', 10),
      makeChunk('large2', 80),
      makeChunk('small2', 10),
    ];
    const groups = packChunksForAnalysis(chunks, '', makeNode(), makeGraph(), 100);
    // With best-fit: group1=[large1, small1], group2=[large2, small2] → 2 groups
    // Without best-fit (sequential): group1=[large1], group2=[small1, large2?no], etc → more groups
    assert.strictEqual(groups.length, 2, 'Best-fit should pack into 2 groups');
  });

  test('preamble is included in combinedContent of each group', () => {
    const chunks = [makeChunk('fn', 10)];
    const preamble = 'import { x } from "./x";';
    const groups = packChunksForAnalysis(chunks, preamble, makeNode(), makeGraph(), 10_000);
    assert.ok(groups[0].combinedContent.includes(preamble),
      'Group combinedContent should start with preamble');
    assert.ok(groups[0].combinedContent.includes('fn'),
      'Group combinedContent should include chunk content');
  });

  test('returns empty array for no chunks', () => {
    const groups = packChunksForAnalysis([], '', makeNode(), makeGraph(), 10_000);
    assert.strictEqual(groups.length, 0);
  });
});

// ── renderContextMarkdown — trivial file ─────────────────────────────────────

suite('fileAnalyzer — renderContextMarkdown (trivial file)', () => {
  test('shows trivial file notice', () => {
    const ctx: FileContext = {
      relativePath: 'src/__init__.py',
      language: 'Python',
      overview: 'Trivial or empty file with no significant logic.',
      symbols: [],
      dependencies: [],
      analyzedAt: '2025-01-01T00:00:00.000Z',
      chunkCount: 0,
    };
    const md = renderContextMarkdown(ctx);
    assert.ok(md.includes('Trivial file'), 'Should show trivial file notice');
    assert.ok(!md.includes('Analysis failed'), 'Should NOT show analysis failed');
  });
});
