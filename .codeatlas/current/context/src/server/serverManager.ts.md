# src/server/serverManager.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:20.824Z  

## Overview
Manages a llama-server child process, providing a singleton instance for starting, stopping, and monitoring the server.

## Dependencies
- `src/utils/logger.ts`

## Symbols

### `ServerManager` *(class)*
**Purpose:** Singleton class for managing a llama-server child process.  

**Behavior:** Provides methods for starting, stopping, and monitoring the server, as well as emitting events to registered callbacks.

**Parameters:** ServerOptions  
**Returns:** void  
**Limitations:** Only one instance of the server can run at a time.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `start` *(method)*
**Purpose:** Starts the llama-server child process with the given options.  

**Behavior:** Checks if the server is already running, stops it if necessary, and then starts the new server with the provided options.

**Parameters:** ServerOptions  
**Returns:** Promise<void>  
**Limitations:** Fails if the model file or llama-server binary is not found.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `stop` *(method)*
**Purpose:** Stops the llama-server child process.  

**Behavior:** Kills the server process and emits a 'stopped' event to registered callbacks.

**Parameters:** void  
**Returns:** Promise<void>  
**Limitations:** Fails if the server process is not found.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `dispose` *(method)*
**Purpose:** Disposes of the llama-server child process and clears any registered callbacks.  

**Behavior:** Kills the server process and clears any registered callbacks.

**Parameters:** void  
**Returns:** void  
**Limitations:** Does not emit any events.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `pollHealth` *(method)*
**Purpose:** Polls the server's health endpoint to determine its status.  

**Behavior:** Sends a GET request to the server's health endpoint and updates the server's status accordingly.

**Parameters:** number  
**Returns:** void  
**Limitations:** Fails if the server is not running or the health endpoint is not available.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `addLog` *(method)*
**Purpose:** Adds a log line to the server's log buffer.  

**Behavior:** Pushes the log line to the server's log buffer and emits an event to registered callbacks.

**Parameters:** string  
**Returns:** void  
**Limitations:** Does not emit any events if the log buffer is full.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `emit` *(method)*
**Purpose:** Emits an event to registered callbacks.  

**Behavior:** Updates the server's status and emits an event to registered callbacks.

**Parameters:** ServerStatus, number, string, string?  
**Returns:** void  
**Limitations:** Does not emit any events if the server is not running.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `detectBinary` *(function)*
**Purpose:** Detects the llama-server binary on the system.  

**Behavior:** Checks a list of possible binary locations and returns the first one that exists.

**Parameters:** void  
**Returns:** Promise<string | null>  
**Limitations:** Fails if none of the binary locations are found.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  

### `commandExists` *(function)*
**Purpose:** Checks if a command exists on the system.  

**Behavior:** Executes a command to check if the binary exists and returns a promise with the result.

**Parameters:** string  
**Returns:** Promise<boolean>  
**Limitations:** Fails if the command execution fails.  
**Used by:** `src/extension.ts`, `src/vscode/panel/mainPanel.ts`  
