# src/core/workflow/runner.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:30.994Z  

## Overview
This file contains the core logic for running workflows in the Codeatlas project, including full analysis, incremental updates, and single-file analysis. It utilizes dependency graphs, caching, and rate limiting to optimize the analysis process.

## Dependencies
- `src/llm/types.ts`
- `src/core/analyzer/graphBuilder.ts`
- `src/core/analyzer/indexer.ts`
- `src/llm/rateLimiter.ts`
- `src/core/stats/usageStats.ts`
- `src/utils/logger.ts`

## Symbols

### `runFullWorkflow` *(function)*
**Purpose:** Runs a full analysis workflow on the current branch, including collecting source files, building dependency graphs, and analyzing files with the LLM.  

**Behavior:** Iterates through the workflow steps, performing tasks such as collecting source files, building dependency graphs, checking the shared cache, analyzing files with the LLM, caching new results, and updating the branch state.

**Parameters:** llm: ILLMProvider, options: WorkflowOptions  
**Returns:** Promise<WorkflowResult>  
**Limitations:** Requires a valid ILLMProvider instance and WorkflowOptions object. May throw errors if the workflow is already running or if there are issues with the LLM or caching.  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `runIncrementalUpdate` *(function)*
**Purpose:** Runs an incremental update workflow on the current branch, including detecting changes, rebuilding dependency graphs, and analyzing updated files with the LLM.  

**Behavior:** Iterates through the workflow steps, performing tasks such as detecting changes, rebuilding dependency graphs, checking the shared cache, analyzing updated files with the LLM, caching new results, and updating the branch state.

**Parameters:** llm: ILLMProvider, options: WorkflowOptions  
**Returns:** Promise<WorkflowResult>  
**Limitations:** Requires a valid ILLMProvider instance and WorkflowOptions object. May throw errors if the workflow is already running or if there are issues with the LLM or caching.  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `runSingleFileAnalysis` *(function)*
**Purpose:** Analyzes a single file with the LLM, including checking the shared cache and caching the result.  

**Behavior:** Checks the shared cache for the file, and if it's not cached, analyzes the file with the LLM, caches the result, and updates the branch state.

**Parameters:** filePath: string, llm: ILLMProvider, options: Pick<WorkflowOptions, 'requestsPerMinute' | 'maxFileSizeKB' | 'maxChunkChars'>  
**Returns:** Promise<void>  
**Limitations:** Requires a valid filePath, ILLMProvider instance, and WorkflowOptions object. May throw errors if the file is not in the workspace source files or if there are issues with the LLM or caching.  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  
