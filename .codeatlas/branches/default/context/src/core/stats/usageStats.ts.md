# src/core/stats/usageStats.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:18.465Z  

## Overview
This file provides functionality for tracking and persisting usage statistics of language models (LLMs) across multiple workflow runs, including input/output tokens, request counts, and error rates.

## Dependencies
- `src/llm/types.ts`
- `src/utils/fileUtils.ts`
- `src/utils/logger.ts`

## Symbols

### `ProviderStats` *(interface)*
**Purpose:** Represents statistics for a single LLM provider, including input/output tokens, request counts, and error rates.  

**Behavior:** Stores and updates provider-specific statistics, such as input/output tokens, request counts, and error rates.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for concurrent updates from multiple workflow runs.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `UsageStatsData` *(interface)*
**Purpose:** Represents the overall usage statistics, including global workflow runs and provider-specific statistics.  

**Behavior:** Stores and updates the overall usage statistics, including global workflow runs and provider-specific statistics.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for concurrent updates from multiple workflow runs.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `StatsDisplay` *(interface)*
**Purpose:** Represents the displayable statistics for a single provider, including averages and totals.  

**Behavior:** Calculates and displays the statistics for a single provider, including averages and totals.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for concurrent updates from multiple workflow runs.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `UsageTracker` *(class)*
**Purpose:** A lightweight accumulator that tracks usage statistics for a single workflow run.  

**Behavior:** Records and updates usage statistics for a single workflow run, including input/output tokens, request counts, and error rates.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for concurrent updates from multiple workflow runs.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `getStatsDisplay` *(function)*
**Purpose:** Calculates and returns the displayable statistics for a single provider.  

**Behavior:** Calculates and returns the displayable statistics for a single provider, including averages and totals.

**Parameters:** data: UsageStatsData  
**Returns:** StatsDisplay  
**Limitations:** Does not account for concurrent updates from multiple workflow runs.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `loadUsageStats` *(function)*
**Purpose:** Loads the persisted usage statistics from disk.  

**Behavior:** Loads the persisted usage statistics from disk and returns the data as a UsageStatsData object.

**Parameters:** None  
**Returns:** UsageStatsData  
**Limitations:** Does not account for concurrent updates from multiple workflow runs.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `saveUsageStats` *(function)*
**Purpose:** Saves the usage statistics to disk.  

**Behavior:** Saves the usage statistics to disk, overwriting any existing data.

**Parameters:** data: UsageStatsData  
**Returns:** None  
**Limitations:** Does not account for concurrent updates from multiple workflow runs.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `persistWorkflowUsage` *(function)*
**Purpose:** Merges a completed workflow run's tracker into the persisted stats.  

**Behavior:** Merges a completed workflow run's tracker into the persisted stats, updating the provider-specific statistics and global workflow runs.

**Parameters:** providerName: string, tracker: UsageTracker, filesAnalyzed: number, filesFromCache: number, errorCount: number  
**Returns:** None  
**Limitations:** Does not account for concurrent updates from multiple workflow runs.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `resetUsageStats` *(function)*
**Purpose:** Resets all persisted usage statistics.  

**Behavior:** Resets all persisted usage statistics, overwriting any existing data.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for concurrent updates from multiple workflow runs.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  
