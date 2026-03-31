# src/test/suite/graphBuilder.test.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:53.935Z  

## Overview
This file contains unit tests for the GraphBuilder class, which is responsible for extracting symbols and imports from source code files. The tests cover various programming languages, including TypeScript, JavaScript, Python, Go, Rust, and Java.

## Dependencies
- `src/core/analyzer/graphBuilder.ts`

## Symbols

### `extractSymbolsFromContent` *(function)*
**Purpose:** Extracts symbols from a given source code content.  

**Behavior:** Takes a source code content and a file path as input, and returns an array of extracted symbols.

**Parameters:** content: string, filePath: string  
**Returns:** Array of extracted symbols  
**Limitations:** Only supports a limited set of programming languages.  

### `extractImports` *(function)*
**Purpose:** Extracts imports from a given source code content.  

**Behavior:** Takes a source code content, a file path, a workspace root, and an array of file nodes as input, and returns an array of extracted imports.

**Parameters:** content: string, filePath: string, workspaceRoot: string, fileNodes: Array  
**Returns:** Array of extracted imports  
**Limitations:** Only supports a limited set of programming languages.  
