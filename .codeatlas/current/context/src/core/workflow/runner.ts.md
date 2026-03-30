# src/core/workflow/runner.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:20.105Z  

## Overview
This file contains the core logic for the CodeAtlas workflow, which analyzes source files and builds a semantic index for code understanding and navigation.

## Dependencies
- `src/llm/types.ts`
- `src/core/analyzer/graphBuilder.ts`
- `src/core/analyzer/indexer.ts`
- `src/llm/rateLimiter.ts`
- `src/core/stats/usageStats.ts`
- `src/utils/logger.ts`

## Symbols

### `WorkflowOptions` *(interface)*
**Purpose:** Configuration options for the CodeAtlas workflow  

**Behavior:** Defines the settings for the workflow, including rate limits, file size limits, and concurrency options

**Parameters:** requestsPerMinute, maxFileSizeKB, maxChunkChars, batchFiles, concurrentRequests  
**Returns:** None  
**Limitations:** Must be an object with the specified properties  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `WorkflowResult` *(interface)*
**Purpose:** Result object for the CodeAtlas workflow  

**Behavior:** Contains information about the workflow's progress and outcome

**Parameters:** filesAnalyzed, filesFromCache, symbolsIndexed, errors, duration  
**Returns:** None  
**Limitations:** Must be an object with the specified properties  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `activateBranch` *(function)*
**Purpose:** Activate the current branch before running the workflow  

**Behavior:** Resolves and sets the active branch, returning the branch name and current HEAD commit

**Parameters:** None  
**Returns:** Object with branch name and HEAD commit  
**Limitations:** Must be called before running the workflow  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `runFullWorkflow` *(function)*
**Purpose:** Run the full CodeAtlas workflow  

**Behavior:** Analyzes all source files, builds a dependency graph, and creates a semantic index

**Parameters:** llm, options  
**Returns:** WorkflowResult  
**Limitations:** Must be called with a valid LLM provider and workflow options  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `runIncrementalUpdate` *(function)*
**Purpose:** Run an incremental update of the CodeAtlas workflow  

**Behavior:** Updates the semantic index with changes to source files

**Parameters:** llm, options  
**Returns:** WorkflowResult  
**Limitations:** Must be called with a valid LLM provider and workflow options  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `runSingleFileAnalysis` *(function)*
**Purpose:** Run a single-file analysis of the CodeAtlas workflow  

**Behavior:** Analyzes a single source file and creates a semantic index for it

**Parameters:** filePath, llm, options  
**Returns:** None  
**Limitations:** Must be called with a valid file path, LLM provider, and workflow options  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `topologicalSort` *(function)*
**Purpose:** Perform a topological sort on a dependency graph  

**Behavior:** Returns a list of nodes in topological order

**Parameters:** graph  
**Returns:** List of node names  
**Limitations:** Must be called with a valid dependency graph  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `checkCancellation` *(function)*
**Purpose:** Check if a cancellation request has been made  

**Behavior:** Throws a cancellation error if the token is cancelled

**Parameters:** token  
**Returns:** None  
**Limitations:** Must be called with a valid cancellation token  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  

### `runConcurrent` *(function)*
**Purpose:** Run an array of async tasks with concurrency  

**Behavior:** Returns a list of task outcomes

**Parameters:** tasks, concurrency  
**Returns:** List of task outcomes  
**Limitations:** Must be called with a valid array of tasks and concurrency level  
**Used by:** `src/vscode/activityBar.ts`, `src/vscode/statusBar.ts`  
