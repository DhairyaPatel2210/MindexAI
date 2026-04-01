# src/core/analyzer/fileAnalyzer.ts
**Language:** typescript  
**Analyzed:** 2026-04-01T19:49:15.155Z  

## Overview
Analyzes a single file or a batch of small files using semantic chunking and LLM calls to extract file context and symbol information.

## Dependencies
- `src/llm/types.ts`
- `src/core/analyzer/graphBuilder.ts`
- `src/utils/fileUtils.ts`
- `src/llm/rateLimiter.ts`
- `src/core/stats/usageStats.ts`
- `src/utils/logger.ts`

## Symbols

### `analyzeFile` *(function)*
**Purpose:** Analyzes a single file using symbol-boundary semantic chunking.  

**Behavior:** Takes a file node, dependency graph, LLM provider, rate limiter, and optional parameters to extract file context and symbol information.

**Parameters:** fileNode: FileNode, graph: DependencyGraph, llm: ILLMProvider, limiter: RateLimiter, signal?: AbortSignal, maxChunkChars?: number, tracker?: UsageTracker, previousChunkEntries?: ChunkCacheEntry[]  
**Returns:** Promise<AnalyzeFileResult>  
**Limitations:** Requires a valid file node, dependency graph, and LLM provider to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `analyzeFileBatch` *(function)*
**Purpose:** Analyzes multiple small files in a single LLM request.  

**Behavior:** Takes a list of file nodes, dependency graph, LLM provider, rate limiter, and optional parameters to extract file context and symbol information for each file.

**Parameters:** fileNodes: FileNode[], graph: DependencyGraph, llm: ILLMProvider, limiter: RateLimiter, signal?: AbortSignal, tracker?: UsageTracker  
**Returns:** Promise<FileContext[]>  
**Limitations:** Requires a valid list of file nodes, dependency graph, and LLM provider to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `individualFallback` *(function)*
**Purpose:** Analyzes each file individually when batch analysis fails.  

**Behavior:** Takes a list of file nodes, dependency graph, LLM provider, rate limiter, and optional parameters to extract file context and symbol information for each file.

**Parameters:** fileNodes: FileNode[], graph: DependencyGraph, llm: ILLMProvider, limiter: RateLimiter, signal?: AbortSignal, maxChunkChars?: number, tracker?: UsageTracker  
**Returns:** Promise<FileContext[]>  
**Limitations:** Requires a valid list of file nodes, dependency graph, and LLM provider to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `analyzeChunk` *(function)*
**Purpose:** Analyzes a single chunk of a file and returns its semantic context.  

**Behavior:** Takes a chunk of content, file node, dependency context, LLM provider, rate limiter, and other parameters to generate a semantic context for the chunk.

**Parameters:** content: string, fileNode: FileNode, depContext: string, llm: ILLMProvider, limiter: RateLimiter, includeOverview: boolean, chunkNum?: number, totalChunks?: number, signal?: AbortSignal, tracker?: UsageTracker, chunkSymbolNames?: string[]  
**Returns:** Promise<ChunkResult>  
**Limitations:** Requires a valid LLM provider and rate limiter to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `parseChunkResponse` *(function)*
**Purpose:** Parses the response from the LLM and returns the semantic context for the chunk.  

**Behavior:** Takes the raw response from the LLM, file path, and include overview flag to generate a semantic context for the chunk.

**Parameters:** raw: string, filePath: string, includeOverview: boolean  
**Returns:** ChunkResult  
**Limitations:** Requires a valid raw response from the LLM to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `extractJson` *(function)*
**Purpose:** Extracts a JSON object from a string that may contain Markdown code fences and preamble text.  

**Behavior:** Takes a string and attempts to extract a JSON object from it, handling Markdown code fences and preamble text.

**Parameters:** raw: string  
**Returns:** T | null  
**Limitations:** May return null if the input string is not valid JSON.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `normalizeSymbols` *(function)*
**Purpose:** Normalizes a list of raw symbol objects into a list of symbol contexts.  

**Behavior:** Takes a list of raw symbol objects and returns a list of symbol contexts with default values filled in.

**Parameters:** raw: RawSymbol[]  
**Returns:** SymbolContext[]  
**Limitations:** Requires a valid list of raw symbol objects to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `isTrivialFile` *(function)*
**Purpose:** Determines whether a file is trivial (has no extractable symbols and negligible content).  

**Behavior:** Takes a file node and content string to determine whether the file is trivial.

**Parameters:** fileNode: FileNode, content: string  
**Returns:** boolean  
**Limitations:** Requires a valid file node and content string to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `syntheticContext` *(function)*
**Purpose:** Generates a synthetic file context for trivial or empty files.  

**Behavior:** Takes a file node to generate a synthetic file context with default values.

**Parameters:** node: FileNode  
**Returns:** FileContext  
**Limitations:** Requires a valid file node to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `collectImportedSymbolNames` *(function)*
**Purpose:** Collects all symbol names exported by every file this file imports.  

**Behavior:** Takes a file node and dependency graph to collect symbol names exported by imported files.

**Parameters:** fileNode: FileNode, graph: DependencyGraph  
**Returns:** Set<string>  
**Limitations:** Requires a valid file node and dependency graph to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `extractReferencedSymbols` *(function)*
**Purpose:** Scans chunk content for references to imported symbol names.  

**Behavior:** Takes chunk content and imported symbol names to extract referenced symbols.

**Parameters:** chunkContent: string, importedNames: Set<string>  
**Returns:** string[]  
**Limitations:** Requires valid chunk content and imported symbol names to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `escapeRegex` *(function)*
**Purpose:** Escapes special characters in a string for use in a regular expression.  

**Behavior:** Takes a string and returns an escaped version for use in a regular expression.

**Parameters:** str: string  
**Returns:** string  
**Limitations:** Requires a valid string to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `hashContent` *(function)*
**Purpose:** Computes a SHA-256 hash of a string.  

**Behavior:** Takes a string and returns its SHA-256 hash.

**Parameters:** content: string  
**Returns:** string  
**Limitations:** Requires a valid string to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `findDecoratorStart` *(function)*
**Purpose:** Determines how many lines above a symbol's start line belong to it (decorators, annotations, doc comments).  

**Behavior:** Takes lines and symbol line number to find the start line of a symbol.

**Parameters:** lines: string[], symbolLine0: number  
**Returns:** number  
**Limitations:** Requires valid lines and symbol line number to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `extractSemanticChunks` *(function)*
**Purpose:** Splits a file into per-symbol semantic chunks.  

**Behavior:** Takes a file node, content, dependency graph, and max chunk characters to split the file into semantic chunks.

**Parameters:** fileNode: FileNode, content: string, graph: DependencyGraph, maxChunkChars: number  
**Returns:** SemanticChunkResult  
**Limitations:** Requires a valid file node, content, dependency graph, and max chunk characters to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `packChunksForAnalysis` *(function)*
**Purpose:** Packs whole semantic chunks into groups for LLM calls using best-fit.  

**Behavior:** Takes chunks, preamble, file node, dependency graph, and max chunk characters to pack the chunks into groups.

**Parameters:** chunks: SemanticChunk[], preamble: string, fileNode: FileNode, graph: DependencyGraph, maxChunkChars: number  
**Returns:** ChunkGroup[]  
**Limitations:** Requires valid chunks, preamble, file node, dependency graph, and max chunk characters to function.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `buildGroupDependencyContext` *(function)*
**Purpose:** Builds dependency context for a group of chunks by merging the referenced symbols across all chunks.  

**Behavior:** Takes a set of referenced symbols, a file node, and a dependency graph as input and returns a string representing the dependency context.

**Parameters:** referencedSymbols: Set<string>, fileNode: FileNode, graph: DependencyGraph  
**Returns:** string  
**Limitations:** Does not handle cases where the file node or graph is null or undefined.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `buildChunkDependencyContext` *(function)*
**Purpose:** Builds dependency context for a specific chunk by including only symbols from imported files that are actually referenced in the chunk's content.  

**Behavior:** Takes a chunk, a file node, and a dependency graph as input and returns a string representing the dependency context.

**Parameters:** chunk: SemanticChunk, fileNode: FileNode, graph: DependencyGraph  
**Returns:** string  
**Limitations:** Does not handle cases where the chunk, file node, or graph is null or undefined.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `buildDependencyContextForFile` *(function)*
**Purpose:** Builds dependency context for a file by including all symbols from imported files.  

**Behavior:** Takes a file node and a dependency graph as input and returns a string representing the dependency context.

**Parameters:** fileNode: FileNode, graph: DependencyGraph  
**Returns:** string  
**Limitations:** Does not handle cases where the file node or graph is null or undefined.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `buildSystemPrompt` *(function)*
**Purpose:** Returns a string representing the system prompt for the LLM.  

**Behavior:** Returns a string describing the purpose and behavior of the LLM.

**Returns:** string  
**Limitations:** None.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `isContextSizeError` *(function)*
**Purpose:** Determines whether an error is a context-window-exceeded failure.  

**Behavior:** Takes an error as input and returns a boolean indicating whether the error is a context-window-exceeded failure.

**Parameters:** e: unknown  
**Returns:** boolean  
**Limitations:** Does not handle cases where the error is null or undefined.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `isTransientNetworkError` *(function)*
**Purpose:** Determines whether an error is a transient network issue worth retrying.  

**Behavior:** Takes an error as input and returns a boolean indicating whether the error is a transient network issue.

**Parameters:** e: unknown  
**Returns:** boolean  
**Limitations:** Does not handle cases where the error is null or undefined.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `callWithRetry` *(function)*
**Purpose:** Retries a function up to MAX_RETRIES times on RateLimitError or transient network errors.  

**Behavior:** Takes a function and a label as input and returns the result of the function or undefined if it fails.

**Parameters:** fn: () => Promise<T>, label: string  
**Returns:** T | undefined  
**Limitations:** Does not handle cases where the function or label is null or undefined.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `renderContextMarkdown` *(function)*
**Purpose:** Renders markdown for a file context.  

**Behavior:** Takes a file context as input and returns a string representing the markdown.

**Parameters:** ctx: FileContext  
**Returns:** string  
**Limitations:** Does not handle cases where the file context is null or undefined.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  

### `sleep` *(function)*
**Purpose:** Returns a promise that resolves after a specified amount of time.  

**Behavior:** Takes a time in milliseconds as input and returns a promise that resolves after that time.

**Parameters:** ms: number  
**Returns:** Promise<void>  
**Limitations:** None.  
**Used by:** `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/test/suite/indexer.test.ts`  
