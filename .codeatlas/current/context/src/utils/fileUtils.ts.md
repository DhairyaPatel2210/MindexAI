# src/utils/fileUtils.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:29.232Z  

## Overview
This file provides utility functions for file system operations, path manipulation, and workspace management, primarily for use in a code analysis and AI code editor context.

## Symbols

### `CODEATLAS_DIR` *(constant)*
**Purpose:** Directory path for CodeAtlas configuration  

**Behavior:** Returns the path to the .codeatlas directory

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getWorkspaceRoot` *(function)*
**Purpose:** Returns the path to the workspace root directory  

**Behavior:** Checks if a workspace folder is open and returns its path

**Returns:** string  
**Limitations:** Throws an error if no workspace folder is open  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getCodeAtlasDir` *(function)*
**Purpose:** Returns the path to the .codeatlas directory  

**Behavior:** Joins the workspace root and CODEATLAS_DIR to get the path

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getCodeAtlasDirForRoot` *(function)*
**Purpose:** Returns the path to the .codeatlas directory for a given workspace root  

**Behavior:** Joins the workspace root and CODEATLAS_DIR to get the path

**Parameters:** workspaceRoot: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `sanitizeBranchName` *(function)*
**Purpose:** Sanitizes a git branch name for use as a filesystem directory name  

**Behavior:** Replaces / with -- in the branch name

**Parameters:** branch: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getBranchDir` *(function)*
**Purpose:** Returns the path to the per-branch directory  

**Behavior:** Joins the .codeatlas directory, branches directory, and sanitized branch name to get the path

**Parameters:** branch: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getSharedCacheDir` *(function)*
**Purpose:** Returns the path to the shared content-hash cache directory  

**Behavior:** Joins the .codeatlas directory and cache directory to get the path

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `setActiveBranch` *(function)*
**Purpose:** Sets the active branch  

**Behavior:** Stores the branch name in the _activeBranch variable

**Parameters:** branch: string  
**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getActiveBranch` *(function)*
**Purpose:** Returns the currently active branch name  

**Behavior:** Returns the _activeBranch variable

**Returns:** string  
**Limitations:** Throws an error if no active branch is set  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getActiveBranchDir` *(function)*
**Purpose:** Returns the path to the currently active branch directory  

**Behavior:** Joins the .codeatlas directory, branches directory, and active branch name to get the path

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getContextDir` *(function)*
**Purpose:** Returns the path to the context directory  

**Behavior:** Joins the active branch directory and context directory to get the path

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getGraphFilePath` *(function)*
**Purpose:** Returns the path to the graph file  

**Behavior:** Joins the active branch directory and graph file to get the path

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getIndexFilePath` *(function)*
**Purpose:** Returns the path to the index file  

**Behavior:** Joins the active branch directory and index file to get the path

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getContextOverviewPath` *(function)*
**Purpose:** Returns the path to the context overview file  

**Behavior:** Joins the active branch directory and context overview file to get the path

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getBranchStatePath` *(function)*
**Purpose:** Returns the path to the branch state file  

**Behavior:** Joins the branch directory and branch state file to get the path

**Parameters:** branch: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getContextFilePath` *(function)*
**Purpose:** Returns the path to the context file  

**Behavior:** Joins the context directory and relative file path to get the path

**Parameters:** relativeFilePath: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getCurrentIndexDir` *(function)*
**Purpose:** Returns the path to the current index directory  

**Behavior:** Joins the .codeatlas directory and current directory to get the path

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `publishCurrentIndex` *(function)*
**Purpose:** Copies the active branch's output files to the current index directory  

**Behavior:** Removes the old current index directory and recreates it with the latest output files

**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `ensureDir` *(function)*
**Purpose:** Ensures a directory exists  

**Behavior:** Creates the directory if it does not exist

**Parameters:** dirPath: string  
**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `ensureCodeAtlasDirs` *(function)*
**Purpose:** Ensures the .codeatlas directory and its subdirectories exist  

**Behavior:** Calls ensureDir for each required directory

**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `writeJson` *(function)*
**Purpose:** Writes JSON data to a file  

**Behavior:** Creates the directory if it does not exist and writes the JSON data to the file

**Parameters:** filePath: string, data: unknown  
**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `readJson` *(function)*
**Purpose:** Reads JSON data from a file  

**Behavior:** Returns the JSON data if the file exists, otherwise returns null

**Parameters:** filePath: string  
**Returns:** T | null  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `writeText` *(function)*
**Purpose:** Writes text to a file  

**Behavior:** Creates the directory if it does not exist and writes the text to the file

**Parameters:** filePath: string, content: string  
**Returns:** void  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `readText` *(function)*
**Purpose:** Reads text from a file  

**Behavior:** Returns the text if the file exists, otherwise returns null

**Parameters:** filePath: string  
**Returns:** string | null  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `fileExists` *(function)*
**Purpose:** Checks if a file exists  

**Behavior:** Returns true if the file exists, otherwise returns false

**Parameters:** filePath: string  
**Returns:** boolean  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getFileSizeKB` *(function)*
**Purpose:** Gets the size of a file in KB  

**Behavior:** Returns the file size in KB if the file exists, otherwise returns 0

**Parameters:** filePath: string  
**Returns:** number  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `toRelativePath` *(function)*
**Purpose:** Converts an absolute path to a relative path  

**Behavior:** Returns the relative path from the workspace root

**Parameters:** absolutePath: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `toAbsolutePath` *(function)*
**Purpose:** Converts a relative path to an absolute path  

**Behavior:** Joins the workspace root and relative path to get the absolute path

**Parameters:** relativePath: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `INCLUDE_FILE` *(constant)*
**Purpose:** File path for the .include.codeatlas file  

**Behavior:** Returns the path to the .include.codeatlas file

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `isGitRepo` *(function)*
**Purpose:** Checks if the workspace root is inside a git repository  

**Behavior:** Executes the git rev-parse command to check if the workspace root is inside a git repository

**Returns:** boolean  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `getIncludeFilePath` *(function)*
**Purpose:** Returns the path to the .include.codeatlas file  

**Behavior:** Joins the workspace root and INCLUDE_FILE to get the path

**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `hasIncludeFile` *(function)*
**Purpose:** Checks if the .include.codeatlas file exists  

**Behavior:** Returns true if the file exists, otherwise returns false

**Returns:** boolean  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `parseIncludeFile` *(function)*
**Purpose:** Parses the .include.codeatlas file  

**Behavior:** Returns a list of resolved entries

**Returns:** string[]  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `collectSourceFiles` *(function)*
**Purpose:** Collects source files using the .include.codeatlas file  

**Behavior:** Returns a list of source file paths

**Returns:** string[]  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `collectSourceFilesViaGlob` *(function)*
**Purpose:** Collects source files using VS Code glob-based collection  

**Behavior:** Returns a list of source file paths

**Returns:** string[]  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `chunkText` *(function)*
**Purpose:** Chunks text into smaller pieces  

**Behavior:** Returns a list of text chunks

**Parameters:** text: string, maxChars: number  
**Returns:** string[]  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  

### `detectLanguage` *(function)*
**Purpose:** Detects the language of a file  

**Behavior:** Returns the language name

**Parameters:** filePath: string  
**Returns:** string  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/analyzer/graphBuilder.ts`, `src/core/git/gitService.ts`, `src/core/stats/usageStats.ts`, `src/test/suite/fileUtils.test.ts`, `src/vscode/panel/mainPanel.ts`  
