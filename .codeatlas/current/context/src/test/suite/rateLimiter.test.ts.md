# src/test/suite/rateLimiter.test.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:27.515Z  

## Overview
Unit tests for rate limiter

## Dependencies
- `src/llm/rateLimiter.ts`

## Symbols

### `RateLimiter` *(class)*
**Purpose:** Rate limiter class  

**Behavior:** Creates a rate limiter instance, acquires slots, checks usedInWindow, allows acquiring up to maxRequestsPerMinute without blocking, instantiation with different limits works independently

**Parameters:** maxRequestsPerMinute: number  
**Returns:** RateLimiter  
**Limitations:** Does not handle maxRequestsPerMinute with special characters  
