# src/test/suite/rateLimiter.test.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:16.237Z  

## Overview
Tests the rate limiter class.

## Dependencies
- `src/llm/rateLimiter.ts`

## Symbols

### `RateLimiter` *(class)*
**Purpose:** Rate limiter class.  

**Behavior:** Limits the number of requests within a time window.

**Parameters:** number  
**Returns:** RateLimiter  
**Limitations:** Does not handle edge cases correctly.  

### `acquire` *(method)*
**Purpose:** Acquires a slot in the rate limiter.  

**Behavior:** Returns a promise that resolves when a slot is acquired.

**Parameters:** None  
**Returns:** Promise<void>  
**Limitations:** Does not handle cases where the rate limiter is full.  

### `usedInWindow` *(property)*
**Purpose:** Returns the number of slots used in the time window.  

**Behavior:** Returns the number of slots used in the time window.

**Parameters:** None  
**Returns:** number  
**Limitations:** Does not handle cases where the time window is not set.  
