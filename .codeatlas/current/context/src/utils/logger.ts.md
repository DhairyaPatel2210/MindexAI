# src/utils/logger.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:16.383Z  

## Overview
Provides a logging utility for the application.

## Symbols

### `Logger` *(class)*
**Purpose:** Represents a logger that can output messages to the console.  

**Behavior:** Provides methods for logging at different levels (info, warn, error, debug).

**Parameters:** None  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/providers/openaiCompat.ts`, `src/llm/rateLimiter.ts`  

### `logger` *(const)*
**Purpose:** A global logger instance.  

**Behavior:** Provides a single instance of the Logger class.

**Parameters:** None  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/providers/openaiCompat.ts`, `src/llm/rateLimiter.ts`  
