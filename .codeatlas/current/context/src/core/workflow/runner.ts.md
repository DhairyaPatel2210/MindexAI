# src/core/workflow/runner.ts
**Language:** typescript  
**Analyzed:** 2026-04-01T19:49:18.638Z  

## Overview
This file defines the workflow runner for the CoAtlas code analysis tool, responsible for managing the analysis process, including file collection, dependency graph building, caching, and semantic index construction.

## Dependencies
- `src/llm/types.ts`
- `src/core/analyzer/graphBuilder.ts`
- `src/core/analyzer/indexer.ts`
- `src/llm/rateLimiter.ts`
- `src/core/stats/usageStats.ts`
- `src/utils/logger.ts`

## Symbols

### `WorkflowOptions` *(interface)*
**Purpose:** Configuration options for the workflow runner  

**Behavior:** Defines the settings for the analysis process, including rate limiting, batching, and concurrency

**Parameters:** requestsPerMinute, maxFileSizeKB, maxChunkChars, batchFiles, concurrentRequests  
**Returns:** None  
**Limitations:** Must be provided when running the workflow  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `WorkflowResult` *(interface)*
**Purpose:** Result of the workflow execution  

**Behavior:** Contains information about the analysis process, including the number of files analyzed, cached, and errors encountered

**Parameters:** filesAnalyzed, filesFromCache, symbolsIndexed, errors, duration  
**Returns:** None  
**Limitations:** Generated automatically by the workflow runner  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `isWorkflowRunning` *(function)*
**Purpose:** Check if a workflow is currently running  

**Behavior:** Returns true if a workflow is running, false otherwise

**Parameters:** None  
**Returns:** boolean  
**Limitations:** Must be called from the main thread  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `cancelWorkflow` *(function)*
**Purpose:** Cancel the current workflow  

**Behavior:** Cancels the current workflow, releasing any resources held

**Parameters:** None  
**Returns:** None  
**Limitations:** Must be called from the main thread  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `activateBranch` *(function)*
**Purpose:** Activate the current branch and retrieve its HEAD commit  

**Behavior:** Returns the branch name and HEAD commit

**Parameters:** None  
**Returns:** object  
**Limitations:** Must be called from the main thread  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `runFullWorkflow` *(function)*
**Purpose:** Run the full workflow for the given LLM provider and options  

**Behavior:** Executes the full analysis process, including file collection, dependency graph building, caching, and semantic index construction

**Parameters:** llm, options  
**Returns:** WorkflowResult  
**Limitations:** Must be called from the main thread  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `runIncrementalUpdate` *(function)*
**Purpose:** Run the incremental update workflow for the given LLM provider and options  

**Behavior:** Executes the incremental update process, including detecting changes, updating the branch state, and re-running the full workflow if necessary

**Parameters:** llm, options  
**Returns:** WorkflowResult  
**Limitations:** Must be called from the main thread  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `runSingleFileAnalysis` *(function)*
**Purpose:** Analyzes a single source file using the LLM and updates the shared cache and branch state.  

**Behavior:** Activates the branch, collects source files, builds the dependency graph, and analyzes the file using the LLM. Caches the result and updates the branch state.

**Parameters:** filePath: string, llm: ILLMProvider, options: WorkflowOptions  
**Returns:** Promise<void>  
**Limitations:** Requires the file to be in the workspace source files.  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `runConcurrent` *(function)*
**Purpose:** Runs an array of async tasks with at most `concurrency` running in parallel.  

**Behavior:** Creates an array of results and uses a worker function to run the tasks in parallel. Returns the array of results.

**Parameters:** tasks: Array<() => Promise<T>>, concurrency: number  
**Returns:** Promise<Array<{ result?: T; error?: unknown }>>  
**Limitations:** Requires the tasks to be async functions that return a promise.  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `topologicalSort` *(function)*
**Purpose:** Performs a topological sort on a dependency graph.  

**Behavior:** Uses a recursive visit function to traverse the graph and returns an array of nodes in topological order.

**Parameters:** graph: DependencyGraph  
**Returns:** string[]  
**Limitations:** Requires the graph to be a valid dependency graph.  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `checkCancellation` *(function)*
**Purpose:** Checks if a cancellation token has been requested.  

**Behavior:** Throws a CancellationError if the token has been requested.

**Parameters:** token: vscode.CancellationToken  
**Returns:** void  
**Limitations:** Requires the token to be a valid cancellation token.  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  
