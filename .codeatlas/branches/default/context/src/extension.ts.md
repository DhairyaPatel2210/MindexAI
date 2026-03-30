# src/extension.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:21.540Z  

## Overview
This file is the main entry point for the CodeAtlas extension, responsible for initializing and managing the extension's functionality, including setting up the UI, handling user interactions, and performing analysis tasks.

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
**Purpose:** Initializes the CodeAtlas extension and sets up its functionality  

**Behavior:** Creates and configures the main panel, status bar, and activity bar, and registers commands for user interactions

**Parameters:** vscode.ExtensionContext  
**Returns:** void  
**Limitations:** Must be called once when the extension is activated  

### `deactivate` *(function)*
**Purpose:** Cleans up and disposes of the CodeAtlas extension's resources  

**Behavior:** Disposes of the auto-update timer, server manager, and logger

**Parameters:** void  
**Returns:** void  
**Limitations:** Must be called when the extension is deactivated  

### `setupAutoUpdate` *(function)*
**Purpose:** Sets up the auto-update functionality for the CodeAtlas extension  

**Behavior:** Configures the file watcher and branch polling, and registers commands for user interactions

**Parameters:** vscode.ExtensionContext, CodeAtlasActivityProvider  
**Returns:** void  
**Limitations:** Must be called once when the extension is activated  

### `disposeAutoUpdate` *(function)*
**Purpose:** Cleans up and disposes of the auto-update resources  

**Behavior:** Clears the branch polling interval and file watcher

**Parameters:** void  
**Returns:** void  
**Limitations:** Must be called when the extension is deactivated  

### `buildWorkflowOptions` *(function)*
**Purpose:** Builds the workflow options for the CodeAtlas extension  

**Behavior:** Configures the workflow options based on the user's configuration

**Parameters:** vscode.WorkspaceConfiguration, LLMProviderType  
**Returns:** WorkflowOptions  
**Limitations:** Must be called when running a workflow  

### `handleWorkflowError` *(function)*
**Purpose:** Handles errors that occur during workflow execution  

**Behavior:** Displays an error message to the user and logs the error

**Parameters:** unknown, CodeAtlasStatusBar  
**Returns:** void  
**Limitations:** Must be called when an error occurs during workflow execution  
