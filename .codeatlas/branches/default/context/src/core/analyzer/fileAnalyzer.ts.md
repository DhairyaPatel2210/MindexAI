# src/core/analyzer/fileAnalyzer.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:18.876Z  

## Overview
This file contains the main logic for analyzing a single file or a batch of files using the LLM (Large Language Model). It provides functions for analyzing files individually or in batches, handling rate limiting, and parsing the LLM's output to extract relevant information.

## Dependencies
- `src/llm/types.ts`
- `src/core/analyzer/graphBuilder.ts`
- `src/utils/fileUtils.ts`
- `src/llm/rateLimiter.ts`
- `src/core/stats/usageStats.ts`
- `src/utils/logger.ts`

## Symbols

### `analyzeFile` *(function)*
**Purpose:** Analyzes a single file using the LLM.  

**Behavior:** Takes a file node, dependency graph, LLM provider, rate limiter, and optional parameters to analyze the file and return a FileContext object.

**Parameters:** fileNode, graph, llm, limiter, signal, maxChunkChars, tracker  
**Returns:** Promise<FileContext>  
**Limitations:** May throw RateLimitError or AbortError if rate limiting is exceeded or the analysis is cancelled.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `analyzeFileBatch` *(function)*
**Purpose:** Analyzes a batch of files using the LLM.  

**Behavior:** Takes a list of file nodes, dependency graph, LLM provider, rate limiter, and optional parameters to analyze the files in batches and return a list of FileContext objects.

**Parameters:** fileNodes, graph, llm, limiter, signal, tracker  
**Returns:** Promise<FileContext[]>  
**Limitations:** May throw RateLimitError or AbortError if rate limiting is exceeded or the analysis is cancelled.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `buildDependencyContext` *(function)*
**Purpose:** Builds a dependency context for a file node.  

**Behavior:** Takes a file node and dependency graph to extract the dependencies of the file and return a string representation of the dependencies.

**Parameters:** fileNode, graph  
**Returns:** string  
**Limitations:** May return an empty string if the file has no dependencies.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `callWithRetry` *(function)*
**Purpose:** Retries a function up to MAX_RETRIES times on RateLimitError or transient network errors.  

**Behavior:** Takes a function to retry and a label to log the retry attempts.

**Parameters:** fn, label  
**Returns:** Promise<T | undefined>  
**Limitations:** May throw RateLimitError or AbortError if rate limiting is exceeded or the analysis is cancelled.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `extractJson` *(function)*
**Purpose:** Robustly extracts a JSON object from an LLM response.  

**Behavior:** Takes an LLM response to extract the JSON object and return it as a JavaScript object.

**Parameters:** raw  
**Returns:** T | null  
**Limitations:** May return null if the LLM response is not valid JSON.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `normalizeSymbols` *(function)*
**Purpose:** Normalizes a list of symbols from the LLM's output.  

**Behavior:** Takes a list of symbols to normalize and return a list of SymbolContext objects.

**Parameters:** raw  
**Returns:** SymbolContext[]  
**Limitations:** May return an empty list if the input list is empty.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  
