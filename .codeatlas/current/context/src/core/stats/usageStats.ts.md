# src/core/stats/usageStats.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:29.158Z  

## Overview
This file provides functionality for tracking and persisting usage statistics of language models (LLMs) across multiple workflow runs, including input/output token counts, request counts, and error rates.

## Dependencies
- `src/llm/types.ts`
- `src/utils/fileUtils.ts`
- `src/utils/logger.ts`

## Symbols

### `ProviderStats` *(interface)*
**Purpose:** Represents statistics for a single LLM provider, including input/output token counts, request counts, and error rates.  

**Behavior:** Stores aggregated statistics for a provider across multiple workflow runs.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens from providers that do not split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `RunRecord` *(interface)*
**Purpose:** Represents a single workflow run, including timestamp, provider, input/output token counts, and error rates.  

**Behavior:** Stores information about a single workflow run, including timestamp, provider, input/output token counts, and error rates.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens from providers that do not split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `UsageStatsData` *(interface)*
**Purpose:** Represents the overall usage statistics, including provider statistics, global statistics, and run history.  

**Behavior:** Stores aggregated statistics for all providers across multiple workflow runs, including provider statistics, global statistics, and run history.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens from providers that do not split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `StatsDisplay` *(interface)*
**Purpose:** Represents a display of usage statistics, including provider statistics and global statistics.  

**Behavior:** Displays aggregated statistics for all providers across multiple workflow runs, including provider statistics and global statistics.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens from providers that do not split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `UsageTracker` *(class)*
**Purpose:** A lightweight accumulator that tracks usage statistics for a single workflow run.  

**Behavior:** Accumulates usage statistics for a single workflow run, including input/output token counts, request counts, and error rates.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens from providers that do not split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `getStatsDisplay` *(function)*
**Purpose:** Returns a display of usage statistics for a given usage statistics data.  

**Behavior:** Calculates and returns a display of usage statistics for a given usage statistics data.

**Parameters:** data: UsageStatsData  
**Returns:** StatsDisplay  
**Limitations:** Does not account for unsplit tokens from providers that do not split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `loadUsageStats` *(function)*
**Purpose:** Loads persisted usage statistics from file.  

**Behavior:** Loads persisted usage statistics from file and returns the data.

**Parameters:** None  
**Returns:** UsageStatsData  
**Limitations:** Returns empty stats if file does not exist or is invalid.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `saveUsageStats` *(function)*
**Purpose:** Saves usage statistics to file.  

**Behavior:** Saves usage statistics to file and logs an error if saving fails.

**Parameters:** data: UsageStatsData  
**Returns:** None  
**Limitations:** Logs an error if saving fails.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `persistWorkflowUsage` *(function)*
**Purpose:** Merges a completed workflow run's tracker into the persisted stats.  

**Behavior:** Merges a completed workflow run's tracker into the persisted stats and logs an info message.

**Parameters:** providerName: string, tracker: UsageTracker, filesAnalyzed: number, filesFromCache: number, errorCount: number  
**Returns:** None  
**Limitations:** Logs an info message.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `resetUsageStats` *(function)*
**Purpose:** Resets all persisted usage statistics.  

**Behavior:** Resets all persisted usage statistics and logs an info message.

**Parameters:** None  
**Returns:** None  
**Limitations:** Logs an info message.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  
