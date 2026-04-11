import * as assert from 'assert';
import * as path from 'path';
import { resolveImportPaths } from '../../core/analyzer/graphBuilder';
import type { FileNode } from '../../core/analyzer/graphBuilder';

// ── resolveImportPaths ────────────────────────────────────────────────────────
// These tests focus on the pure path-resolution logic that converts raw import
// specifiers (as extracted by tree-sitter) into workspace-relative file paths.

suite('GraphBuilder — resolveImportPaths', () => {
  const workspaceRoot = '/workspace';

  function makeFiles(paths: string[]): Record<string, FileNode> {
    const result: Record<string, FileNode> = {};
    for (const p of paths) {
      result[p] = {
        path:         p,
        absolutePath: path.join(workspaceRoot, p),
        language:     'unknown',
        sizeBytes:    0,
        symbols:      [],
        imports:      [],
        importedBy:   [],
      };
    }
    return result;
  }

  // ── TypeScript / JavaScript ─────────────────────────────────────────────────

  test('TS: resolves relative import (parent directory)', () => {
    const allFiles = makeFiles(['src/utils/helpers.ts', 'src/services/api.ts']);
    const imports  = resolveImportPaths(
      ['../utils/helpers'],
      'src/services/api.ts',
      workspaceRoot,
      allFiles
    );
    assert.deepStrictEqual(imports, ['src/utils/helpers.ts']);
  });

  test('TS: resolves same-directory import', () => {
    const allFiles = makeFiles(['src/config.ts', 'src/index.ts']);
    const imports  = resolveImportPaths(
      ['./config'],
      'src/index.ts',
      workspaceRoot,
      allFiles
    );
    assert.deepStrictEqual(imports, ['src/config.ts']);
  });

  test('TS: resolves import with explicit extension', () => {
    const allFiles = makeFiles(['src/utils.ts', 'src/app.ts']);
    const imports  = resolveImportPaths(
      ['./utils.ts'],
      'src/app.ts',
      workspaceRoot,
      allFiles
    );
    assert.deepStrictEqual(imports, ['src/utils.ts']);
  });

  test('TS: resolves index file import', () => {
    const allFiles = makeFiles(['src/components/index.ts', 'src/app.ts']);
    const imports  = resolveImportPaths(
      ['./components'],
      'src/app.ts',
      workspaceRoot,
      allFiles
    );
    assert.deepStrictEqual(imports, ['src/components/index.ts']);
  });

  test('TS: ignores non-relative imports (node_modules)', () => {
    const allFiles = makeFiles(['src/app.ts']);
    const imports  = resolveImportPaths(
      ['express', 'fs', 'react'],
      'src/app.ts',
      workspaceRoot,
      allFiles
    );
    assert.strictEqual(imports.length, 0, 'Node_modules/stdlib imports should be ignored');
  });

  test('TS: deduplicates identical specifiers', () => {
    const allFiles = makeFiles(['src/shared.ts', 'src/main.ts']);
    const imports  = resolveImportPaths(
      ['./shared', './shared'],
      'src/main.ts',
      workspaceRoot,
      allFiles
    );
    assert.strictEqual(imports.length, 1, 'Duplicate specifiers should be collapsed');
  });

  test('JS: resolves require() path', () => {
    const allFiles = makeFiles(['lib/utils.js', 'lib/index.js']);
    const imports  = resolveImportPaths(
      ['./utils'],
      'lib/index.js',
      workspaceRoot,
      allFiles
    );
    assert.deepStrictEqual(imports, ['lib/utils.js']);
  });

  test('TSX: resolves .tsx file', () => {
    const allFiles = makeFiles(['src/Button.tsx', 'src/App.tsx']);
    const imports  = resolveImportPaths(
      ['./Button'],
      'src/App.tsx',
      workspaceRoot,
      allFiles
    );
    assert.deepStrictEqual(imports, ['src/Button.tsx']);
  });

  // ── Java ────────────────────────────────────────────────────────────────────

  test('Java: resolves fully-qualified class import', () => {
    const allFiles = makeFiles([
      'src/main/java/com/example/UserService.java',
      'src/main/java/com/example/controller/UserController.java',
    ]);
    const imports = resolveImportPaths(
      ['com.example.UserService'],
      'src/main/java/com/example/controller/UserController.java',
      workspaceRoot,
      allFiles
    );
    assert.deepStrictEqual(
      imports,
      ['src/main/java/com/example/UserService.java']
    );
  });

  test('Java: ignores wildcard imports', () => {
    const allFiles = makeFiles(['src/main/java/com/example/Foo.java']);
    const imports  = resolveImportPaths(
      ['com.example.*'],
      'src/Foo.java',
      workspaceRoot,
      allFiles
    );
    assert.strictEqual(imports.length, 0, 'Wildcard imports should be ignored');
  });

  test('Java: ignores java.lang imports with no matching workspace file', () => {
    const allFiles = makeFiles(['src/main/java/MyClass.java']);
    const imports  = resolveImportPaths(
      ['java.util.List', 'javax.inject.Inject'],
      'src/main/java/MyClass.java',
      workspaceRoot,
      allFiles
    );
    assert.strictEqual(imports.length, 0, 'Stdlib imports should be ignored');
  });

  // ── Python ──────────────────────────────────────────────────────────────────

  test('Python: resolves single-dot relative import', () => {
    const allFiles = makeFiles(['app/utils.py', 'app/views.py']);
    const imports  = resolveImportPaths(
      ['.utils'],
      'app/views.py',
      workspaceRoot,
      allFiles
    );
    assert.deepStrictEqual(imports, ['app/utils.py']);
  });

  test('Python: ignores absolute imports (stdlib / third-party)', () => {
    const allFiles = makeFiles(['app/views.py']);
    const imports  = resolveImportPaths(
      ['os', 'django.db.models', 'requests'],
      'app/views.py',
      workspaceRoot,
      allFiles
    );
    assert.strictEqual(imports.length, 0, 'Absolute Python imports should be ignored');
  });

  // ── Rust ────────────────────────────────────────────────────────────────────

  test('Rust: resolves crate-relative use path', () => {
    const allFiles = makeFiles(['src/utils.rs', 'src/main.rs']);
    const imports  = resolveImportPaths(
      ['crate::utils'],
      'src/main.rs',
      workspaceRoot,
      allFiles
    );
    assert.deepStrictEqual(imports, ['src/utils.rs']);
  });

  test('Rust: ignores standard library / external crate paths', () => {
    const allFiles = makeFiles(['src/main.rs']);
    const imports  = resolveImportPaths(
      ['std::collections::HashMap', 'serde::Serialize'],
      'src/main.rs',
      workspaceRoot,
      allFiles
    );
    assert.strictEqual(imports.length, 0, 'std/external crate paths should be ignored');
  });
});
