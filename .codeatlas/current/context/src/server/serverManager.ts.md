# src/server/serverManager.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:31.677Z  

## Overview
Manages a llama-server (llama.cpp) child process, providing a singleton instance for starting, stopping, and monitoring the server.

## Dependencies
- `src/utils/logger.ts`

## Symbols

### `ServerManager` *(class)*
**Purpose:** Singleton class for managing a llama-server child process.  

**Behavior:** Provides methods for starting, stopping, and monitoring the server, including logging and health checking.

**Parameters:** None  
**Returns:** None  
**Limitations:** Only one instance of the server can run at a time.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `start` *(method)*
**Purpose:** Starts the llama-server child process.  

**Behavior:** Takes a ServerOptions object as input, starts the server, and sets up logging and health checking.

**Parameters:** ServerOptions  
**Returns:** Promise<void>  
**Limitations:** Fails if the model file or llama-server binary is not found.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `stop` *(method)*
**Purpose:** Stops the llama-server child process.  

**Behavior:** Kills the server process and sets the status to stopped.

**Parameters:** None  
**Returns:** Promise<void>  
**Limitations:** Fails if the server process is not running.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `dispose` *(method)*
**Purpose:** Disposes of the llama-server child process.  

**Behavior:** Kills the server process and clears the health timer.

**Parameters:** None  
**Returns:** None  
**Limitations:** Fails if the server process is not running.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `pollHealth` *(method)*
**Purpose:** Polls the health endpoint of the llama-server.  

**Behavior:** Sends a GET request to the health endpoint and updates the server status accordingly.

**Parameters:** number  
**Returns:** None  
**Limitations:** Fails if the server is not running or the health endpoint is not available.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `addLog` *(method)*
**Purpose:** Adds a log line to the server logs.  

**Behavior:** Pushes the log line to the internal log array and notifies all registered callbacks.

**Parameters:** string  
**Returns:** None  
**Limitations:** Fails if the log line is too long.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `emit` *(method)*
**Purpose:** Emits a server status update to all registered callbacks.  

**Behavior:** Updates the internal server status and notifies all registered callbacks.

**Parameters:** ServerStatus, number, string, string  
**Returns:** None  
**Limitations:** Fails if the server status is not valid.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `detectBinary` *(function)*
**Purpose:** Detects the llama-server binary.  

**Behavior:** Searches for the llama-server binary in a list of possible locations.

**Parameters:** None  
**Returns:** Promise<string | null>  
**Limitations:** Fails if the binary is not found.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `commandExists` *(function)*
**Purpose:** Checks if a command exists.  

**Behavior:** Executes a command to check if it exists and returns a promise with the result.

**Parameters:** string  
**Returns:** Promise<boolean>  
**Limitations:** Fails if the command is not found.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  
