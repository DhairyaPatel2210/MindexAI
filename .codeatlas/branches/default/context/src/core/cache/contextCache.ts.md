# src/core/cache/contextCache.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:16.383Z  

## Overview
Provides a cache for file contexts.

## Dependencies
- `src/core/analyzer/fileAnalyzer.ts`
- `src/utils/logger.ts`

## Symbols

### `CacheEntry` *(interface)*
**Purpose:** Represents a cache entry that contains a file context and its content hash.  

**Behavior:** Contains contentHash, fileContext, and cachedAt.

**Parameters:** contentHash: string; fileContext: FileContext; cachedAt: string;  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `cacheFileContext` *(function)*
**Purpose:** Caches a file context in the shared cache.  

**Behavior:** Stores the file context in the cache with its content hash as the key.

**Parameters:** contentHash: string; ctx: FileContext;  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `getCachedFileContext` *(function)*
**Purpose:** Retrieves a cached file context from the shared cache.  

**Behavior:** Returns the cached file context if it exists, otherwise returns null.

**Parameters:** contentHash: string;  
**Returns:** FileContext | null  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `hasCachedContext` *(function)*
**Purpose:** Checks if a cached context exists for a given content hash.  

**Behavior:** Returns true if the cached context exists, otherwise returns false.

**Parameters:** contentHash: string;  
**Returns:** boolean  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `loadBranchState` *(function)*
**Purpose:** Loads the branch state for a specific branch.  

**Behavior:** Returns the branch state if it exists, otherwise returns null.

**Parameters:** branch: string;  
**Returns:** BranchState | null  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `saveBranchState` *(function)*
**Purpose:** Saves the branch state for the active branch.  

**Behavior:** Stores the branch state in the branch-state.json file.

**Parameters:** state: BranchState;  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `updateBranchState` *(function)*
**Purpose:** Updates the branch state after a workflow run.  

**Behavior:** Merges new file hashes and updates the headCommit.

**Parameters:** branch: string; headCommit: string; fileHashes: Record<string, string>;  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `removeFromBranchState` *(function)*
**Purpose:** Removes deleted files from the branch state.  

**Behavior:** Deletes the file hashes of the deleted files.

**Parameters:** branch: string; filePaths: string[];  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `hasBranchIndex` *(function)*
**Purpose:** Checks if a branch has been previously indexed.  

**Behavior:** Returns true if the branch has been indexed, otherwise returns false.

**Parameters:** branch: string;  
**Returns:** boolean  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `batchCacheContexts` *(function)*
**Purpose:** Batch-caches multiple file contexts into the shared cache and updates the branch state.  

**Behavior:** Stores the file contexts in the cache and updates the branch state.

**Parameters:** contexts: Array<{ contentHash: string; ctx: FileContext }>; branch: string; headCommit: string;  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `partitionByCacheHit` *(function)*
**Purpose:** Partitions a list of files into cached and uncached files.  

**Behavior:** Returns an object with cached and uncached files.

**Parameters:** files: Array<{ relativePath: string; contentHash: string }>  
**Returns:** { cached: Array<{ relativePath: string; ctx: FileContext }>; uncached: string[] }  
**Limitations:** None  
**Used by:** `src/extension.ts`  
