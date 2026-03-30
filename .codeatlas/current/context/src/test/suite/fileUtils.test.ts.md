# src/test/suite/fileUtils.test.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:16.237Z  

## Overview
Tests file utility functions.

## Dependencies
- `src/utils/fileUtils.ts`

## Symbols

### `sanitizeBranchName` *(function)*
**Purpose:** Sanitizes a branch name by replacing forward slashes with double dashes.  

**Behavior:** Replaces forward slashes with double dashes, leaving branch names without slashes unchanged.

**Parameters:** string  
**Returns:** string  
**Limitations:** Does not handle branch names with multiple consecutive slashes.  

### `chunkText` *(function)*
**Purpose:** Chunks text into smaller pieces based on a maximum character limit.  

**Behavior:** Splits text into chunks of maximum length, preserving text content across chunks.

**Parameters:** string, number  
**Returns:** string[]  
**Limitations:** Does not handle text with non-ASCII characters correctly.  

### `detectLanguage` *(function)*
**Purpose:** Detects the language of a file based on its extension.  

**Behavior:** Returns the detected language based on file extension, or 'Unknown' if unknown.

**Parameters:** string  
**Returns:** string  
**Limitations:** Does not handle file extensions that are not in the language mapping.  

### `getCodeAtlasDirForRoot` *(function)*
**Purpose:** Returns the path to the .codeatlas directory for a given root directory.  

**Behavior:** Returns the path to the .codeatlas directory, preserving drive letter on Windows.

**Parameters:** string  
**Returns:** string  
**Limitations:** Does not handle root directories that are not strings.  
