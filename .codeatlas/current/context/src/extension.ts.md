# src/extension.ts
**Language:** typescript  
**Analyzed:** 2026-04-11T23:19:55.735Z  

## Overview
This TypeScript file defines the main extension logic for CodeAtlas, a Visual Studio Code extension that provides code analysis and indexing features.

## Dependencies
- `src/core/analyzer/treeSitterParser.ts`
- `src/llm/factory.ts`
- `src/server/serverManager.ts`
- `src/vscode/panel/mainPanel.ts`
- `src/vscode/statusBar.ts`
- `src/vscode/activityBar.ts`
- `src/core/workflow/runner.ts`
- `src/utils/logger.ts`
- `src/llm/types.ts`
- `src/utils/fileUtils.ts`
- `src/core/git/gitService.ts`
- `src/core/cache/contextCache.ts`

## Symbols

### `activate` *(function)*
**Purpose:** Initialize the CodeAtlas extension, setting up the status bar, main panel, and activity bar.  

**Behavior:** Pre-loads tree-sitter WASM grammars, initializes secure secret storage, and sets up various commands and event listeners.

**Parameters:** vscode.ExtensionContext  
**Returns:** void  
**Limitations:** Requires the extension to be activated in a Visual Studio Code workspace.  

### `deactivate` *(function)*
**Purpose:** Clean up resources when the extension is deactivated.  

**Behavior:** Disposes of the auto-update timer, server manager, and logger.

**Returns:** void  
**Limitations:** Should be called when the extension is deactivated to prevent resource leaks.  

### `setupAutoUpdate` *(function)*
**Purpose:** Set up the auto-update feature, watching for changes in the workspace and updating the index accordingly.  

**Behavior:** Watches for changes in the workspace and updates the index using the `runIncrementalUpdate` function.

**Parameters:** vscode.ExtensionContext, CodeAtlasActivityProvider  
**Returns:** void  
**Limitations:** Requires the `autoUpdate` configuration option to be enabled.  

### `disposeAutoUpdate` *(function)*
**Purpose:** Clean up resources used by the auto-update feature.  

**Behavior:** Cancels the auto-update timer and disposes of the file watcher.

**Returns:** void  
**Limitations:** Should be called when the auto-update feature is disabled to prevent resource leaks.  

### `buildWorkflowOptions` *(function)*
**Purpose:** Build the workflow options based on the configuration and provider.  

**Behavior:** Calculates the workflow options based on the configuration and provider, including requests per minute, max file size, and concurrent requests.

**Parameters:** vscode.WorkspaceConfiguration, LLMProviderType  
**Returns:** WorkflowOptions  
**Limitations:** Requires the configuration and provider to be valid.  

### `debouncedUpdate` *(function)*
**Purpose:** Updates the index file after a short delay, debouncing repeated calls  

**Behavior:** Checks if the branch has switched, if the index file exists, and if a workflow is running. If not, it schedules an update after a 3-second delay.

**Parameters:** isBranchSwitch: boolean  
**Returns:** void  
**Limitations:** Does not handle cases where the branch has switched multiple times in quick succession  

### `handleWorkflowError` *(function)*
**Purpose:** Handles errors that occur during workflow execution  

**Behavior:** Checks the type of error and updates the status bar accordingly. If the error is a cancellation error, it shows an information message. Otherwise, it shows an error message and allows the user to view the log.

**Parameters:** e: unknown, statusBar: CodeAtlasStatusBar  
**Returns:** void  
**Limitations:** Does not handle cases where the error is not an instance of Error or vscode.CancellationError  
