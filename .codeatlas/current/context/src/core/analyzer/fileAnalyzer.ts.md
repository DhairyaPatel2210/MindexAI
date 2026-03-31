# src/core/analyzer/fileAnalyzer.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:29.982Z  

## Overview
Analyzes a single file or a batch of small files using a Large Language Model (LLM) to extract semantic documentation.

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

**Behavior:** Takes a file node, dependency graph, LLM provider, rate limiter, and optional signal as input, and returns a FileContext object containing the file's overview, symbols, dependencies, and analyzed at timestamp.

**Parameters:** fileNode: FileNode, graph: DependencyGraph, llm: ILLMProvider, limiter: RateLimiter, signal?: AbortSignal, maxChunkChars?: number, tracker?: UsageTracker  
**Returns:** Promise<FileContext>  
**Limitations:** Fails if the file exceeds the LLM's context window or if the LLM returns unparseable output.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `analyzeFileBatch` *(function)*
**Purpose:** Analyzes a batch of small files using the LLM.  

**Behavior:** Takes a list of file nodes, dependency graph, LLM provider, rate limiter, and optional signal as input, and returns a list of FileContext objects containing the files' overviews, symbols, dependencies, and analyzed at timestamps.

**Parameters:** fileNodes: FileNode[], graph: DependencyGraph, llm: ILLMProvider, limiter: RateLimiter, signal?: AbortSignal, tracker?: UsageTracker  
**Returns:** Promise<FileContext[]>  
**Limitations:** Fails if the batch exceeds the LLM's context window or if the LLM returns unparseable output.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `partitionForBatching` *(function)*
**Purpose:** Partitions a list of file nodes into batches of small files and a list of large files.  

**Behavior:** Takes a list of file nodes as input, and returns an object containing the batches of small files and the list of large files.

**Parameters:** fileNodes: FileNode[]  
**Returns:** { batches: FileNode[][], large: FileNode[] }  
**Limitations:** None  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  
