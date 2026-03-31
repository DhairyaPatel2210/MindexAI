# src/test/suite/usageStats.test.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:54.355Z  

## Overview
This file contains unit tests for the usage statistics functionality, specifically for the UsageTracker class and the getStatsDisplay function.

## Dependencies
- `src/core/stats/usageStats.ts`
- `src/llm/types.ts`

## Symbols

### `UsageTracker` *(class)*
**Purpose:** Tracks usage statistics for a workflow, including input tokens, output tokens, unsplit tokens, request count, and total duration.  

**Behavior:** Accumulates statistics across multiple calls to recordCall, handles responses with and without token information, and prefers split tokens over combined totals.

**Parameters:** LLMResponse, durationMs  
**Returns:** void  
**Limitations:** Does not handle cases where response contains both split and total token information.  

### `getStatsDisplay` *(function)*
**Purpose:** Computes a displayable representation of usage statistics from a UsageStatsData object.  

**Behavior:** Calculates total tokens, average input tokens per run, average output tokens per run, average files per run, and duration in minutes, and rounds averages to nearest integer.

**Parameters:** UsageStatsData  
**Returns:** StatsDisplay  
**Limitations:** Does not handle cases where UsageStatsData object is invalid or missing required information.  
