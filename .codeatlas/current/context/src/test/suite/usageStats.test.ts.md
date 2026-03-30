# src/test/suite/usageStats.test.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:42.631Z  

## Overview
This file contains unit tests for the UsageTracker class and the getStatsDisplay function, which are used to track and display usage statistics for language models.

## Dependencies
- `src/core/stats/usageStats.ts`
- `src/llm/types.ts`

## Symbols

### `UsageTracker` *(class)*
**Purpose:** Tracks usage statistics for language models, including input tokens, output tokens, unsplit tokens, request count, and total duration.  

**Behavior:** Accumulates statistics across multiple calls to the recordCall method, which updates the tracker's state based on the provided response and duration.

**Parameters:** LLMResponse, duration  
**Returns:** void  
**Limitations:** Does not handle responses with missing token information.  

### `getStatsDisplay` *(function)*
**Purpose:** Computes and formats usage statistics for display, including total tokens, average input tokens per run, average output tokens per run, and average files per run.  

**Behavior:** Takes a UsageStatsData object as input and returns a StatsDisplay object, which contains the formatted statistics.

**Parameters:** UsageStatsData  
**Returns:** StatsDisplay  
**Limitations:** Does not handle cases where workflow runs is 0.  

### `recordCall` *(method)*
**Purpose:** Updates the UsageTracker's state based on the provided response and duration.  

**Behavior:** Accumulates statistics across multiple calls, including input tokens, output tokens, unsplit tokens, request count, and total duration.

**Parameters:** LLMResponse, duration  
**Returns:** void  
**Limitations:** Does not handle responses with missing token information.  

### `makeStats` *(function)*
**Purpose:** Creates a UsageStatsData object with default values and optional overrides.  

**Behavior:** Returns a UsageStatsData object with the specified provider name and overrides.

**Parameters:** string, Partial<{inputTokens: number, outputTokens: number, unsplitTokens: number, requestCount: number, filesAnalyzed: number, filesFromCache: number, errors: number, totalDurationMs: number, workflowRuns: number}>  
**Returns:** UsageStatsData  
**Limitations:** None  
