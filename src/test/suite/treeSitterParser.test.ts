import * as assert from 'assert';
import { initTreeSitter, parseFile } from '../../core/analyzer/treeSitterParser';
import type { ParseResult } from '../../core/analyzer/treeSitterParser';

// tree-sitter WASM loading can take a few seconds on first run.
const INIT_TIMEOUT = 30_000;

suite('treeSitterParser', function () {
  // Increase suite-level timeout so WASM init doesn't cause failures.
  this.timeout(INIT_TIMEOUT);

  suiteSetup(async function () {
    this.timeout(INIT_TIMEOUT);
    await initTreeSitter();
  });

  // ── Helpers ─────────────────────────────────────────────────────────────────

  function symbols(result: ParseResult) { return result.symbols; }
  function imports(result: ParseResult) { return result.importPaths; }

  function hasSymbol(result: ParseResult, name: string, kind: string): boolean {
    return result.symbols.some(s => s.name === name && s.kind === kind);
  }

  // ── TypeScript ───────────────────────────────────────────────────────────────

  suite('TypeScript', () => {
    test('detects exported async function', () => {
      const r = parseFile(
        `export async function fetchUser(id: string): Promise<User> {\n  return db.find(id);\n}`,
        'src/api.ts'
      );
      assert.ok(hasSymbol(r, 'fetchUser', 'function'), 'fetchUser should be found as function');
    });

    test('detects non-exported function', () => {
      const r = parseFile(`function helper(x: number): number { return x + 1; }`, 'src/util.ts');
      assert.ok(hasSymbol(r, 'helper', 'function'));
    });

    test('detects class declaration', () => {
      const r = parseFile(`export class UserService {\n  constructor() {}\n}`, 'src/service.ts');
      assert.ok(hasSymbol(r, 'UserService', 'class'));
    });

    test('detects interface declaration', () => {
      const r = parseFile(
        `export interface IRepository<T> {\n  findById(id: string): Promise<T>;\n}`,
        'src/types.ts'
      );
      assert.ok(hasSymbol(r, 'IRepository', 'interface'));
    });

    test('detects type alias', () => {
      const r = parseFile(`export type UserId = string;`, 'src/types.ts');
      assert.ok(hasSymbol(r, 'UserId', 'type'));
    });

    test('detects enum declaration', () => {
      const r = parseFile(
        `export enum Status {\n  Active = 'active',\n  Inactive = 'inactive',\n}`,
        'src/enums.ts'
      );
      assert.ok(hasSymbol(r, 'Status', 'enum'));
    });

    test('detects arrow function assigned to const', () => {
      const r = parseFile(
        `export const processItems = async (items: string[]): Promise<void> => {\n  await Promise.all(items);\n};`,
        'src/processor.ts'
      );
      assert.ok(hasSymbol(r, 'processItems', 'function'));
    });

    test('detects function expression assigned to const', () => {
      const r = parseFile(
        `export const handler = function(req: Request): Response { return ok(); };`,
        'src/handler.ts'
      );
      assert.ok(hasSymbol(r, 'handler', 'function'));
    });

    test('detects class method', () => {
      const r = parseFile(
        `class Repo {\n  async findById(id: string): Promise<Item> {\n    return {} as Item;\n  }\n}`,
        'src/repo.ts'
      );
      assert.ok(hasSymbol(r, 'findById', 'method'));
    });

    test('detects private class method', () => {
      const r = parseFile(
        `class Service {\n  private validate(input: string): boolean {\n    return input.length > 0;\n  }\n}`,
        'src/svc.ts'
      );
      assert.ok(hasSymbol(r, 'validate', 'method'));
    });

    test('extracts ES6 import path', () => {
      const r = parseFile(
        `import { helper } from '../utils/helpers';\nimport type { Foo } from './types';`,
        'src/services/api.ts'
      );
      assert.ok(imports(r).includes('../utils/helpers'), 'Should find ../utils/helpers');
      assert.ok(imports(r).includes('./types'), 'Should find ./types');
    });

    test('extracts re-export path', () => {
      const r = parseFile(`export { Foo } from './foo';`, 'src/index.ts');
      assert.ok(imports(r).includes('./foo'));
    });

    test('extracts require() path', () => {
      const r = parseFile(
        `const utils = require('./utils');\nconst fs = require('fs');`,
        'src/app.ts'
      );
      assert.ok(imports(r).includes('./utils'), 'require relative path should be found');
    });

    test('does NOT capture require() of non-relative modules in resolved graph (raw path present)', () => {
      // Raw path is captured; filtering to relative-only happens in resolveImportPaths.
      const r = parseFile(`const fs = require('fs');`, 'src/app.ts');
      // 'fs' is a raw import — present in importPaths; resolution will filter it out.
      assert.ok(imports(r).includes('fs'), 'stdlib path is captured raw');
    });

    test('symbol line numbers are 1-based', () => {
      const r = parseFile(
        `// line 1\nexport function greet(): void {\n  console.log('hi');\n}`,
        'src/greet.ts'
      );
      const sym = symbols(r).find(s => s.name === 'greet');
      assert.ok(sym, 'greet should be found');
      assert.strictEqual(sym!.line, 2, 'greet starts on line 2');
    });
  });

  // ── TSX ──────────────────────────────────────────────────────────────────────

  suite('TSX', () => {
    test('detects functional React component (arrow fn)', () => {
      const r = parseFile(
        `import React from 'react';\n\nexport const Button = ({ label }: Props): JSX.Element => (\n  <button>{label}</button>\n);`,
        'src/Button.tsx'
      );
      assert.ok(hasSymbol(r, 'Button', 'function'));
    });

    test('detects interface in TSX file', () => {
      const r = parseFile(`interface Props { label: string; }`, 'src/Button.tsx');
      assert.ok(hasSymbol(r, 'Props', 'interface'));
    });

    test('extracts import path from TSX file', () => {
      const r = parseFile(
        `import { useCallback } from 'react';\nimport { helper } from './helper';`,
        'src/App.tsx'
      );
      assert.ok(imports(r).includes('./helper'));
    });
  });

  // ── JavaScript ───────────────────────────────────────────────────────────────

  suite('JavaScript', () => {
    test('detects function declaration', () => {
      const r = parseFile(`function greet(name) { return 'Hello ' + name; }`, 'src/greet.js');
      assert.ok(hasSymbol(r, 'greet', 'function'));
    });

    test('detects class declaration', () => {
      const r = parseFile(
        `class EventEmitter {\n  emit(event) { this.handlers[event]?.(); }\n}`,
        'lib/events.js'
      );
      assert.ok(hasSymbol(r, 'EventEmitter', 'class'));
    });

    test('detects class method', () => {
      const r = parseFile(
        `class EventEmitter {\n  emit(event) { }\n  on(event, fn) { }\n}`,
        'lib/events.js'
      );
      assert.ok(hasSymbol(r, 'emit', 'method'));
      assert.ok(hasSymbol(r, 'on', 'method'));
    });

    test('detects arrow function as const', () => {
      const r = parseFile(`const add = (a, b) => a + b;`, 'lib/math.js');
      assert.ok(hasSymbol(r, 'add', 'function'));
    });

    test('extracts require() import path', () => {
      const r = parseFile(
        `const path = require('path');\nconst utils = require('./utils');`,
        'lib/index.js'
      );
      assert.ok(imports(r).includes('./utils'));
    });
  });

  // ── Python ───────────────────────────────────────────────────────────────────

  suite('Python', () => {
    test('detects top-level function', () => {
      const r = parseFile(`def process_request(req):\n    return req.json()`, 'app/handler.py');
      assert.ok(hasSymbol(r, 'process_request', 'function'));
    });

    test('detects class declaration', () => {
      const r = parseFile(
        `class DatabaseManager(BaseManager):\n    def __init__(self): pass`,
        'app/db.py'
      );
      assert.ok(hasSymbol(r, 'DatabaseManager', 'class'));
    });

    test('detects method inside class (kind is method, not function)', () => {
      const r = parseFile(
        `class Repo:\n    def find(self, id):\n        return self.db.get(id)`,
        'app/repo.py'
      );
      assert.ok(hasSymbol(r, 'find', 'method'), 'find should have kind=method');
      assert.ok(!hasSymbol(r, 'find', 'function'), 'find should not have kind=function');
    });

    test('detects multiple methods', () => {
      const r = parseFile(
        `class Service:\n    def create(self): pass\n    def delete(self, id): pass`,
        'app/svc.py'
      );
      assert.ok(hasSymbol(r, 'create', 'method'));
      assert.ok(hasSymbol(r, 'delete', 'method'));
    });

    test('detects decorated function (kind=function at module level)', () => {
      const r = parseFile(
        `@app.route('/')\ndef index():\n    return 'Hello'`,
        'app/views.py'
      );
      assert.ok(hasSymbol(r, 'index', 'function'));
    });

    test('detects decorated method (kind=method inside class)', () => {
      const r = parseFile(
        `class MyView:\n    @staticmethod\n    def get():\n        return 'ok'`,
        'app/views.py'
      );
      assert.ok(hasSymbol(r, 'get', 'method'));
    });

    test('decorated function is NOT duplicated', () => {
      const r = parseFile(
        `@decorator\ndef my_func():\n    pass`,
        'app/funcs.py'
      );
      const matches = symbols(r).filter(s => s.name === 'my_func');
      assert.strictEqual(matches.length, 1, 'decorated function should appear exactly once');
    });

    test('extracts relative import path (from .module import)', () => {
      const r = parseFile(
        `from .utils import helper\nfrom ..models import User`,
        'app/views.py'
      );
      // Tree-sitter captures the module_name node text for Python imports.
      // Relative imports have leading dots: ".utils", "..models"
      assert.ok(imports(r).some(p => p.includes('utils')), 'Should find .utils import');
    });

    test('captures absolute import paths (filtered by resolveImportPaths later)', () => {
      const r = parseFile(
        `import os\nimport django.db.models`,
        'app/views.py'
      );
      // Raw paths are captured; resolveImportPaths filters to relative-only.
      assert.ok(imports(r).length > 0, 'Absolute imports captured as raw paths');
    });
  });

  // ── Go ───────────────────────────────────────────────────────────────────────

  suite('Go', () => {
    test('detects top-level function', () => {
      const r = parseFile(
        `func ServeHTTP(w http.ResponseWriter, r *http.Request) {\n}`,
        'server/handler.go'
      );
      assert.ok(hasSymbol(r, 'ServeHTTP', 'function'));
    });

    test('detects receiver method', () => {
      const r = parseFile(
        `func (s *Server) ListenAndServe(addr string) error {\n  return nil\n}`,
        'server/server.go'
      );
      assert.ok(hasSymbol(r, 'ListenAndServe', 'method'));
    });

    test('detects struct type', () => {
      const r = parseFile(
        `type Config struct {\n  Port int\n  Host string\n}`,
        'config/config.go'
      );
      assert.ok(hasSymbol(r, 'Config', 'struct'));
    });

    test('detects interface type', () => {
      const r = parseFile(
        `type Handler interface {\n  ServeHTTP(w http.ResponseWriter, r *http.Request)\n}`,
        'server/handler.go'
      );
      assert.ok(hasSymbol(r, 'Handler', 'interface'));
    });

    test('detects generic type alias', () => {
      const r = parseFile(`type ID = int64`, 'types/types.go');
      assert.ok(hasSymbol(r, 'ID', 'type'));
    });

    test('extracts relative import path', () => {
      const r = parseFile(
        `import (\n  "fmt"\n  "./internal/config"\n)`,
        'cmd/main.go'
      );
      assert.ok(imports(r).some(p => p.includes('./internal/config')));
    });
  });

  // ── Rust ─────────────────────────────────────────────────────────────────────

  suite('Rust', () => {
    test('detects pub fn', () => {
      const r = parseFile(
        `pub fn parse_config(input: &str) -> Result<Config, Error> {\n  todo!()\n}`,
        'src/config.rs'
      );
      assert.ok(hasSymbol(r, 'parse_config', 'function'));
    });

    test('detects private fn', () => {
      const r = parseFile(
        `fn validate(s: &str) -> bool {\n  !s.is_empty()\n}`,
        'src/util.rs'
      );
      assert.ok(hasSymbol(r, 'validate', 'function'));
    });

    test('detects pub async fn', () => {
      const r = parseFile(
        `pub async fn fetch(url: &str) -> Result<String> {\n  todo!()\n}`,
        'src/client.rs'
      );
      assert.ok(hasSymbol(r, 'fetch', 'function'));
    });

    test('detects struct', () => {
      const r = parseFile(
        `pub struct AppState {\n  pub db: Pool,\n}`,
        'src/state.rs'
      );
      assert.ok(hasSymbol(r, 'AppState', 'struct'));
    });

    test('detects enum', () => {
      const r = parseFile(
        `pub enum Error {\n  NotFound,\n  Unauthorized,\n}`,
        'src/errors.rs'
      );
      assert.ok(hasSymbol(r, 'Error', 'enum'));
    });

    test('detects trait', () => {
      const r = parseFile(
        `pub trait Repository {\n  fn find(&self, id: u64) -> Option<Item>;\n}`,
        'src/repo.rs'
      );
      assert.ok(hasSymbol(r, 'Repository', 'trait'));
    });

    test('detects impl block (simple type)', () => {
      const r = parseFile(
        `impl UserService {\n  pub fn new() -> Self { Self {} }\n}`,
        'src/service.rs'
      );
      assert.ok(hasSymbol(r, 'UserService', 'impl'));
    });

    test('detects type alias', () => {
      const r = parseFile(`pub type Result<T> = std::result::Result<T, Error>;`, 'src/lib.rs');
      assert.ok(hasSymbol(r, 'Result', 'type'));
    });

    test('extracts crate-relative use path', () => {
      const r = parseFile(
        `use crate::utils::helper;\nuse std::collections::HashMap;`,
        'src/main.rs'
      );
      assert.ok(imports(r).some(p => p.includes('crate::utils::helper')));
    });
  });

  // ── Java ─────────────────────────────────────────────────────────────────────

  suite('Java', () => {
    test('detects public class', () => {
      const r = parseFile(
        `package com.example;\n\npublic class UserController {\n}`,
        'src/main/java/com/example/UserController.java'
      );
      assert.ok(hasSymbol(r, 'UserController', 'class'));
    });

    test('detects abstract class', () => {
      const r = parseFile(
        `public abstract class BaseService {\n  public abstract void init();\n}`,
        'src/main/java/BaseService.java'
      );
      assert.ok(hasSymbol(r, 'BaseService', 'class'));
    });

    test('detects interface', () => {
      const r = parseFile(
        `public interface UserRepository {\n  User findById(Long id);\n}`,
        'src/UserRepository.java'
      );
      assert.ok(hasSymbol(r, 'UserRepository', 'interface'));
    });

    test('detects enum', () => {
      const r = parseFile(
        `public enum OrderStatus {\n  PENDING, PROCESSING, SHIPPED\n}`,
        'src/OrderStatus.java'
      );
      assert.ok(hasSymbol(r, 'OrderStatus', 'enum'));
    });

    test('detects annotation type', () => {
      const r = parseFile(
        `public @interface RestController {\n  String value() default "";\n}`,
        'src/RestController.java'
      );
      assert.ok(hasSymbol(r, 'RestController', 'annotation'));
    });

    test('detects public method', () => {
      const r = parseFile(
        `public class Foo {\n    public String getName(int id) throws Exception {\n        return "foo";\n    }\n}`,
        'src/Foo.java'
      );
      assert.ok(hasSymbol(r, 'getName', 'method'));
    });

    test('detects private method', () => {
      const r = parseFile(
        `public class Bar {\n    private void doWork() {\n    }\n}`,
        'src/Bar.java'
      );
      assert.ok(hasSymbol(r, 'doWork', 'method'));
    });

    test('detects constructor', () => {
      const r = parseFile(
        `public class Service {\n    public Service(String name) { this.name = name; }\n}`,
        'src/Service.java'
      );
      assert.ok(hasSymbol(r, 'Service', 'constructor'));
    });

    test('extracts FQN import path', () => {
      const r = parseFile(
        `import com.example.UserService;\nimport java.util.List;`,
        'src/UserController.java'
      );
      assert.ok(imports(r).includes('com.example.UserService'));
    });
  });

  // ── Vue ──────────────────────────────────────────────────────────────────────

  suite('Vue', () => {
    test('extracts symbols from <script> (JavaScript)', () => {
      const vue = `<template><div>hello</div></template>\n<script>\nexport default {\n  name: 'MyComp',\n};\nfunction setup() {}\n</script>`;
      const r   = parseFile(vue, 'src/MyComp.vue');
      assert.ok(hasSymbol(r, 'setup', 'function'));
    });

    test('extracts symbols from <script lang="ts">', () => {
      const vue = `<template><div /></template>\n<script lang="ts">\nexport interface Props {\n  label: string;\n}\nexport const greet = (): void => {};\n</script>`;
      const r   = parseFile(vue, 'src/Comp.vue');
      assert.ok(hasSymbol(r, 'Props', 'interface'));
      assert.ok(hasSymbol(r, 'greet', 'function'));
    });

    test('adjusts line numbers by script block offset', () => {
      // <template> tag + blank line = 2 lines before <script>
      // <script> opening tag on line 3, content starts line 4 → lineOffset = 3
      const vue = `<template>\n  <div />\n</template>\n<script lang="ts">\nfunction foo() {}\n</script>`;
      const r   = parseFile(vue, 'src/C.vue');
      const sym = symbols(r).find(s => s.name === 'foo');
      assert.ok(sym, 'foo should be found in Vue file');
      // foo is on the first line of the script content, after the opening tag line.
      assert.ok(sym!.line > 1, 'line should be offset by template block');
    });

    test('returns empty result for Vue file with no <script> block', () => {
      const vue = `<template><div>{{ msg }}</div></template>`;
      const r   = parseFile(vue, 'src/NoScript.vue');
      assert.strictEqual(symbols(r).length, 0);
      assert.strictEqual(imports(r).length, 0);
    });
  });

  // ── Edge cases ───────────────────────────────────────────────────────────────

  suite('Edge cases', () => {
    test('returns empty result for unsupported extension', () => {
      const r = parseFile(`# config file`, 'config.yaml');
      assert.strictEqual(symbols(r).length, 0);
      assert.strictEqual(imports(r).length, 0);
    });

    test('handles empty file without throwing', () => {
      const r = parseFile('', 'src/empty.ts');
      assert.strictEqual(symbols(r).length, 0);
      assert.strictEqual(imports(r).length, 0);
    });

    test('handles file with only comments', () => {
      const r = parseFile(
        `// This file is intentionally empty.\n/* placeholder */`,
        'src/placeholder.ts'
      );
      assert.strictEqual(symbols(r).length, 0);
    });

    test('handles syntax errors gracefully (returns partial result)', () => {
      // tree-sitter is error-tolerant; it should return symbols found before the error.
      const r = parseFile(
        `export function valid() {}\n\n export function broken( /* missing closing brace */`,
        'src/partial.ts'
      );
      // 'valid' should at minimum be detected; 'broken' may or may not be.
      assert.ok(hasSymbol(r, 'valid', 'function'), 'valid function should still be detected');
    });

    test('does not duplicate symbols appearing in multiple patterns', () => {
      // A decorated Python function matches two query patterns; the second should be deduplicated.
      const r = parseFile(
        `@decorator\ndef my_func():\n    pass`,
        'app/funcs.py'
      );
      const count = symbols(r).filter(s => s.name === 'my_func').length;
      assert.strictEqual(count, 1, 'Decorated function should appear exactly once');
    });

    test('handles multiple symbols in one file', () => {
      const r = parseFile(
        `export class A {}\nexport class B {}\nexport function c() {}`,
        'src/multi.ts'
      );
      assert.ok(hasSymbol(r, 'A', 'class'));
      assert.ok(hasSymbol(r, 'B', 'class'));
      assert.ok(hasSymbol(r, 'c', 'function'));
    });

    test('signature is truncated to 120 characters', () => {
      const longLine = 'export function ' + 'a'.repeat(200) + '() {}';
      const r = parseFile(longLine, 'src/long.ts');
      const sym = symbols(r)[0];
      assert.ok(sym, 'Symbol should be found');
      assert.ok((sym.signature?.length ?? 0) <= 120, 'Signature capped at 120 chars');
    });
  });
});
