# src/test/suite/graphBuilder.test.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:36.901Z  

## Overview
This file contains unit tests for the GraphBuilder class, specifically for the extractSymbolsFromContent and extractImports methods. The tests cover various programming languages, including TypeScript, JavaScript, Python, Go, Rust, and Java, to ensure the GraphBuilder can correctly extract symbols and imports from code in different languages.

## Dependencies
- `src/core/analyzer/graphBuilder.ts`

## Symbols

### `extractSymbolsFromContent` *(function)*
**Purpose:** Extracts symbols from a given code snippet  

**Behavior:** Takes a code snippet and a file path as input, and returns an array of symbols extracted from the code

**Parameters:** code: string, filePath: string  
**Returns:** Array of symbols  
**Limitations:** Only supports a limited set of programming languages  

### `extractImports` *(function)*
**Purpose:** Extracts imports from a given code snippet  

**Behavior:** Takes a code snippet, a file path, and a workspace root as input, and returns an array of imports extracted from the code

**Parameters:** code: string, filePath: string, workspaceRoot: string, allFiles: Record<string, FileNode>  
**Returns:** Array of imports  
**Limitations:** Only supports a limited set of programming languages  
