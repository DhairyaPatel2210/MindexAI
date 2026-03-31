# src/core/cache/contextCache.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:26.117Z  

## Overview
Defines a cache for file contexts.

## Dependencies
- `src/core/analyzer/fileAnalyzer.ts`
- `src/utils/logger.ts`

## Symbols

### `CacheEntry` *(interface)*
**Purpose:** Represents a cache entry.  

**Behavior:** Has three properties: contentHash, fileContext, and cachedAt.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must have contentHash, fileContext, and cachedAt properties.  
**Used by:** `src/extension.ts`  

### `cacheFileContext` *(function)*
**Purpose:** Caches a file context.  

**Behavior:** Stores a file context in the cache.

**Parameters:** contentHash: string, ctx: FileContext  
**Returns:** None  
**Limitations:** Must store the file context in the cache.  
**Used by:** `src/extension.ts`  

### `getCachedFileContext` *(function)*
**Purpose:** Gets a cached file context.  

**Behavior:** Returns the cached file context or null if not cached.

**Parameters:** contentHash: string  
**Returns:** FileContext | null  
**Limitations:** Must return the cached file context or null.  
**Used by:** `src/extension.ts`  

### `hasCachedContext` *(function)*
**Purpose:** Checks if a cached context exists.  

**Behavior:** Returns true if a cached context exists, false otherwise.

**Parameters:** contentHash: string  
**Returns:** boolean  
**Limitations:** Must return true if a cached context exists, false otherwise.  
**Used by:** `src/extension.ts`  
