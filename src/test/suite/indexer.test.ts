import * as assert from 'assert';
import { buildIndex, extractMeaningfulWords } from '../../core/analyzer/indexer';
import type { SemanticIndex } from '../../core/analyzer/indexer';
import type { FileContext } from '../../core/analyzer/fileAnalyzer';
import type { DependencyGraph } from '../../core/analyzer/graphBuilder';
import * as path from 'path';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeContext(relativePath: string, overrides: Partial<FileContext> = {}): FileContext {
  return {
    relativePath,
    language: 'TypeScript',
    overview: `Overview of ${relativePath}`,
    symbols: [],
    dependencies: [],
    analyzedAt: new Date().toISOString(),
    chunkCount: 1,
    ...overrides,
  };
}

function makeGraph(files: string[], workspaceRoot = '/workspace'): DependencyGraph {
  const fileNodes: DependencyGraph['files'] = {};
  for (const f of files) {
    fileNodes[f] = {
      path: f,
      absolutePath: path.join(workspaceRoot, f),
      language: 'TypeScript',
      sizeBytes: 100,
      symbols: [],
      imports: [],
      importedBy: [],
    };
  }
  return {
    version: '1.0',
    generatedAt: new Date().toISOString(),
    workspaceRoot,
    stats: { totalFiles: files.length, totalSymbols: 0, totalEdges: 0 },
    files: fileNodes,
  };
}

// ─── buildIndex ───────────────────────────────────────────────────────────────

suite('indexer — buildIndex', () => {
  test('basic index structure is correct', () => {
    const files = ['src/app.ts', 'src/utils.ts'];
    const contexts = files.map(f => makeContext(f));
    const graph = makeGraph(files);

    const index = buildIndex(contexts, graph);

    assert.strictEqual(index.version, '1.0');
    assert.ok(index.generatedAt, 'Should have generatedAt');
    assert.strictEqual(index.totalFiles, 2);
    assert.ok(index.files['src/app.ts'], 'Should have app.ts in files');
    assert.ok(index.files['src/utils.ts'], 'Should have utils.ts in files');
  });

  test('counts symbols correctly', () => {
    const ctx = makeContext('src/service.ts', {
      symbols: [
        { name: 'ServiceA', kind: 'class', line: 1, purpose: 'A class', behavior: 'Does A' },
        { name: 'methodB',  kind: 'method', line: 10, purpose: 'A method', behavior: 'Does B' },
      ],
    });
    const graph = makeGraph(['src/service.ts']);

    const index = buildIndex([ctx], graph);
    assert.strictEqual(index.totalSymbols, 2);
  });

  test('symbol collision: same name in two files → array of two entries', () => {
    const ctx1 = makeContext('src/a.ts', {
      symbols: [{ name: 'Logger', kind: 'class', line: 1, purpose: 'Logs in A', behavior: 'Writes to stdout' }],
    });
    const ctx2 = makeContext('src/b.ts', {
      symbols: [{ name: 'Logger', kind: 'class', line: 5, purpose: 'Logs in B', behavior: 'Writes to file' }],
    });
    const graph = makeGraph(['src/a.ts', 'src/b.ts']);

    const index = buildIndex([ctx1, ctx2], graph);
    const loggerEntries = index.symbols['Logger'];
    assert.ok(Array.isArray(loggerEntries), 'Should be an array');
    assert.strictEqual(loggerEntries.length, 2, 'Should have two entries for Logger');
    const files = loggerEntries.map(e => e.file);
    assert.ok(files.includes('src/a.ts'));
    assert.ok(files.includes('src/b.ts'));
  });

  test('file entry includes correct overview and language', () => {
    const ctx = makeContext('src/config.ts', {
      language: 'TypeScript',
      overview: 'Manages application configuration',
    });
    const graph = makeGraph(['src/config.ts']);

    const index = buildIndex([ctx], graph);
    const fileEntry = index.files['src/config.ts'];
    assert.ok(fileEntry);
    assert.strictEqual(fileEntry.language, 'TypeScript');
    assert.strictEqual(fileEntry.overview, 'Manages application configuration');
  });

  test('file entry includes importedBy from graph', () => {
    const files = ['src/a.ts', 'src/b.ts'];
    const graph = makeGraph(files);
    graph.files['src/b.ts'].importedBy = ['src/a.ts'];

    const contexts = files.map(f => makeContext(f));
    const index = buildIndex(contexts, graph);

    assert.deepStrictEqual(index.files['src/b.ts'].importedBy, ['src/a.ts']);
  });

  test('keyword index populated from symbol purpose and behavior', () => {
    const ctx = makeContext('src/auth.ts', {
      symbols: [{
        name: 'verifyToken',
        kind: 'function',
        line: 20,
        purpose: 'Validates JWT authentication tokens',
        behavior: 'Decodes and verifies signature',
      }],
    });
    const graph = makeGraph(['src/auth.ts']);
    const index = buildIndex([ctx], graph);

    // 'validates', 'jwt', 'authentication', 'tokens' should all be in keywords
    assert.ok(index.keywords['validates'] || index.keywords['jwt'] || index.keywords['authentication'],
      'Should populate keyword index from symbol descriptions');
  });

  test('handles empty file context list', () => {
    const graph = makeGraph([]);
    const index = buildIndex([], graph);
    assert.strictEqual(index.totalFiles, 0);
    assert.strictEqual(index.totalSymbols, 0);
  });

  test('symbol entry references contextFile', () => {
    const ctx = makeContext('src/foo.ts', {
      symbols: [{ name: 'doFoo', kind: 'function', line: 1, purpose: 'Does foo', behavior: 'Runs foo' }],
    });
    const graph = makeGraph(['src/foo.ts']);
    const index = buildIndex([ctx], graph);

    const entry = index.symbols['doFoo']?.[0];
    assert.ok(entry, 'Should have doFoo entry');
    assert.ok(entry.contextFile.includes('foo.ts'), 'contextFile should reference foo.ts');
  });
});

// ─── extractMeaningfulWords ───────────────────────────────────────────────────

suite('indexer — extractMeaningfulWords', () => {
  test('extracts words from plain text', () => {
    const words = extractMeaningfulWords('Validates user authentication tokens');
    assert.ok(words.includes('validates'), 'Should include validates');
    assert.ok(words.includes('user'), 'Should include user');
    assert.ok(words.includes('authentication'), 'Should include authentication');
    assert.ok(words.includes('tokens'), 'Should include tokens');
  });

  test('filters stop words', () => {
    const words = extractMeaningfulWords('the function is a helper for the user');
    assert.ok(!words.includes('the'), 'Should filter "the"');
    assert.ok(!words.includes('is'), 'Should filter "is"');
    assert.ok(!words.includes('a'), 'Should filter "a"');
    assert.ok(!words.includes('for'), 'Should filter "for"');
    assert.ok(words.includes('function'), 'Should keep "function"');
    assert.ok(words.includes('helper'), 'Should keep "helper"');
    assert.ok(words.includes('user'), 'Should keep "user"');
  });

  test('filters short words (length < 3)', () => {
    const words = extractMeaningfulWords('do it now ok');
    assert.ok(!words.includes('do'), 'Should filter 2-char word "do"');
    assert.ok(!words.includes('it'), 'Should filter 2-char word "it"');
    assert.ok(!words.includes('ok'), 'Should filter 2-char word "ok"');
  });

  test('deduplicates words', () => {
    const words = extractMeaningfulWords('database database connection database');
    assert.strictEqual(words.filter(w => w === 'database').length, 1, 'Should deduplicate');
  });

  test('handles camelCase symbol names', () => {
    const words = extractMeaningfulWords('fetchUserData');
    // camelCase isn't split but the lowercased token should appear
    assert.ok(words.includes('fetchuserdata') || words.includes('fetchUserData'.toLowerCase()),
      'Should handle camelCase');
  });

  test('handles empty string', () => {
    const words = extractMeaningfulWords('');
    assert.deepStrictEqual(words, []);
  });

  test('converts to lowercase', () => {
    const words = extractMeaningfulWords('Authentication Token Validation');
    assert.ok(words.includes('authentication'));
    assert.ok(words.includes('token'));
    assert.ok(words.includes('validation'));
    assert.ok(!words.includes('Authentication'), 'Should not preserve original case');
  });
});
