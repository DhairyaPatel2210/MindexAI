# src/core/analyzer/graphBuilder.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:17.650Z  

## Overview
This file is responsible for building a dependency graph of source files, including their symbols and import relationships. It uses a combination of ctags and regex-based parsing to extract symbols and import statements.

## Dependencies
- `src/utils/fileUtils.ts`
- `src/utils/logger.ts`

## Symbols

### `buildDependencyGraph` *(function)*
**Purpose:** Builds a dependency graph of source files  

**Behavior:** Takes an array of source file paths, extracts symbols and import relationships, and returns a dependency graph object

**Parameters:** sourceFiles: string[]  
**Returns:** Promise<DependencyGraph>  
**Limitations:** Requires ctags to be installed and configured properly  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `isCtagsAvailable` *(function)*
**Purpose:** Checks if ctags is available on the system  

**Behavior:** Runs a ctags command with the --version flag and checks for errors

**Parameters:** None  
**Returns:** Promise<boolean>  
**Limitations:** May return false positives if ctags is not properly installed or configured  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `extractSymbolsWithCtags` *(function)*
**Purpose:** Extracts symbols from source files using ctags  

**Behavior:** Runs ctags with the --output-format=json flag and parses the output to extract symbols

**Parameters:** workspaceRoot: string, files: Record<string, FileNode>  
**Returns:** Promise<void>  
**Limitations:** Requires ctags to be installed and configured properly  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `extractSymbolsWithRegex` *(function)*
**Purpose:** Extracts symbols from source files using regex-based parsing  

**Behavior:** Parses source files to extract symbols based on language-specific patterns

**Parameters:** files: Record<string, FileNode>  
**Returns:** void  
**Limitations:** May not cover all possible symbol types or languages  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `extractImports` *(function)*
**Purpose:** Extracts import relationships from source files  

**Behavior:** Parses source files to extract import statements based on language-specific patterns

**Parameters:** content: string, currentFile: string, workspaceRoot: string, allFiles: Record<string, FileNode>  
**Returns:** string[]  
**Limitations:** May not cover all possible import types or languages  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `buildImportGraph` *(function)*
**Purpose:** Builds the import graph of source files  

**Behavior:** Parses source files to extract import relationships and updates the import graph

**Parameters:** files: Record<string, FileNode>, workspaceRoot: string  
**Returns:** void  
**Limitations:** May not cover all possible import types or languages  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `normalizeKind` *(function)*
**Purpose:** Normalizes the kind of a symbol  

**Behavior:** Maps ctags kind codes to human-readable symbol types

**Parameters:** kind: string  
**Returns:** string  
**Limitations:** May not cover all possible kind codes  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `getLanguageFromPath` *(function)*
**Purpose:** Determines the language of a source file  

**Behavior:** Parses the file extension to determine the language

**Parameters:** filePath: string  
**Returns:** string  
**Limitations:** May not cover all possible file extensions  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  
