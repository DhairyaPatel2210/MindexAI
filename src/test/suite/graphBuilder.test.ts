import * as assert from 'assert';
import * as path from 'path';
import { extractSymbolsFromContent, extractImports } from '../../core/analyzer/graphBuilder';
import type { FileNode } from '../../core/analyzer/graphBuilder';

suite('GraphBuilder — extractSymbolsFromContent', () => {

  // ── TypeScript / JavaScript ─────────────────────────────────────────────────

  test('TS: detects exported function', () => {
    const code = `export async function fetchUser(id: string): Promise<User> {\n  return db.find(id);\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/api.ts');
    assert.ok(symbols.some(s => s.name === 'fetchUser' && s.kind === 'function'),
      'Should find fetchUser function');
  });

  test('TS: detects exported class', () => {
    const code = `export class UserService {\n  constructor() {}\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/UserService.ts');
    assert.ok(symbols.some(s => s.name === 'UserService' && s.kind === 'class'),
      'Should find UserService class');
  });

  test('TS: detects interface', () => {
    const code = `export interface IRepository<T> {\n  findById(id: string): Promise<T>;\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/types.ts');
    assert.ok(symbols.some(s => s.name === 'IRepository' && s.kind === 'interface'),
      'Should find IRepository interface');
  });

  test('TS: detects type alias', () => {
    const code = `export type UserId = string;`;
    const symbols = extractSymbolsFromContent(code, 'src/types.ts');
    assert.ok(symbols.some(s => s.name === 'UserId' && s.kind === 'type'),
      'Should find UserId type alias');
  });

  test('TS: detects enum', () => {
    const code = `export enum Status {\n  Active = 'active',\n  Inactive = 'inactive',\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/enums.ts');
    assert.ok(symbols.some(s => s.name === 'Status' && s.kind === 'enum'),
      'Should find Status enum');
  });

  test('TS: detects const export', () => {
    const code = `export const MAX_RETRIES = 3;\nexport const baseUrl: string = 'https://api.example.com';`;
    const symbols = extractSymbolsFromContent(code, 'src/config.ts');
    assert.ok(symbols.some(s => s.name === 'MAX_RETRIES' && s.kind === 'const'),
      'Should find MAX_RETRIES');
    assert.ok(symbols.some(s => s.name === 'baseUrl' && s.kind === 'const'),
      'Should find baseUrl');
  });

  test('TS: ignores Python/Go/Rust patterns', () => {
    const tsCode = `export function greet() {}\n// this is TS\n`;
    const symbols = extractSymbolsFromContent(tsCode, 'src/hello.ts');
    // Should not match Python "def greet" or Go "func greet"
    assert.ok(!symbols.some(s => s.kind === 'function' && s.name === 'def'),
      'Should not have false "def" symbol');
  });

  // ── Python ──────────────────────────────────────────────────────────────────

  test('Python: detects top-level function', () => {
    const code = `def process_request(req):\n    return req.json()`;
    const symbols = extractSymbolsFromContent(code, 'src/handler.py');
    assert.ok(symbols.some(s => s.name === 'process_request' && s.kind === 'function'),
      'Should find process_request');
  });

  test('Python: detects class', () => {
    const code = `class DatabaseManager(BaseManager):\n    def __init__(self): pass`;
    const symbols = extractSymbolsFromContent(code, 'src/db.py');
    assert.ok(symbols.some(s => s.name === 'DatabaseManager' && s.kind === 'class'),
      'Should find DatabaseManager');
  });

  test('Python: detects method inside class', () => {
    const code = `class Foo:\n    def bar(self, x):\n        return x`;
    const symbols = extractSymbolsFromContent(code, 'src/foo.py');
    assert.ok(symbols.some(s => s.name === 'bar' && s.kind === 'method'),
      'Should find bar method');
  });

  // ── Go ──────────────────────────────────────────────────────────────────────

  test('Go: detects function', () => {
    const code = `func ServeHTTP(w http.ResponseWriter, r *http.Request) {\n}`;
    const symbols = extractSymbolsFromContent(code, 'server/handler.go');
    assert.ok(symbols.some(s => s.name === 'ServeHTTP' && s.kind === 'function'),
      'Should find ServeHTTP');
  });

  test('Go: detects receiver method', () => {
    const code = `func (s *Server) ListenAndServe(addr string) error {\n  return nil\n}`;
    const symbols = extractSymbolsFromContent(code, 'server/server.go');
    assert.ok(symbols.some(s => s.name === 'ListenAndServe' && s.kind === 'method'),
      'Should find ListenAndServe method');
  });

  test('Go: detects struct', () => {
    const code = `type Config struct {\n  Port int\n  Host string\n}`;
    const symbols = extractSymbolsFromContent(code, 'config/config.go');
    assert.ok(symbols.some(s => s.name === 'Config' && s.kind === 'struct'),
      'Should find Config struct');
  });

  // ── Rust ────────────────────────────────────────────────────────────────────

  test('Rust: detects public function', () => {
    const code = `pub fn parse_config(input: &str) -> Result<Config> {\n  todo!()\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/config.rs');
    assert.ok(symbols.some(s => s.name === 'parse_config' && s.kind === 'function'),
      'Should find parse_config');
  });

  test('Rust: detects struct', () => {
    const code = `pub struct AppState {\n  pub db: Pool,\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/state.rs');
    assert.ok(symbols.some(s => s.name === 'AppState' && s.kind === 'struct'),
      'Should find AppState');
  });

  test('Rust: detects trait', () => {
    const code = `pub trait Repository {\n  fn find(&self, id: u64) -> Option<Item>;\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/repo.rs');
    assert.ok(symbols.some(s => s.name === 'Repository' && s.kind === 'trait'),
      'Should find Repository trait');
  });

  // ── Java ────────────────────────────────────────────────────────────────────

  test('Java: detects public class', () => {
    const code = `package com.example;\n\npublic class UserController {\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/main/java/com/example/UserController.java');
    assert.ok(symbols.some(s => s.name === 'UserController' && s.kind === 'class'),
      'Should find UserController class');
  });

  test('Java: detects abstract class', () => {
    const code = `public abstract class BaseService {\n  public abstract void init();\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/main/java/BaseService.java');
    assert.ok(symbols.some(s => s.name === 'BaseService' && s.kind === 'class'),
      'Should find BaseService abstract class');
  });

  test('Java: detects interface', () => {
    const code = `public interface UserRepository {\n  User findById(Long id);\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/UserRepository.java');
    assert.ok(symbols.some(s => s.name === 'UserRepository' && s.kind === 'interface'),
      'Should find UserRepository interface');
  });

  test('Java: detects enum', () => {
    const code = `public enum OrderStatus {\n  PENDING, PROCESSING, SHIPPED, DELIVERED\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/OrderStatus.java');
    assert.ok(symbols.some(s => s.name === 'OrderStatus' && s.kind === 'enum'),
      'Should find OrderStatus enum');
  });

  test('Java: detects annotation type', () => {
    const code = `public @interface RestController {\n  String value() default "";\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/RestController.java');
    assert.ok(symbols.some(s => s.name === 'RestController' && s.kind === 'annotation'),
      'Should find RestController annotation');
  });

  test('Java: detects public method', () => {
    const code = `public class Foo {\n    public String getName(int id) throws Exception {\n        return "foo";\n    }\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/Foo.java');
    assert.ok(symbols.some(s => s.name === 'getName' && s.kind === 'method'),
      'Should find getName method');
  });

  test('Java: detects private method', () => {
    const code = `public class Bar {\n    private void doWork() {\n    }\n}`;
    const symbols = extractSymbolsFromContent(code, 'src/Bar.java');
    assert.ok(symbols.some(s => s.name === 'doWork' && s.kind === 'method'),
      'Should find doWork private method');
  });

  test('Java: does not match TS/JS patterns', () => {
    const javaCode = `public class Greeter {\n    public void greet() {}\n}`;
    const symbols = extractSymbolsFromContent(javaCode, 'Greeter.java');
    // Should not match TypeScript "export function" pattern — no "export" keyword in Java
    assert.ok(!symbols.some(s => s.kind === 'function'),
      'Java file should not match TS function pattern');
  });
});

// ── extractImports ──────────────────────────────────────────────────────────

suite('GraphBuilder — extractImports', () => {
  const workspaceRoot = '/workspace';

  function makeFiles(paths: string[]): Record<string, FileNode> {
    const result: Record<string, FileNode> = {};
    for (const p of paths) {
      result[p] = {
        path: p, absolutePath: path.join(workspaceRoot, p),
        language: 'unknown', sizeBytes: 0, symbols: [], imports: [], importedBy: [],
      };
    }
    return result;
  }

  test('TS: resolves relative import', () => {
    const allFiles = makeFiles([
      'src/utils/helpers.ts',
      'src/services/api.ts',
    ]);
    const code = `import { helper } from '../utils/helpers';`;
    const imports = extractImports(code, 'src/services/api.ts', workspaceRoot, allFiles);
    assert.deepStrictEqual(imports, ['src/utils/helpers.ts'],
      'Should resolve ../utils/helpers to src/utils/helpers.ts');
  });

  test('TS: resolves same-directory import', () => {
    const allFiles = makeFiles(['src/config.ts', 'src/index.ts']);
    const code = `import { Config } from './config';`;
    const imports = extractImports(code, 'src/index.ts', workspaceRoot, allFiles);
    assert.deepStrictEqual(imports, ['src/config.ts']);
  });

  test('TS: ignores non-relative imports (node_modules)', () => {
    const allFiles = makeFiles(['src/app.ts']);
    const code = `import express from 'express';\nimport * as fs from 'fs';`;
    const imports = extractImports(code, 'src/app.ts', workspaceRoot, allFiles);
    assert.strictEqual(imports.length, 0, 'Should not resolve node_modules imports');
  });

  test('Java: resolves fully-qualified class import', () => {
    const allFiles = makeFiles([
      'src/main/java/com/example/UserService.java',
      'src/main/java/com/example/controller/UserController.java',
    ]);
    const code = `import com.example.UserService;`;
    const imports = extractImports(
      code,
      'src/main/java/com/example/controller/UserController.java',
      workspaceRoot,
      allFiles
    );
    assert.deepStrictEqual(
      imports,
      ['src/main/java/com/example/UserService.java'],
      'Should resolve Java class import to file path'
    );
  });

  test('Java: ignores wildcard imports', () => {
    const allFiles = makeFiles(['src/main/java/com/example/Foo.java']);
    const code = `import com.example.*;`;
    const imports = extractImports(code, 'src/Foo.java', workspaceRoot, allFiles);
    assert.strictEqual(imports.length, 0, 'Wildcard imports should be ignored');
  });

  test('Java: ignores java.lang and javax imports with no matching file', () => {
    const allFiles = makeFiles(['src/main/java/MyClass.java']);
    const code = `import java.util.List;\nimport javax.inject.Inject;`;
    const imports = extractImports(code, 'src/main/java/MyClass.java', workspaceRoot, allFiles);
    assert.strictEqual(imports.length, 0, 'Standard library imports with no matching file should be ignored');
  });

  test('Python: resolves relative import', () => {
    const allFiles = makeFiles(['app/utils.py', 'app/views.py']);
    const code = `from .utils import helper\nfrom .utils import another`;
    const imports = extractImports(code, 'app/views.py', workspaceRoot, allFiles);
    assert.deepStrictEqual(imports, ['app/utils.py']);
  });

  test('deduplicates identical imports', () => {
    const allFiles = makeFiles(['src/shared.ts', 'src/main.ts']);
    const code = `import { A } from './shared';\nimport { B } from './shared';`;
    const imports = extractImports(code, 'src/main.ts', workspaceRoot, allFiles);
    assert.strictEqual(imports.length, 1, 'Should deduplicate imports from same file');
  });
});
