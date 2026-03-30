# src/llm/rateLimiter.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:16.383Z  

## Overview
Provides a rate limiter for the LLM module.

## Dependencies
- `src/utils/logger.ts`

## Symbols

### `RateLimiter` *(class)*
**Purpose:** Represents a rate limiter that tracks timestamps of recent requests.  

**Behavior:** Provides an acquire method that blocks until it is safe to proceed.

**Parameters:** maxRequestsPerMinute: number;  
**Returns:** Promise<void>  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/rateLimiter.test.ts`  

### `sleep` *(function)*
**Purpose:** Provides a function that sleeps for a specified amount of time.  

**Behavior:** Returns a promise that resolves after the specified time.

**Parameters:** ms: number;  
**Returns:** Promise<void>  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/rateLimiter.test.ts`  
