# src/core/cache/contextCache.ts
**Language:** typescript  
**Analyzed:** 2026-04-01T19:49:17.118Z  

## Overview
This file implements a caching mechanism for storing and retrieving file contexts and branch states, allowing for incremental analysis and caching of file changes.

## Dependencies
- `src/core/analyzer/fileAnalyzer.ts`
- `src/utils/logger.ts`

## Symbols

### `CacheEntry` *(interface)*
**Purpose:** Represents a cached file context, including its content hash, file context, and optional chunk-level entries.  

**Behavior:** Stores file context and chunk-level entries in a shared cache, keyed by content hash.

**Parameters:** contentHash: string, fileContext: FileContext, chunkEntries?: ChunkCacheEntry[]  
**Returns:** void  
**Limitations:** Only stores file contexts and chunk-level entries for identical file content.  
**Used by:** `src/extension.ts`  

### `getCacheEntryPath` *(function)*
**Purpose:** Returns the path to a cached file context entry based on its content hash.  

**Behavior:** Uses the first 2 characters of the content hash as a subdirectory to avoid huge flat directories.

**Parameters:** contentHash: string  
**Returns:** string  
**Limitations:** Assumes the shared cache directory exists.  
**Used by:** `src/extension.ts`  

### `cacheFileContext` *(function)*
**Purpose:** Stores a file context in the shared cache, keyed by content hash.  

**Behavior:** Writes the file context and optional chunk-level entries to a JSON file in the shared cache.

**Parameters:** contentHash: string, ctx: FileContext, chunkEntries?: ChunkCacheEntry[]  
**Returns:** void  
**Limitations:** Only stores file contexts and chunk-level entries for identical file content.  
**Used by:** `src/extension.ts`  

### `getCachedFileContext` *(function)*
**Purpose:** Retrieves a cached file context by content hash from the shared cache.  

**Behavior:** Reads the file context from a JSON file in the shared cache, or returns null if not cached.

**Parameters:** contentHash: string  
**Returns:** FileContext | null  
**Limitations:** Only returns the file context, not chunk-level entries.  
**Used by:** `src/extension.ts`  

### `hasCachedContext` *(function)*
**Purpose:** Checks if a cached context exists for a given content hash.  

**Behavior:** Returns true if the file context is cached, false otherwise.

**Parameters:** contentHash: string  
**Returns:** boolean  
**Limitations:** Only checks for the existence of the file context, not chunk-level entries.  
**Used by:** `src/extension.ts`  

### `getCachedChunkEntries` *(function)*
**Purpose:** Retrieves chunk-level cache entries from a previous file version.  

**Behavior:** Reads the chunk-level entries from a JSON file in the shared cache, or returns null if not cached.

**Parameters:** contentHash: string  
**Returns:** ChunkCacheEntry[] | null  
**Limitations:** Only returns chunk-level entries, not the file context.  
**Used by:** `src/extension.ts`  

### `BranchState` *(interface)*
**Purpose:** Represents the branch state, including its version, branch name, head commit, last indexed at, and file hashes.  

**Behavior:** Stores branch state in a JSON file, keyed by branch name.

**Parameters:** version: string, branch: string, headCommit: string, lastIndexedAt: string, fileHashes: Record<string, string>  
**Returns:** void  
**Limitations:** Only stores branch state for the active branch.  
**Used by:** `src/extension.ts`  

### `loadBranchState` *(function)*
**Purpose:** Loads the branch state for a specific branch.  

**Behavior:** Reads the branch state from a JSON file, or returns null if not cached.

**Parameters:** branch: string  
**Returns:** BranchState | null  
**Limitations:** Only returns the branch state, not file hashes.  
**Used by:** `src/extension.ts`  

### `saveBranchState` *(function)*
**Purpose:** Saves the branch state for the active branch.  

**Behavior:** Writes the branch state to a JSON file.

**Parameters:** state: BranchState  
**Returns:** void  
**Limitations:** Only saves branch state for the active branch.  
**Used by:** `src/extension.ts`  

### `updateBranchState` *(function)*
**Purpose:** Updates the branch state after a workflow run.  

**Behavior:** Merges new file hashes and updates the head commit.

**Parameters:** branch: string, headCommit: string, fileHashes: Record<string, string>  
**Returns:** void  
**Limitations:** Only updates branch state for the active branch.  
**Used by:** `src/extension.ts`  

### `removeFromBranchState` *(function)*
**Purpose:** Removes deleted files from the branch state.  

**Behavior:** Deletes file hashes from the branch state.

**Parameters:** branch: string, filePaths: string[]  
**Returns:** void  
**Limitations:** Only removes file hashes for the active branch.  
**Used by:** `src/extension.ts`  

### `hasBranchIndex` *(function)*
**Purpose:** Checks if a branch has been previously indexed.  

**Behavior:** Returns true if the branch state is cached, false otherwise.

**Parameters:** branch: string  
**Returns:** boolean  
**Limitations:** Only checks for the existence of the branch state.  
**Used by:** `src/extension.ts`  

### `batchCacheContexts` *(function)*
**Purpose:** Batch-caches multiple file contexts into the shared cache and updates branch state.  

**Behavior:** Writes file contexts and optional chunk-level entries to the shared cache and updates the branch state.

**Parameters:** contexts: Array<{ contentHash: string; ctx: FileContext; chunkEntries?: ChunkCacheEntry[] }>, branch: string, headCommit: string  
**Returns:** void  
**Limitations:** Only batch-caches file contexts and chunk-level entries for identical file content.  
**Used by:** `src/extension.ts`  

### `partitionByCacheHit` *(function)*
**Purpose:** Given a set of files with their current content hashes, determines which files can be restored from the shared cache and which need re-analysis.  

**Behavior:** Partitions the files into cached and uncached sets based on their content hashes.

**Parameters:** files: Array<{ relativePath: string; contentHash: string }>  
**Returns:** { cached: Array<{ relativePath: string; ctx: FileContext }>; uncached: string[] }  
**Limitations:** Only returns the partitioned files, not chunk-level entries.  
**Used by:** `src/extension.ts`  
