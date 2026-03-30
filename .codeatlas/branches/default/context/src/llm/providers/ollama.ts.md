# src/llm/providers/ollama.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:15.512Z  

## Overview
OllamaProvider connects to a locally-running Ollama instance using its native NDJSON streaming API.

## Dependencies
- `src/llm/types.ts`

## Symbols

### `complete` *(function)*
**Purpose:** Generate text based on user input.  

**Behavior:** Makes a POST request to the Ollama API with the user input and returns the generated text.

**Parameters:** messages: LLMMessage[], maxTokens: number, signal?: AbortSignal  
**Returns:** Promise<LLMResponse>  
**Limitations:** Requires a locally-running Ollama instance and may be rate-limited.  
**Used by:** `src/llm/factory.ts`  
