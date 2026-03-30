# src/utils/fileUtils.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:18.060Z  

## Overview
This file provides utility functions for file system operations, branch management, and workspace configuration. It exports constants, functions, and variables for working with the CodeAtlas directory structure, branch tracking, and file path manipulation.

## Symbols

### `CODEATLAS_DIR` *(constant)*
**Purpose:** Directory path for CodeAtlas  

**Behavior:** Returns the absolute path to the CodeAtlas directory

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getWorkspaceRoot` *(function)*
**Purpose:** Get the workspace root directory  

**Behavior:** Returns the absolute path to the workspace root directory

**Returns:** string  
**Limitations:** Throws an error if no workspace folder is open  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getCodeAtlasDir` *(function)*
**Purpose:** Get the CodeAtlas directory path  

**Behavior:** Returns the absolute path to the CodeAtlas directory

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getCodeAtlasDirForRoot` *(function)*
**Purpose:** Get the CodeAtlas directory path for a given workspace root  

**Behavior:** Returns the absolute path to the CodeAtlas directory

**Parameters:** workspaceRoot: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `sanitizeBranchName` *(function)*
**Purpose:** Sanitize a git branch name for use as a filesystem directory name  

**Behavior:** Replaces '/' with '--' in the branch name

**Parameters:** branch: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getBranchDir` *(function)*
**Purpose:** Get the per-branch directory under `.codeatlas/branches/{sanitized-branch}/`  

**Behavior:** Returns the absolute path to the branch directory

**Parameters:** branch: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getSharedCacheDir` *(function)*
**Purpose:** Get the shared content-hash cache directory (`.codeatlas/cache/`)  

**Behavior:** Returns the absolute path to the cache directory

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `setActiveBranch` *(function)*
**Purpose:** Set the active branch  

**Behavior:** Sets the active branch for branch-aware path helpers

**Parameters:** branch: string  
**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getActiveBranch` *(function)*
**Purpose:** Get the currently active branch name  

**Behavior:** Returns the active branch name

**Returns:** string  
**Limitations:** Throws an error if no active branch is set  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getActiveBranchDir` *(function)*
**Purpose:** Get the directory for the currently active branch  

**Behavior:** Returns the absolute path to the active branch directory

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getContextDir` *(function)*
**Purpose:** Get the context directory  

**Behavior:** Returns the absolute path to the context directory

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getGraphFilePath` *(function)*
**Purpose:** Get the graph file path  

**Behavior:** Returns the absolute path to the graph file

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getIndexFilePath` *(function)*
**Purpose:** Get the index file path  

**Behavior:** Returns the absolute path to the index file

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getContextOverviewPath` *(function)*
**Purpose:** Get the context overview file path  

**Behavior:** Returns the absolute path to the context overview file

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getBranchStatePath` *(function)*
**Purpose:** Get the branch state file path  

**Behavior:** Returns the absolute path to the branch state file

**Parameters:** branch?: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getContextFilePath` *(function)*
**Purpose:** Get the context file path  

**Behavior:** Returns the absolute path to the context file

**Parameters:** relativeFilePath: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getCurrentIndexDir` *(function)*
**Purpose:** Get the stable `.codeatlas/current/` directory path  

**Behavior:** Returns the absolute path to the current index directory

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `publishCurrentIndex` *(function)*
**Purpose:** Copy the active branch's output files to `.codeatlas/current/`  

**Behavior:** Copies the index file, context overview file, graph file, and context directory

**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `copyDirRecursive` *(function)*
**Purpose:** Copy a directory recursively  

**Behavior:** Copies the directory and its contents

**Parameters:** src: string, dst: string  
**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `ensureDir` *(function)*
**Purpose:** Ensure a directory exists  

**Behavior:** Creates the directory if it does not exist

**Parameters:** dirPath: string  
**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `ensureCodeAtlasDirs` *(function)*
**Purpose:** Ensure the CodeAtlas directory structure exists  

**Behavior:** Creates the CodeAtlas directory and its subdirectories

**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `writeJson` *(function)*
**Purpose:** Write JSON data to a file  

**Behavior:** Writes the JSON data to the file

**Parameters:** filePath: string, data: unknown  
**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `readJson` *(function)*
**Purpose:** Read JSON data from a file  

**Behavior:** Returns the JSON data

**Parameters:** filePath: string  
**Returns:** T | null  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `writeText` *(function)*
**Purpose:** Write text to a file  

**Behavior:** Writes the text to the file

**Parameters:** filePath: string, content: string  
**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `readText` *(function)*
**Purpose:** Read text from a file  

**Behavior:** Returns the text

**Parameters:** filePath: string  
**Returns:** string | null  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `fileExists` *(function)*
**Purpose:** Check if a file exists  

**Behavior:** Returns true if the file exists

**Parameters:** filePath: string  
**Returns:** boolean  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getFileSizeKB` *(function)*
**Purpose:** Get the file size in KB  

**Behavior:** Returns the file size in KB

**Parameters:** filePath: string  
**Returns:** number  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `toRelativePath` *(function)*
**Purpose:** Get the relative path from the workspace root  

**Behavior:** Returns the relative path

**Parameters:** absolutePath: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `toAbsolutePath` *(function)*
**Purpose:** Get the absolute path from a relative path  

**Behavior:** Returns the absolute path

**Parameters:** relativePath: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `INCLUDE_FILE` *(constant)*
**Purpose:** File path for the .include.codeatlas file  

**Behavior:** Returns the absolute path to the .include.codeatlas file

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `isGitRepo` *(function)*
**Purpose:** Check if the workspace root is inside a git repository  

**Behavior:** Returns true if the workspace root is inside a git repository

**Returns:** boolean  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getIncludeFilePath` *(function)*
**Purpose:** Get the path to the .include.codeatlas file  

**Behavior:** Returns the absolute path to the .include.codeatlas file

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `hasIncludeFile` *(function)*
**Purpose:** Check if a .include.codeatlas file exists in the workspace root  

**Behavior:** Returns true if the .include.codeatlas file exists

**Returns:** boolean  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `parseIncludeFile` *(function)*
**Purpose:** Parse the .include.codeatlas file  

**Behavior:** Returns the list of resolved entries

**Returns:** string[]  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `collectSourceFiles` *(function)*
**Purpose:** Collect source files using the .include.codeatlas file  

**Behavior:** Returns the list of source files

**Returns:** string[]  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `collectSourceFilesViaGlob` *(function)*
**Purpose:** Collect files based on glob patterns  

**Behavior:** Returns the list of files

**Parameters:** includedExtensions: string[], excludePatterns: string[]  
**Returns:** string[]  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `chunkText` *(function)*
**Purpose:** Chunk text into smaller pieces  

**Behavior:** Returns the list of chunks

**Parameters:** text: string, maxChars: number  
**Returns:** string[]  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `detectLanguage` *(function)*
**Purpose:** Detect the language of a file  

**Behavior:** Returns the language

**Parameters:** filePath: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  
