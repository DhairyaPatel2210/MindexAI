// Copies WASM files from node_modules into out/parsers/ after tsc compilation.
// Runs as part of the compile npm script.
'use strict';

const fs   = require('fs');
const path = require('path');

const root     = path.join(__dirname, '..');
const destDir  = path.join(root, 'out', 'parsers');

fs.mkdirSync(destDir, { recursive: true });

// Core tree-sitter runtime (JS + WASM, both from web-tree-sitter)
const webTreeSitterDir = path.join(root, 'node_modules', 'web-tree-sitter');
fs.copyFileSync(path.join(webTreeSitterDir, 'tree-sitter.wasm'), path.join(destDir, 'tree-sitter.wasm'));
fs.copyFileSync(path.join(webTreeSitterDir, 'tree-sitter.js'),   path.join(destDir, 'tree-sitter.js'));

// Language grammar WASM files (from tree-sitter-wasms)
const grammarSrc = path.join(root, 'node_modules', 'tree-sitter-wasms', 'out');
const grammars = [
  'tree-sitter-typescript.wasm',
  'tree-sitter-tsx.wasm',
  'tree-sitter-javascript.wasm',
  'tree-sitter-python.wasm',
  'tree-sitter-go.wasm',
  'tree-sitter-rust.wasm',
  'tree-sitter-java.wasm',
];

for (const file of grammars) {
  fs.copyFileSync(path.join(grammarSrc, file), path.join(destDir, file));
}

console.log(`[copyWasm] Copied ${grammars.length + 1} WASM files to out/parsers/`);
