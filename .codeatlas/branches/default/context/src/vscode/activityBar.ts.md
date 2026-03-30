# src/vscode/activityBar.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:15.512Z  

## Overview
CodeAtlasActivityProvider class that displays the CodeAtlas activity bar item in the VS Code activity bar.

## Dependencies
- `src/core/workflow/runner.ts`
- `src/core/stats/usageStats.ts`
- `src/llm/factory.ts`
- `src/llm/types.ts`

## Symbols

### `CodeAtlasActivityProvider` *(class)*
**Purpose:** Display the CodeAtlas activity bar item.  

**Behavior:** Creates an activity bar item and updates its children based on the CodeAtlas workflow status.

**Returns:** void  
**Limitations:** Requires VS Code and may throw errors if VS Code is not available.  
**Used by:** `src/extension.ts`  
