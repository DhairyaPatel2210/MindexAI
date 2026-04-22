# src/test/suite/graphBuilder.test.ts
**Language:** typescript  
**Analyzed:** 2026-04-11T23:19:56.247Z  

## Overview
This file contains unit tests for the graphBuilder's resolveImportPaths function, which resolves import paths for various programming languages.

## Dependencies
- `src/core/analyzer/graphBuilder.ts`

## Symbols

### `makeFiles` *(function)*
**Purpose:** Creates a dictionary of FileNode objects for a given list of file paths.  

**Behavior:** Iterates over the list of file paths, creating a FileNode object for each path and storing it in the dictionary.

**Parameters:** paths: string[]  
**Returns:** Record<string, FileNode>  
**Limitations:** Does not perform any validation on the input file paths.  
