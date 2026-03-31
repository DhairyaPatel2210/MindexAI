# src/extension.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T22:02:45.378Z  

## Overview
This file is the main entry point for the CodeAtlas extension, responsible for initializing and managing the extension's functionality, including status bar, main panel, activity bar, and auto-update features.

## Dependencies
- `src/llm/factory.ts`
- `src/server/serverManager.ts`
- `src/vscode/panel/mainPanel.ts`
- `src/vscode/statusBar.ts`
- `src/vscode/activityBar.ts`
- `src/utils/logger.ts`
- `src/llm/types.ts`
- `src/core/git/gitService.ts`
- `src/core/cache/contextCache.ts`

## Symbols

### `activate` *(function)*
**Purpose:** Initialize and activate the CodeAtlas extension  

**Behavior:** Sets up the extension's UI components, command handlers, and auto-update features

**Parameters:** vscode.ExtensionContext  
**Returns:** void  
**Limitations:** Must be called once to initialize the extension  

### `deactivate` *(function)*
**Purpose:** Deactivate and clean up the CodeAtlas extension  

**Behavior:** Disposes of auto-update and server manager resources

**Parameters:** void  
**Returns:** void  
**Limitations:** Must be called when the extension is deactivated  

### `setupAutoUpdate` *(function)*
**Purpose:** Set up auto-update features for the CodeAtlas extension  

**Behavior:** Configures file watcher and branch polling

**Parameters:** vscode.ExtensionContext, CodeAtlasActivityProvider  
**Returns:** void  
**Limitations:** Must be called once to set up auto-update  

### `disposeAutoUpdate` *(function)*
**Purpose:** Dispose of auto-update resources  

**Behavior:** Clears file watcher and branch polling

**Parameters:** void  
**Returns:** void  
**Limitations:** Must be called when auto-update is disabled  

### `disposeAutoUpdate` *(function)*
**Purpose:** Dispose of auto-update resources, including clearing intervals and file watchers.  

**Behavior:** Clears the branch poll interval and file watcher, and resets the last known branch and head.

**Returns:** void  
**Limitations:** Must be called when the extension is being disposed of to prevent memory leaks.  

### `buildWorkflowOptions` *(function)*
**Purpose:** Builds workflow options based on the VSCode workspace configuration and the LLM provider type.  

**Behavior:** Calculates workflow options such as requests per minute, max file size, and concurrent requests based on the configuration and provider type.

**Parameters:** config: vscode.WorkspaceConfiguration, provider: LLMProviderType  
**Returns:** WorkflowOptions  
**Limitations:** Requires a valid VSCode workspace configuration and LLM provider type.  

### `handleWorkflowError` *(function)*
**Purpose:** Handles workflow errors by displaying error messages and logging the error.  

**Behavior:** Displays an error message to the user and logs the error, depending on the type of error.

**Parameters:** e: unknown, statusBar: CodeAtlasStatusBar  
**Returns:** void  
**Limitations:** Must be called when a workflow error occurs to display the error message and log the error.  
