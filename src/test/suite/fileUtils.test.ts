import * as assert from 'assert';
import { sanitizeBranchName, chunkText, detectLanguage, getCodeAtlasDirForRoot } from '../../utils/fileUtils';
import * as path from 'path';

suite('fileUtils — sanitizeBranchName', () => {
  test('replaces forward slashes with double dash', () => {
    assert.strictEqual(sanitizeBranchName('feature/my-feature'), 'feature--my-feature');
  });

  test('handles multiple slashes', () => {
    assert.strictEqual(sanitizeBranchName('release/v1/beta'), 'release--v1--beta');
  });

  test('leaves branch names without slashes unchanged', () => {
    assert.strictEqual(sanitizeBranchName('main'), 'main');
    assert.strictEqual(sanitizeBranchName('my-feature-branch'), 'my-feature-branch');
  });

  test('handles empty string', () => {
    assert.strictEqual(sanitizeBranchName(''), '');
  });

  test('handles branch with leading slash', () => {
    assert.strictEqual(sanitizeBranchName('/hotfix'), '--hotfix');
  });
});

suite('fileUtils — chunkText', () => {
  test('returns single chunk for short text', () => {
    const text = 'Hello world';
    const chunks = chunkText(text, 1000);
    assert.strictEqual(chunks.length, 1);
    assert.strictEqual(chunks[0], text);
  });

  test('returns single chunk when text equals maxChars', () => {
    const text = 'a'.repeat(100);
    const chunks = chunkText(text, 100);
    assert.strictEqual(chunks.length, 1);
  });

  test('splits text that exceeds maxChars', () => {
    const text = 'a'.repeat(300);
    const chunks = chunkText(text, 100);
    assert.ok(chunks.length > 1, 'Should have more than one chunk');
    // All chunks should be <= maxChars
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 100, `Chunk length ${chunk.length} exceeds 100`);
    }
    // Joined chunks should equal original (no data loss)
    assert.strictEqual(chunks.join(''), text);
  });

  test('preserves text content across chunks', () => {
    const lines = Array.from({ length: 100 }, (_, i) => `line ${i}\n`);
    const text = lines.join('');
    const chunks = chunkText(text, 200);
    assert.strictEqual(chunks.join(''), text);
  });

  test('handles empty string', () => {
    const chunks = chunkText('', 100);
    // Either empty array or single empty chunk — both are valid
    assert.ok(chunks.length <= 1);
    if (chunks.length === 1) {
      assert.strictEqual(chunks[0], '');
    }
  });

  test('respects maxChars boundary', () => {
    const text = 'x'.repeat(250);
    const chunks = chunkText(text, 100);
    for (const chunk of chunks) {
      assert.ok(chunk.length <= 100, `Chunk exceeded 100 chars: ${chunk.length}`);
    }
  });
});

suite('fileUtils — detectLanguage', () => {
  const cases: Array<[string, string]> = [
    ['src/app.ts',       'TypeScript'],
    ['src/App.tsx',      'TypeScript'],
    ['src/index.js',     'JavaScript'],
    ['src/App.jsx',      'JavaScript'],
    ['app/main.py',      'Python'],
    ['main.go',          'Go'],
    ['src/lib.rs',       'Rust'],
    ['UserService.java', 'Java'],
    ['styles.css',       'CSS'],
    ['index.html',       'HTML'],
    ['README.md',        'Markdown'],
    ['config.json',      'JSON'],
    ['docker-compose.yml', 'YAML'],
    ['unknown.xyz',      'Unknown'],
  ];

  for (const [filePath, expected] of cases) {
    test(`${filePath} → ${expected}`, () => {
      const result = detectLanguage(filePath);
      assert.strictEqual(result, expected, `Expected ${expected} for ${filePath}`);
    });
  }
});

suite('fileUtils — getCodeAtlasDirForRoot', () => {
  test('returns .codeatlas under given root', () => {
    const root = '/home/user/myproject';
    const expected = path.join(root, '.codeatlas');
    assert.strictEqual(getCodeAtlasDirForRoot(root), expected);
  });

  test('handles Windows-style path', () => {
    const root = 'C:\\Users\\user\\project';
    const result = getCodeAtlasDirForRoot(root);
    assert.ok(result.startsWith('C:\\'), 'Should preserve drive letter');
    assert.ok(result.endsWith('.codeatlas'), 'Should end with .codeatlas');
  });

  test('does not depend on VSCode workspace', () => {
    // This should work without any VSCode context
    assert.doesNotThrow(() => getCodeAtlasDirForRoot('/some/path'));
  });
});
