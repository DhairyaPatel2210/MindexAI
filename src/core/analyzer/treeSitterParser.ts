import * as path from 'path';
import * as fs from 'fs';
// Type-only import: zero runtime effect. Avoids executing web-tree-sitter's
// module-level code (which can crash in VSCode's sandboxed Electron extension
// host where `window` exists but `window.document` may be undefined).
import type Parser from 'web-tree-sitter';
import { SymbolEntry } from './graphBuilder';
import { logger } from '../../utils/logger';

// Holds the web-tree-sitter module after it is dynamically required in _doInit.
// Typed 'any' because we cannot reference the value-level typeof with import type.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _P: any = null;

// ── Public types ──────────────────────────────────────────────────────────────

export interface ParseResult {
  symbols: SymbolEntry[];
  /** Raw import specifiers as they appear in the source (unresolved). */
  importPaths: string[];
}

// ── Module state ──────────────────────────────────────────────────────────────

let _initialized = false;
let _initPromise: Promise<void> | null = null;

// One Parser instance per language key (not reused across concurrent calls,
// but we parse files sequentially so a single instance per language is safe).
const _parsers    = new Map<string, Parser>();
const _languages  = new Map<string, Parser.Language>();
const _symQueries = new Map<string, Parser.Query>();
const _impQueries = new Map<string, Parser.Query>();

// ── WASM location ─────────────────────────────────────────────────────────────
// At runtime this module compiles to out/core/analyzer/treeSitterParser.js,
// so __dirname = <ext-root>/out/core/analyzer/
// WASM files are copied by scripts/copyWasm.js to <ext-root>/out/parsers/
const WASM_DIR = path.join(__dirname, '..', '..', 'parsers');

// ── Extension-to-language mapping ────────────────────────────────────────────

const EXT_TO_LANG: Readonly<Record<string, string>> = {
  '.ts':   'typescript',
  '.tsx':  'tsx',
  '.js':   'javascript',
  '.jsx':  'javascript',
  '.py':   'python',
  '.go':   'go',
  '.rs':   'rust',
  '.java': 'java',
};

// ── Grammar WASM filenames ────────────────────────────────────────────────────

const GRAMMAR_FILES: Readonly<Record<string, string>> = {
  typescript: 'tree-sitter-typescript.wasm',
  tsx:        'tree-sitter-tsx.wasm',
  javascript: 'tree-sitter-javascript.wasm',
  python:     'tree-sitter-python.wasm',
  go:         'tree-sitter-go.wasm',
  rust:       'tree-sitter-rust.wasm',
  java:       'tree-sitter-java.wasm',
};

// ── Tree-sitter queries ───────────────────────────────────────────────────────
// Each entry declares two captures:
//   @symbol – the full declaration node  (used for kind + line number)
//   @name   – the identifier node        (used for the symbol name text)

const SYMBOL_QUERIES: Readonly<Record<string, string>> = {
  typescript: `
    (function_declaration  name: (identifier)         @name) @symbol
    (function_expression   name: (identifier)         @name) @symbol
    (class_declaration     name: (type_identifier)    @name) @symbol
    (interface_declaration name: (type_identifier)    @name) @symbol
    (type_alias_declaration name: (type_identifier)   @name) @symbol
    (enum_declaration      name: (identifier)         @name) @symbol
    (method_definition     name: (property_identifier) @name) @symbol
    (lexical_declaration
      (variable_declarator name: (identifier) @name
        value: (arrow_function))) @symbol
    (lexical_declaration
      (variable_declarator name: (identifier) @name
        value: (function_expression))) @symbol
  `,
  tsx: `
    (function_declaration  name: (identifier)         @name) @symbol
    (function_expression   name: (identifier)         @name) @symbol
    (class_declaration     name: (type_identifier)    @name) @symbol
    (interface_declaration name: (type_identifier)    @name) @symbol
    (type_alias_declaration name: (type_identifier)   @name) @symbol
    (enum_declaration      name: (identifier)         @name) @symbol
    (method_definition     name: (property_identifier) @name) @symbol
    (lexical_declaration
      (variable_declarator name: (identifier) @name
        value: (arrow_function))) @symbol
    (lexical_declaration
      (variable_declarator name: (identifier) @name
        value: (function_expression))) @symbol
  `,
  javascript: `
    (function_declaration name: (identifier)          @name) @symbol
    (function_expression  name: (identifier)          @name) @symbol
    (class_declaration    name: (identifier)          @name) @symbol
    (method_definition    name: (property_identifier) @name) @symbol
    (lexical_declaration
      (variable_declarator name: (identifier) @name
        value: (arrow_function))) @symbol
    (lexical_declaration
      (variable_declarator name: (identifier) @name
        value: (function_expression))) @symbol
  `,
  python: `
    (function_definition name: (identifier) @name) @symbol
    (class_definition    name: (identifier) @name) @symbol
    (decorated_definition
      definition: (function_definition name: (identifier) @name)) @symbol
    (decorated_definition
      definition: (class_definition    name: (identifier) @name)) @symbol
  `,
  go: `
    (function_declaration name: (identifier)       @name) @symbol
    (method_declaration   name: (field_identifier) @name) @symbol
    (type_declaration
      (type_spec  name: (type_identifier) @name)) @symbol
    (type_declaration
      (type_alias name: (type_identifier) @name)) @symbol
  `,
  rust: `
    (function_item name: (identifier)     @name) @symbol
    (struct_item   name: (type_identifier) @name) @symbol
    (enum_item     name: (type_identifier) @name) @symbol
    (trait_item    name: (type_identifier) @name) @symbol
    (impl_item     type: (type_identifier) @name) @symbol
    (type_item     name: (type_identifier) @name) @symbol
  `,
  java: `
    (class_declaration           name: (identifier) @name) @symbol
    (interface_declaration       name: (identifier) @name) @symbol
    (enum_declaration            name: (identifier) @name) @symbol
    (annotation_type_declaration name: (identifier) @name) @symbol
    (method_declaration          name: (identifier) @name) @symbol
    (constructor_declaration     name: (identifier) @name) @symbol
  `,
};

// Import queries extract raw specifier strings.
// The @path capture holds the raw path text (quotes are stripped later).
// The @fn capture in the require() pattern is used only for the #eq? predicate.
const IMPORT_QUERIES: Readonly<Record<string, string>> = {
  typescript: `
    (import_statement source: (string (string_fragment) @path))
    (export_statement source: (string (string_fragment) @path))
    (call_expression
      function: (identifier) @fn (#eq? @fn "require")
      arguments: (arguments (string (string_fragment) @path)))
  `,
  tsx: `
    (import_statement source: (string (string_fragment) @path))
    (export_statement source: (string (string_fragment) @path))
    (call_expression
      function: (identifier) @fn (#eq? @fn "require")
      arguments: (arguments (string (string_fragment) @path)))
  `,
  javascript: `
    (import_statement source: (string (string_fragment) @path))
    (export_statement source: (string (string_fragment) @path))
    (call_expression
      function: (identifier) @fn (#eq? @fn "require")
      arguments: (arguments (string (string_fragment) @path)))
  `,
  python: `
    (import_from_statement module_name: (_) @path)
    (import_statement name: (dotted_name) @path)
  `,
  go: `
    (import_spec path: (interpreted_string_literal) @path)
  `,
  rust: `
    (use_declaration argument: (_) @path)
  `,
  java: `
    (import_declaration (scoped_identifier) @path)
  `,
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Initialises the tree-sitter WASM runtime and loads all language grammars.
 * Safe to call multiple times — subsequent calls are no-ops.
 * Must resolve before `parseFile` is called.
 */
export async function initTreeSitter(): Promise<void> {
  if (_initialized) { return; }
  if (_initPromise) {
    // If a previous attempt is still in flight, wait for it.
    await _initPromise;
    // If it succeeded we're done; if it failed (_initialized still false)
    // fall through so we try again below.
    if (_initialized) { return; }
  }
  _initPromise = _doInit();
  await _initPromise;
}

/**
 * Parses `content` (source text of the file at `filePath`) using the
 * tree-sitter grammar for its language and returns extracted symbols and
 * raw import specifiers.
 *
 * Returns empty arrays when the language is unsupported or init failed.
 * tree-sitter is error-tolerant: files with syntax errors yield partial results.
 */
export function parseFile(content: string, filePath: string): ParseResult {
  if (!_initialized) {
    logger.warn('treeSitterParser: not yet initialized — returning empty result');
    return EMPTY;
  }

  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.vue') {
    return _parseVueFile(content);
  }

  const langKey = EXT_TO_LANG[ext];
  if (!langKey) { return EMPTY; }

  return _parseWithLang(content, langKey, 0);
}

const EMPTY: ParseResult = Object.freeze({ symbols: [], importPaths: [] });

// ── Initialisation internals ──────────────────────────────────────────────────

async function _doInit(): Promise<void> {
  // Dynamically require web-tree-sitter so that its module-level code (which
  // may throw in VSCode's sandboxed Electron host where window.document is
  // undefined) does not run until we're safely inside an async try-catch.
  try {
    // Load from the copied path in out/parsers/ so the extension works whether
    // run from the workspace (dev) or installed from a vsix (node_modules excluded
    // by .vscodeignore). Using an absolute path avoids any module-resolution lookup.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    _P = require(path.join(WASM_DIR, 'tree-sitter.js'));
  } catch (err) {
    logger.warn(`treeSitterParser: web-tree-sitter module failed to load: ${err}`);
    _initPromise = null; // allow retry on next call
    return;
  }

  try {
    // Provide the WASM binary directly via fs so we bypass any fetch/URL
    // resolution that may fail in VSCode's Electron extension host.
    const wasmBinary = fs.readFileSync(path.join(WASM_DIR, 'tree-sitter.wasm'));
    await (_P.init as (opts: object) => Promise<void>)({ wasmBinary });
  } catch (err) {
    logger.error('tree-sitter core WASM init failed', err);
    _initPromise = null; // allow retry on next call
    return; // _initialized stays false
  }

  let loaded = 0;
  for (const [langKey, wasmFile] of Object.entries(GRAMMAR_FILES)) {
    const wasmPath = path.join(WASM_DIR, wasmFile);
    if (!fs.existsSync(wasmPath)) {
      logger.warn(`treeSitterParser: WASM not found for ${langKey}: ${wasmPath}`);
      continue;
    }
    try {
      // Pass the buffer directly so Language.load bypasses any fetch/URL path.
      const wasmBuffer = fs.readFileSync(wasmPath);
      const language = await _P.Language.load(wasmBuffer);
      const parser   = new _P();
      parser.setLanguage(language);
      _parsers.set(langKey, parser);
      _languages.set(langKey, language);

      const symSrc = SYMBOL_QUERIES[langKey];
      const impSrc = IMPORT_QUERIES[langKey];
      if (symSrc) { _symQueries.set(langKey, language.query(symSrc)); }
      if (impSrc) { _impQueries.set(langKey, language.query(impSrc)); }

      loaded++;
    } catch (err) {
      logger.warn(`treeSitterParser: failed to load grammar for ${langKey}: ${err}`);
    }
  }

  _initialized = true;
  logger.info(`treeSitterParser: initialized with ${loaded} language grammars`);
}

// ── Vue file handling ─────────────────────────────────────────────────────────

interface _ScriptBlock {
  content:    string;
  language:   'typescript' | 'javascript';
  lineOffset: number; // 0-based line number where script content begins
}

function _parseVueFile(vueContent: string): ParseResult {
  const block = _extractVueScriptBlock(vueContent);
  if (!block) { return EMPTY; }
  return _parseWithLang(block.content, block.language, block.lineOffset);
}

function _extractVueScriptBlock(vueContent: string): _ScriptBlock | null {
  // Matches <script> and <script setup> with any attributes.
  const match = vueContent.match(/<script(\b[^>]*)>([\s\S]*?)<\/script>/);
  if (!match) { return null; }

  const attrs        = match[1] ?? '';
  const scriptContent = match[2] ?? '';
  const isTS         = /\blang=["']ts["']/.test(attrs);

  // Calculate the 0-based line number of the first line of script content.
  const scriptTagStart = vueContent.indexOf(match[0]);
  const openingTagLen  = match[0].length - scriptContent.length - '</script>'.length;
  const openingTagEnd  = scriptTagStart + openingTagLen;
  const lineOffset     = (vueContent.slice(0, openingTagEnd).match(/\n/g) ?? []).length;

  return {
    content:    scriptContent,
    language:   isTS ? 'typescript' : 'javascript',
    lineOffset,
  };
}

// ── Core parsing ──────────────────────────────────────────────────────────────

function _parseWithLang(
  content:    string,
  langKey:    string,
  lineOffset: number
): ParseResult {
  const parser = _parsers.get(langKey);
  if (!parser) { return EMPTY; }

  let tree: Parser.Tree;
  try {
    tree = parser.parse(content);
  } catch (err) {
    logger.warn(`treeSitterParser: parse error (${langKey}): ${err}`);
    return EMPTY;
  }

  const contentLines = content.split('\n');
  const symbols      = _extractSymbols(tree.rootNode, langKey, contentLines, lineOffset);
  const importPaths  = _extractImportPaths(tree.rootNode, langKey);

  return { symbols, importPaths };
}

// ── Symbol extraction ─────────────────────────────────────────────────────────

function _extractSymbols(
  root:         Parser.SyntaxNode,
  langKey:      string,
  contentLines: string[],
  lineOffset:   number
): SymbolEntry[] {
  const query = _symQueries.get(langKey);
  if (!query) { return []; }

  const matches  = query.matches(root);
  const symbols: SymbolEntry[] = [];
  // Deduplicate by the name-node's position (row:col).
  // This handles decorated_definition + its inner function_definition
  // both being matched — only the first (outermost) match is kept.
  const seenNamePos = new Set<string>();

  for (const match of matches) {
    const symbolCapture = match.captures.find(c => c.name === 'symbol');
    const nameCapture   = match.captures.find(c => c.name === 'name');
    if (!symbolCapture || !nameCapture) { continue; }

    const symbolNode = symbolCapture.node;
    const nameNode   = nameCapture.node;

    const posKey = `${nameNode.startPosition.row}:${nameNode.startPosition.column}`;
    if (seenNamePos.has(posKey)) { continue; }
    seenNamePos.add(posKey);

    const declLine = symbolNode.startPosition.row; // 0-based
    const firstLine = contentLines[declLine] ?? '';

    symbols.push({
      name:      nameNode.text,
      kind:      _kindFromNode(symbolNode, langKey),
      line:      declLine + 1 + lineOffset, // convert to 1-based + Vue offset
      signature: firstLine.trim().substring(0, 120),
    });
  }

  return symbols;
}

// ── Kind resolution ───────────────────────────────────────────────────────────

function _kindFromNode(node: Parser.SyntaxNode, langKey: string): string {
  const t = node.type;

  switch (t) {
    // ── TypeScript / JavaScript / TSX ──────────────────────────────────────
    case 'function_declaration':
    case 'function_expression':
    case 'lexical_declaration': // matched only when value is arrow_fn / fn_expr
      return 'function';
    case 'class_declaration':
      return 'class';
    case 'interface_declaration':
      return 'interface';
    case 'type_alias_declaration':
      return 'type';
    case 'enum_declaration':
      return 'enum';
    case 'method_definition':
      return 'method';

    // ── Python ─────────────────────────────────────────────────────────────
    case 'function_definition': {
      // Walk the parent chain: if we hit a class_definition the fn is a method.
      let p = node.parent;
      while (p) {
        if (p.type === 'class_definition') { return 'method'; }
        // Stop at module level — no need to go further
        if (p.type === 'module') { break; }
        p = p.parent;
      }
      return 'function';
    }
    case 'class_definition':
      return 'class';
    case 'decorated_definition': {
      // Determine kind from the wrapped definition, applying the same
      // class/module distinction for methods.
      const def = node.namedChildren.find(
        c => c.type === 'function_definition' || c.type === 'class_definition'
      );
      if (def?.type === 'class_definition') { return 'class'; }
      // It's a function (potentially a method if inside a class body)
      let p = node.parent;
      while (p) {
        if (p.type === 'class_definition') { return 'method'; }
        if (p.type === 'module') { break; }
        p = p.parent;
      }
      return 'function';
    }

    // ── Go ─────────────────────────────────────────────────────────────────
    case 'method_declaration':
      return 'method';
    case 'type_alias':
      return 'type';
    case 'type_declaration': {
      // Inspect the child to distinguish struct / interface / alias / plain type.
      const typeSpec  = node.namedChildren.find(c => c.type === 'type_spec');
      const typeAlias = node.namedChildren.find(c => c.type === 'type_alias');
      if (typeAlias) { return 'type'; }
      if (typeSpec) {
        const body = typeSpec.namedChildren.find(
          c => c.type === 'struct_type' || c.type === 'interface_type'
        );
        if (body?.type === 'struct_type')    { return 'struct'; }
        if (body?.type === 'interface_type') { return 'interface'; }
      }
      return 'type';
    }

    // ── Rust ───────────────────────────────────────────────────────────────
    case 'function_item':
      return 'function';
    case 'struct_item':
      return 'struct';
    case 'enum_item':
      return 'enum';
    case 'trait_item':
      return 'trait';
    case 'impl_item':
      return 'impl';
    case 'type_item':
      return 'type';

    // ── Java ───────────────────────────────────────────────────────────────
    case 'method_declaration':
      return 'method';
    case 'constructor_declaration':
      return 'constructor';
    case 'annotation_type_declaration':
      return 'annotation';

    default:
      // Includes 'function_declaration' for Go (same as TS — both map to 'function').
      // If it wasn't already handled above, fall through.
      if (langKey === 'go' && t === 'function_declaration') { return 'function'; }
      return t; // Fallback: use the raw node type name
  }
}

// ── Import path extraction ────────────────────────────────────────────────────

function _extractImportPaths(
  root:    Parser.SyntaxNode,
  langKey: string
): string[] {
  const query = _impQueries.get(langKey);
  if (!query) { return []; }

  const paths: string[] = [];
  const seen  = new Set<string>();

  for (const match of query.matches(root)) {
    const pathCapture = match.captures.find(c => c.name === 'path');
    if (!pathCapture) { continue; }

    // Strip surrounding quotes (Go uses "string", Rust uses unquoted paths)
    let raw = pathCapture.node.text.replace(/^["'`]|["'`]$/g, '').trim();
    if (raw && !seen.has(raw)) {
      seen.add(raw);
      paths.push(raw);
    }
  }

  return paths;
}
