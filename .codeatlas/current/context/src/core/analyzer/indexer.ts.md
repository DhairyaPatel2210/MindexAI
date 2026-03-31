# src/core/analyzer/indexer.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:29.976Z  

## Overview
This file is responsible for building a semantic index of a codebase, which includes a flat symbol index, a file index, and an inverted keyword index. The index is built by analyzing file contexts and dependency graphs, and is persisted to disk in JSON format.

## Dependencies
- `src/core/analyzer/fileAnalyzer.ts`
- `src/core/analyzer/graphBuilder.ts`
- `src/utils/logger.ts`

## Symbols

### `buildIndex` *(function)*
**Purpose:** Builds a semantic index of a codebase  

**Behavior:** Analyzes file contexts and dependency graphs to create a flat symbol index, a file index, and an inverted keyword index

**Parameters:** fileContexts: FileContext[], graph: DependencyGraph  
**Returns:** SemanticIndex  
**Limitations:** Requires file contexts and dependency graphs to be available  
**Used by:** `src/core/workflow/runner.ts`, `src/test/suite/indexer.test.ts`  

### `persistIndex` *(function)*
**Purpose:** Persists a semantic index to disk in JSON format  

**Behavior:** Writes the index to a file at the specified path

**Parameters:** index: SemanticIndex  
**Returns:** void  
**Limitations:** Requires a valid index object  
**Used by:** `src/core/workflow/runner.ts`, `src/test/suite/indexer.test.ts`  

### `persistContextOverview` *(function)*
**Purpose:** Persists a context overview to disk in Markdown format  

**Behavior:** Writes a Markdown file containing a summary of the codebase and its symbols

**Parameters:** index: SemanticIndex, graph: DependencyGraph  
**Returns:** void  
**Limitations:** Requires a valid index object and dependency graph  
**Used by:** `src/core/workflow/runner.ts`, `src/test/suite/indexer.test.ts`  

### `inlineOverview` *(function)*
**Purpose:** Formats an overview string for inline use in a Markdown list item  

**Behavior:** Collapses embedded newlines, truncates with … at 200 chars, and falls back to italicised placeholder if empty

**Parameters:** overview: string | undefined  
**Returns:** string  
**Limitations:** Requires a valid overview string  
**Used by:** `src/core/workflow/runner.ts`, `src/test/suite/indexer.test.ts`  
