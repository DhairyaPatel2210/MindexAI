# src/core/analyzer/indexer.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:19.184Z  

## Overview
This file, `indexer.ts`, is responsible for building a semantic index of a codebase, which includes a flat symbol index, a file index, and an inverted keyword index. It aggregates data from individual file analyses and dependency graphs to provide a comprehensive understanding of the codebase.

## Dependencies
- `src/core/analyzer/fileAnalyzer.ts`
- `src/core/analyzer/graphBuilder.ts`
- `src/utils/logger.ts`

## Symbols

### `buildIndex` *(function)*
**Purpose:** Builds a semantic index from file contexts and dependency graphs.  

**Behavior:** Iterates over file contexts, extracts symbol information, and constructs the index.

**Parameters:** fileContexts: FileContext[], graph: DependencyGraph  
**Returns:** SemanticIndex  
**Limitations:** Requires file contexts and dependency graphs as input.  
**Used by:** `src/core/workflow/runner.ts`, `src/test/suite/indexer.test.ts`  

### `persistIndex` *(function)*
**Purpose:** Persists the semantic index to a file.  

**Behavior:** Writes the index to a JSON file.

**Parameters:** index: SemanticIndex  
**Returns:** void  
**Limitations:** Requires a valid semantic index as input.  
**Used by:** `src/core/workflow/runner.ts`, `src/test/suite/indexer.test.ts`  

### `persistContextOverview` *(function)*
**Purpose:** Generates a context overview file from the semantic index and dependency graph.  

**Behavior:** Constructs a markdown file with codebase statistics, usage instructions, and file overviews.

**Parameters:** index: SemanticIndex, graph: DependencyGraph  
**Returns:** void  
**Limitations:** Requires a valid semantic index and dependency graph as input.  
**Used by:** `src/core/workflow/runner.ts`, `src/test/suite/indexer.test.ts`  

### `indexKeywords` *(function)*
**Purpose:** Indexes keywords from symbol purposes and behaviors.  

**Behavior:** Extracts meaningful words from text and stores them in a keyword index.

**Parameters:** sym: SymbolContext, filePath: string, keywords: Record<string, string[]>  
**Returns:** void  
**Limitations:** Requires a symbol context, file path, and keyword index as input.  
**Used by:** `src/core/workflow/runner.ts`, `src/test/suite/indexer.test.ts`  

### `extractMeaningfulWords` *(function)*
**Purpose:** Extracts meaningful words from text.  

**Behavior:** Removes stop words, punctuation, and short words from text.

**Parameters:** text: string  
**Returns:** string[]  
**Limitations:** Requires a string as input.  
**Used by:** `src/core/workflow/runner.ts`, `src/test/suite/indexer.test.ts`  

### `inlineOverview` *(function)*
**Purpose:** Formats an overview string for inline use in a markdown list item.  

**Behavior:** Collapses newlines, truncates text, and falls back to a placeholder if empty.

**Parameters:** overview: string | undefined  
**Returns:** string  
**Limitations:** Requires a string or undefined as input.  
**Used by:** `src/core/workflow/runner.ts`, `src/test/suite/indexer.test.ts`  
