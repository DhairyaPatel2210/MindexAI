# src/utils/logger.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:26.117Z  

## Overview
Defines a logger utility for the application.

## Symbols

### `Logger` *(class)*
**Purpose:** Represents a logger that can output messages to the console.  

**Behavior:** Has several methods: info, warn, error, debug, section, show, and dispose.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must have the above methods.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/providers/openaiCompat.ts`, `src/llm/rateLimiter.ts`  

### `logger` *(constant)*
**Purpose:** Represents a global logger instance.  

**Behavior:** Has no methods.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must be a global instance.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/analyzer/indexer.ts`, `src/core/cache/contextCache.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/providers/openaiCompat.ts`, `src/llm/rateLimiter.ts`  
