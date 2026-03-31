# src/vscode/statusBar.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:26.305Z  

## Overview
CodeAtlasStatusBar is a VS Code status bar item that displays the CodeAtlas status.

## Dependencies
- `src/core/workflow/runner.ts`

## Symbols

### `CodeAtlasStatusBar` *(class)*
**Purpose:** VS Code status bar item for CodeAtlas  

**Behavior:** Displays the CodeAtlas status and handles user interactions

**Parameters:** None  
**Returns:** None  
**Limitations:** Requires VS Code to be running  
**Used by:** `src/extension.ts`  

### `setIdle` *(function)*
**Purpose:** Sets the status bar item to idle  

**Behavior:** Updates the status bar item to display the idle state

**Parameters:** None  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `setRunning` *(function)*
**Purpose:** Sets the status bar item to running  

**Behavior:** Updates the status bar item to display the running state

**Parameters:** None  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `setError` *(function)*
**Purpose:** Sets the status bar item to error  

**Behavior:** Updates the status bar item to display the error state

**Parameters:** None  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `setSuccess` *(function)*
**Purpose:** Sets the status bar item to success  

**Behavior:** Updates the status bar item to display the success state

**Parameters:** filesAnalyzed, symbolsIndexed  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `dispose` *(function)*
**Purpose:** Disposes the status bar item  

**Behavior:** Removes the status bar item

**Parameters:** None  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  
