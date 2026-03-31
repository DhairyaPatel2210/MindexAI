# src/llm/factory.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:26.305Z  

## Overview
LLM factory that creates instances of LLM providers based on configuration.

## Dependencies
- `src/llm/types.ts`
- `src/llm/providers/openai.ts`
- `src/llm/providers/gemini.ts`
- `src/llm/providers/claude.ts`
- `src/llm/providers/local.ts`
- `src/llm/providers/ollama.ts`
- `src/llm/providers/openaiCompat.ts`

## Symbols

### `createLLMProvider` *(function)*
**Purpose:** Creates an instance of an LLM provider  

**Behavior:** Determines the provider type based on configuration and returns an instance

**Parameters:** None  
**Returns:** Promise<ILLMProvider>  
**Limitations:** Requires configuration to be set up  
**Used by:** `src/extension.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `getStoredApiKey` *(function)*
**Purpose:** Retrieves a stored API key for a given provider  

**Behavior:** Uses the secret storage to retrieve the API key

**Parameters:** provider  
**Returns:** Promise<string | undefined>  
**Limitations:** Requires secret storage to be set up  
**Used by:** `src/extension.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `storeApiKey` *(function)*
**Purpose:** Stores an API key for a given provider  

**Behavior:** Uses the secret storage to store the API key

**Parameters:** provider, apiKey  
**Returns:** Promise<void>  
**Limitations:** Requires secret storage to be set up  
**Used by:** `src/extension.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  

### `deleteApiKey` *(function)*
**Purpose:** Deletes an API key for a given provider  

**Behavior:** Uses the secret storage to delete the API key

**Parameters:** provider  
**Returns:** Promise<void>  
**Limitations:** Requires secret storage to be set up  
**Used by:** `src/extension.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  
