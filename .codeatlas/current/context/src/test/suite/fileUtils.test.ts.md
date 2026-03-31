# src/test/suite/fileUtils.test.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:27.515Z  

## Overview
Unit tests for file utilities

## Dependencies
- `src/utils/fileUtils.ts`

## Symbols

### `sanitizeBranchName` *(function)*
**Purpose:** Sanitizes a branch name by replacing forward slashes with double dashes  

**Behavior:** Replaces forward slashes with double dashes, handles multiple slashes, leaves branch names without slashes unchanged, handles empty string, handles branch with leading slash

**Parameters:** branchName: string  
**Returns:** string  
**Limitations:** Does not handle branch names with special characters  

### `chunkText` *(function)*
**Purpose:** Chunks text into smaller pieces based on a maximum character limit  

**Behavior:** Returns single chunk for short text, returns single chunk when text equals maxChars, splits text that exceeds maxChars, preserves text content across chunks, handles empty string, respects maxChars boundary

**Parameters:** text: string, maxChars: number  
**Returns:** string[]  
**Limitations:** Does not handle text with special characters  

### `detectLanguage` *(function)*
**Purpose:** Detects the programming language of a file based on its extension  

**Behavior:** Returns the language of the file based on its extension, handles various file extensions

**Parameters:** filePath: string  
**Returns:** string  
**Limitations:** Does not handle file extensions with special characters  

### `getCodeAtlasDirForRoot` *(function)*
**Purpose:** Returns the .codeatlas directory path for a given root directory  

**Behavior:** Returns the .codeatlas directory path for the given root directory, handles Windows-style paths, does not depend on VSCode workspace

**Parameters:** root: string  
**Returns:** string  
**Limitations:** Does not handle root directories with special characters  
