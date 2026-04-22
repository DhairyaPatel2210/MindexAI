# src/core/analyzer/graphBuilder.ts
**Language:** typescript  
**Analyzed:** 2026-04-11T23:19:54.615Z  

## Overview
This file defines a dependency graph builder that uses Tree Sitter to parse source files and extract symbols and import relationships. It then constructs a graph of file dependencies, including imports and imports-by, and returns a DependencyGraph object containing statistics and file nodes.

## Dependencies
- `src/utils/fileUtils.ts`
- `src/utils/logger.ts`
- `src/core/analyzer/treeSitterParser.ts`

## Symbols

### `buildDependencyGraph` *(function)*
**Purpose:** Constructs a dependency graph for a list of source files.  

**Behavior:** Uses Tree Sitter to parse each file, extract symbols and import relationships, and build a graph of file dependencies.

**Parameters:** sourceFiles: string[]  
**Returns:** Promise<DependencyGraph>  
**Limitations:** Requires Tree Sitter to be initialized and configured correctly.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/analyzer/treeSitterParser.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `_buildImportGraph` *(function)*
**Purpose:** Builds the import graph using pre-parsed raw import specifiers.  

**Behavior:** Iterates over file nodes, resolves import paths, and updates import relationships.

**Parameters:** files: Record<string, FileNode>, parseResults: Map<string, ParseResult>, workspaceRoot: string  
**Returns:** void  
**Limitations:** Assumes pre-parsed raw import specifiers are available.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/analyzer/treeSitterParser.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `resolveImportPaths` *(function)*
**Purpose:** Resolves an array of raw import specifiers into relative file paths.  

**Behavior:** Uses language-specific rules to resolve import paths, including Java FQNs, Python relative paths, Rust crate-relative use paths, and TypeScript/JavaScript/Go relative paths.

**Parameters:** rawPaths: string[], currentFile: string, workspaceRoot: string, allFiles: Record<string, FileNode>  
**Returns:** string[]  
**Limitations:** Requires knowledge of language-specific import rules.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/analyzer/treeSitterParser.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `_tryExtensions` *(function)*
**Purpose:** Tries a bare path and then each extension, pushing the first match found into the output array.  

**Behavior:** Iterates over a list of extensions, trying each one in turn, and returns the first match found.

**Parameters:** resolved: string, workspaceRoot: string, allFiles: Record<string, FileNode>, seen: Set<string>, out: string[], extensions: string[]  
**Returns:** void  
**Limitations:** Assumes a list of extensions is available.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/analyzer/treeSitterParser.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `_rustSuffixSearch` *(function)*
**Purpose:** Searches all workspace files for a crate-relative use path.  

**Behavior:** Iterates over file nodes, searching for a path that ends with the specified suffix.

**Parameters:** modPath: string, allFiles: Record<string, FileNode>, seen: Set<string>, out: string[]  
**Returns:** void  
**Limitations:** Assumes a crate-relative use path is available.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/analyzer/treeSitterParser.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `getLanguageFromPath` *(function)*
**Purpose:** Determines the language of a file based on its path.  

**Behavior:** Uses a mapping of file extensions to languages to determine the language of a file.

**Parameters:** filePath: string  
**Returns:** string  
**Limitations:** Requires a mapping of file extensions to languages.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/analyzer/treeSitterParser.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  
