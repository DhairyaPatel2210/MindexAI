# src/core/analyzer/graphBuilder.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:28.438Z  

## Overview
This file is responsible for building a dependency graph of source files, including their symbols, imports, and relationships.

## Dependencies
- `src/utils/fileUtils.ts`
- `src/utils/logger.ts`

## Symbols

### `buildDependencyGraph` *(function)*
**Purpose:** Builds a dependency graph of source files, including their symbols, imports, and relationships.  

**Behavior:** Takes an array of source file paths as input, extracts symbols and imports from each file, and constructs a graph data structure to represent the relationships between files.

**Parameters:** sourceFiles: string[]  
**Returns:** Promise<DependencyGraph>  
**Limitations:** Assumes that the source files are in a directory structure that can be traversed by the file system API.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `isCtagsAvailable` *(function)*
**Purpose:** Checks if the ctags command is available on the system.  

**Behavior:** Executes the ctags command with the --version option and checks the exit code to determine if it is available.

**Parameters:** None  
**Returns:** Promise<boolean>  
**Limitations:** Assumes that the ctags command is installed and available on the system.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `extractSymbolsWithCtags` *(function)*
**Purpose:** Extracts symbols from source files using the ctags command.  

**Behavior:** Runs the ctags command with the --output-format=json and --fields=+nkzS options to generate a JSON output that contains the symbols extracted from the source files.

**Parameters:** workspaceRoot: string, files: Record<string, FileNode>  
**Returns:** Promise<void>  
**Limitations:** Assumes that the ctags command is available and correctly configured on the system.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `extractSymbolsWithRegex` *(function)*
**Purpose:** Extracts symbols from source files using regular expressions.  

**Behavior:** Iterates over the lines of each source file and applies a set of regular expressions to extract symbols, such as functions, classes, and variables.

**Parameters:** files: Record<string, FileNode>  
**Returns:** void  
**Limitations:** May not be as accurate as using the ctags command, especially for complex or custom symbol definitions.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `buildImportGraph` *(function)*
**Purpose:** Builds an import graph of source files.  

**Behavior:** Iterates over the source files and extracts import statements, which are then used to construct a graph data structure that represents the relationships between files.

**Parameters:** files: Record<string, FileNode>, workspaceRoot: string  
**Returns:** void  
**Limitations:** Assumes that the source files are in a directory structure that can be traversed by the file system API.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `extractImports` *(function)*
**Purpose:** Extracts import statements from source files.  

**Behavior:** Iterates over the lines of each source file and applies a set of regular expressions to extract import statements, such as import statements in JavaScript or import statements in Python.

**Parameters:** content: string, currentFile: string, workspaceRoot: string, allFiles: Record<string, FileNode>  
**Returns:** string[]  
**Limitations:** May not be able to handle complex or custom import statements.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `normalizeKind` *(function)*
**Purpose:** Normalizes the kind of a symbol.  

**Behavior:** Takes a symbol kind as input and returns a normalized version of the kind, such as 'function' instead of 'f'.

**Parameters:** kind: string  
**Returns:** string  
**Limitations:** Assumes that the input kind is a valid symbol kind.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  

### `getLanguageFromPath` *(function)*
**Purpose:** Determines the language of a source file based on its file extension.  

**Behavior:** Takes a file path as input and returns the language of the file, such as 'typescript' or 'python'.

**Parameters:** filePath: string  
**Returns:** string  
**Limitations:** Assumes that the file extension is a valid language extension.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/indexer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/fileAnalyzer.test.ts`, `src/test/suite/graphBuilder.test.ts`, `src/test/suite/indexer.test.ts`  
