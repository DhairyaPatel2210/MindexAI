import * as assert from 'assert';
import {
  extractJson,
  normalizeSymbols,
  renderContextMarkdown,
  partitionForBatching,
  BATCH_SIZE_THRESHOLD_BYTES,
  FileContext,
} from '../../core/analyzer/fileAnalyzer';
import type { FileNode } from '../../core/analyzer/graphBuilder';

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
