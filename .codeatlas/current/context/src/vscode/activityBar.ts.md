# src/vscode/activityBar.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:37.349Z  

## Overview
This file provides the implementation for the Code Atlas activity bar in Visual Studio Code, which displays a tree view of available actions and statistics.

## Dependencies
- `src/core/workflow/runner.ts`
- `src/core/stats/usageStats.ts`
- `src/llm/factory.ts`
- `src/llm/types.ts`

## Symbols

### `CodeAtlasActivityProvider` *(class)*
**Purpose:** Provides the activity bar tree view with actions and statistics for Code Atlas.  

**Behavior:** Handles events, updates the tree view, and disposes of resources.

**Parameters:** None  
**Returns:** None  
**Limitations:** Requires the Code Atlas extension to be installed and configured.  
**Used by:** `src/extension.ts`  

### `ActivityItem` *(class)*
**Purpose:** Represents a single item in the activity bar tree view.  

**Behavior:** Constructs a tree item with label, tooltip, and command.

**Parameters:** label, tooltip, collapsibleState, command, contextValue  
**Returns:** TreeItem  
**Limitations:** None  
**Used by:** `src/extension.ts`  

### `refresh` *(function)*
**Purpose:** Refreshes the activity bar tree view.  

**Behavior:** Triggers an event to update the tree view.

**Parameters:** None  
**Returns:** None  
**Limitations:** Requires the Code Atlas extension to be installed and configured.  
**Used by:** `src/extension.ts`  

### `getRootItems` *(function)*
**Purpose:** Returns the root items for the activity bar tree view.  

**Behavior:** Constructs the tree view with actions and statistics.

**Parameters:** None  
**Returns:** Promise<ActivityItem[]>  
**Limitations:** Requires the Code Atlas extension to be installed and configured.  
**Used by:** `src/extension.ts`  

### `dispose` *(function)*
**Purpose:** Disposes of resources used by the activity bar tree view.  

**Behavior:** Disposes of event emitter and disposable resources.

**Parameters:** None  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/extension.ts`  
