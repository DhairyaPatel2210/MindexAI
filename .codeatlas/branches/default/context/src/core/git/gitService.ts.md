# src/core/git/gitService.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:19.696Z  

## Overview
This file provides a set of Git-related utility functions for managing branches, diffs, and content hashing. It allows for retrieving branch information, computing content hashes, and capturing the current Git state.

## Dependencies
- `src/utils/fileUtils.ts`
- `src/utils/logger.ts`

## Symbols

### `getCurrentBranch` *(function)*
**Line:** 26  
**Purpose:** Returns the current branch name, or HEAD commit hash if detached, or 'default' for empty repos.  

**Behavior:** Tries to get the current branch using 'git rev-parse --abbrev-ref HEAD', falling back to 'git rev-parse --short HEAD' if that fails, and returning 'default' if the repo is empty.

**Returns:** string  
**Used by:** `src/extension.ts`  

### `getHeadCommit` *(function)*
**Line:** 34  
**Purpose:** Returns the commit hash that HEAD points to.  

**Behavior:** Tries to get the commit hash using 'git rev-parse HEAD', returning an empty string if that fails.

**Returns:** string  
**Used by:** `src/extension.ts`  

### `getChangedFilesBetweenRefs` *(function)*
**Line:** 44  
**Purpose:** Get files that differ between two refs (branches/commits).  

**Behavior:** Uses 'git diff --name-status' to get the files that were added, modified, or deleted between the two refs.

**Parameters:** fromRef: string, toRef: string  
**Returns:** { added: string[], modified: string[], deleted: string[] }  
**Used by:** `src/extension.ts`  

### `getUncommittedChanges` *(function)*
**Line:** 83  
**Purpose:** Get uncommitted changes (both staged and unstaged) relative to HEAD.  

**Behavior:** Uses 'git diff --name-status HEAD' and 'git diff --name-status --cached' to get the modified and deleted files, and 'git ls-files -o --exclude-standard' to get the untracked files.

**Returns:** { modified: string[], deleted: string[], untracked: string[] }  
**Used by:** `src/extension.ts`  

### `getAllChangedFiles` *(function)*
**Line:** 121  
**Purpose:** Get ALL files that have changed relative to the last indexed state.  

**Behavior:** Combines branch diff + uncommitted changes into a single set.

**Parameters:** lastIndexedRef?: string  
**Returns:** { needsAnalysis: string[], deleted: string[] }  
**Used by:** `src/extension.ts`  

### `getFileContentHash` *(function)*
**Line:** 144  
**Purpose:** Compute a content hash for a file using the same algorithm as git (SHA-1 of blob).  

**Behavior:** Uses 'git hash-object' if in a git repo, falling back to SHA-256 of content.

**Parameters:** absolutePath: string  
**Returns:** string  
**Used by:** `src/extension.ts`  

### `getFileHashAtRef` *(function)*
**Line:** 157  
**Purpose:** Get the git blob hash for a file at a specific ref (commit/branch).  

**Behavior:** Uses 'git rev-parse' to get the hash of the file at the specified ref.

**Parameters:** relPath: string, ref: string  
**Returns:** string  
**Used by:** `src/extension.ts`  

### `captureGitState` *(function)*
**Line:** 173  
**Purpose:** Capture the current Git state.  

**Behavior:** Returns an object with the current branch, head commit, and timestamp.

**Returns:** GitState  
**Used by:** `src/extension.ts`  
