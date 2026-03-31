# src/core/git/gitService.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:30.691Z  

## Overview
This file provides a set of functions for interacting with a Git repository, including getting branch information, diffing files, and computing content hashes.

## Dependencies
- `src/utils/fileUtils.ts`
- `src/utils/logger.ts`

## Symbols

### `getCurrentBranch` *(function)*
**Line:** 10  
**Purpose:** Returns the current branch name, or HEAD commit hash if detached, or 'default' for empty repos.  

**Behavior:** Tries to get the current branch using 'git rev-parse --abbrev-ref HEAD', falls back to 'git rev-parse --short HEAD' if that fails, and returns 'default' if the repo is empty.

**Returns:** string  
**Used by:** `src/extension.ts`  

### `getHeadCommit` *(function)*
**Line:** 17  
**Purpose:** Returns the commit hash that HEAD points to.  

**Behavior:** Tries to get the commit hash using 'git rev-parse HEAD', returns an empty string if that fails.

**Returns:** string  
**Used by:** `src/extension.ts`  

### `getChangedFilesBetweenRefs` *(function)*
**Line:** 25  
**Purpose:** Get files that differ between two refs (branches/commits).  

**Behavior:** Uses 'git diff --name-status' to get the files that have changed, and returns their relative paths.

**Parameters:** fromRef: string, toRef: string  
**Returns:** { added: string[], modified: string[], deleted: string[] }  
**Used by:** `src/extension.ts`  

### `getUncommittedChanges` *(function)*
**Line:** 43  
**Purpose:** Get uncommitted changes (both staged and unstaged) relative to HEAD.  

**Behavior:** Uses 'git diff --name-status HEAD' to get the staged changes, and 'git diff --name-status --cached' to get the unstaged changes.

**Returns:** { modified: string[], deleted: string[], untracked: string[] }  
**Used by:** `src/extension.ts`  

### `getAllChangedFiles` *(function)*
**Line:** 59  
**Purpose:** Get ALL files that have changed relative to the last indexed state.  

**Behavior:** Combines branch diff + uncommitted changes into a single set.

**Parameters:** lastIndexedRef?: string  
**Returns:** { needsAnalysis: string[], deleted: string[] }  
**Used by:** `src/extension.ts`  

### `getFileContentHash` *(function)*
**Line:** 73  
**Purpose:** Compute a content hash for a file using the same algorithm as git (SHA-1 of blob).  

**Behavior:** Uses 'git hash-object' if in a git repo, falls back to SHA-256 of content.

**Parameters:** absolutePath: string  
**Returns:** string  
**Used by:** `src/extension.ts`  

### `getFileHashAtRef` *(function)*
**Line:** 85  
**Purpose:** Get the git blob hash for a file at a specific ref (commit/branch).  

**Behavior:** Uses 'git rev-parse' to get the hash.

**Parameters:** relPath: string, ref: string  
**Returns:** string  
**Used by:** `src/extension.ts`  

### `captureGitState` *(function)*
**Line:** 97  
**Purpose:** Capture the current state of the Git repository.  

**Behavior:** Returns an object with the current branch, head commit, and timestamp.

**Returns:** GitState  
**Used by:** `src/extension.ts`  
