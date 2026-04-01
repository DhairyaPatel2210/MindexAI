# src/core/stats/usageStats.ts
**Language:** typescript  
**Analyzed:** 2026-04-01T19:49:12.460Z  

## Overview
This file provides functionality for tracking and persisting usage statistics of a language model, including input/output tokens, request count, files analyzed, and errors. It also includes a lightweight in-memory tracker for accumulating statistics during a single workflow run.

## Dependencies
- `src/llm/types.ts`
- `src/utils/fileUtils.ts`
- `src/utils/logger.ts`

## Symbols

### `ProviderStats` *(interface)*
**Purpose:** Represents statistics for a single provider, including input/output tokens, request count, files analyzed, and errors.  

**Behavior:** Provides a structure for storing and retrieving provider-specific statistics.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens when provider doesn't split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `RunRecord` *(interface)*
**Purpose:** Represents a single run record, including timestamp, provider, input/output tokens, files analyzed, and duration.  

**Behavior:** Provides a structure for storing and retrieving run-specific statistics.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens when provider doesn't split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `UsageStatsData` *(interface)*
**Purpose:** Represents the overall usage statistics, including provider-specific statistics and global statistics.  

**Behavior:** Provides a structure for storing and retrieving usage statistics.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens when provider doesn't split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `StatsDisplay` *(interface)*
**Purpose:** Represents a display of usage statistics, including provider-specific statistics and global statistics.  

**Behavior:** Provides a structure for displaying usage statistics in a human-readable format.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens when provider doesn't split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `getStatsDisplay` *(function)*
**Purpose:** Converts usage statistics data into a displayable format.  

**Behavior:** Takes usage statistics data as input and returns a displayable format.

**Parameters:** UsageStatsData  
**Returns:** StatsDisplay  
**Limitations:** Does not account for unsplit tokens when provider doesn't split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `UsageTracker` *(class)*
**Purpose:** Provides a lightweight in-memory tracker for accumulating statistics during a single workflow run.  

**Behavior:** Accumulates statistics during a single workflow run and provides methods for accessing these statistics.

**Parameters:** None  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens when provider doesn't split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `recordCall` *(method)*
**Purpose:** Records a single LLM API call and updates the tracker's statistics.  

**Behavior:** Takes an LLM response and duration as input and updates the tracker's statistics.

**Parameters:** LLMResponse, durationMs  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens when provider doesn't split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `statsFilePath` *(function)*
**Purpose:** Returns the file path for storing usage statistics.  

**Behavior:** Returns the file path for storing usage statistics.

**Parameters:** None  
**Returns:** string  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `emptyStats` *(function)*
**Purpose:** Returns an empty usage statistics data object.  

**Behavior:** Returns an empty usage statistics data object.

**Parameters:** None  
**Returns:** UsageStatsData  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `emptyProviderStats` *(function)*
**Purpose:** Returns an empty provider statistics object.  

**Behavior:** Returns an empty provider statistics object.

**Parameters:** None  
**Returns:** ProviderStats  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `loadUsageStats` *(function)*
**Purpose:** Loads usage statistics from file and returns the data object.  

**Behavior:** Loads usage statistics from file and returns the data object.

**Parameters:** None  
**Returns:** UsageStatsData  
**Limitations:** Returns an empty object if file is missing or corrupted.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `saveUsageStats` *(function)*
**Purpose:** Saves usage statistics to file.  

**Behavior:** Saves usage statistics to file.

**Parameters:** UsageStatsData  
**Returns:** None  
**Limitations:** Logs an error if saving fails.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `persistWorkflowUsage` *(function)*
**Purpose:** Merges a completed workflow run's tracker into the persisted stats.  

**Behavior:** Takes a provider name, tracker, files analyzed, files from cache, and error count as input and merges the tracker into the persisted stats.

**Parameters:** string, UsageTracker, number, number, number  
**Returns:** None  
**Limitations:** Does not account for unsplit tokens when provider doesn't split input/output.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `resetUsageStats` *(function)*
**Purpose:** Resets all persisted usage statistics.  

**Behavior:** Resets all persisted usage statistics.

**Parameters:** None  
**Returns:** None  
**Limitations:** Logs an info message when resetting.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/workflow/runner.ts`, `src/test/suite/usageStats.test.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  
