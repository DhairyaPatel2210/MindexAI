# src/llm/rateLimiter.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:26.117Z  

## Overview
Defines a rate limiter utility for the LLM module.

## Dependencies
- `src/utils/logger.ts`

## Symbols

### `RateLimiter` *(class)*
**Purpose:** Represents a rate limiter that tracks timestamps of recent requests.  

**Behavior:** Has two properties: windowMs and timestamps.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must have windowMs and timestamps properties.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/rateLimiter.test.ts`  

### `acquire` *(method)*
**Purpose:** Acquires a rate limiter slot.  

**Behavior:** Blocks until a slot is available.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must block until a slot is available.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/rateLimiter.test.ts`  

### `usedInWindow` *(method)*
**Purpose:** Gets the number of requests used in the current window.  

**Behavior:** Returns the number of requests used in the current window.

**Parameters:** None  
**Returns:** number  
**Limitations:** Must return the number of requests used in the current window.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/rateLimiter.test.ts`  
