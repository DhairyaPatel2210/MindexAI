# src/vscode/statusBar.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:15.512Z  

## Overview
CodeAtlasStatusBar class that displays the CodeAtlas status bar item in the VS Code status bar.

## Dependencies
- `src/core/workflow/runner.ts`

## Symbols

### `CodeAtlasStatusBar` *(class)*
**Purpose:** Display the CodeAtlas status bar item.  

**Behavior:** Creates a status bar item and updates its text and tooltip based on the CodeAtlas workflow status.

**Returns:** void  
**Limitations:** Requires VS Code and may throw errors if VS Code is not available.  
**Used by:** `src/extension.ts`  
