# src/llm/providers/ollama.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:26.305Z  

## Overview
OllamaProvider is an LLM provider that connects to a locally-running Ollama instance.

## Dependencies
- `src/llm/types.ts`

## Symbols

### `OllamaProvider` *(class)*
**Purpose:** LLM provider for locally-running Ollama instance  

**Behavior:** Handles API requests and responses to provide LLM functionality

**Parameters:** baseUrl, model  
**Returns:** Promise<LLMResponse>  
**Limitations:** Requires Ollama instance to be running  
**Used by:** `src/llm/factory.ts`  

### `complete` *(function)*
**Purpose:** Completes a conversation with the LLM  

**Behavior:** Sends a request to the Ollama API and returns the response

**Parameters:** messages, maxTokens, signal  
**Returns:** Promise<LLMResponse>  
**Limitations:** May throw errors if API request fails  
**Used by:** `src/llm/factory.ts`  

### `readStream` *(function)*
**Purpose:** Reads an NDJSON stream from the Ollama API  

**Behavior:** Parses the stream and returns the LLM response

**Parameters:** body, signal  
**Returns:** Promise<LLMResponse>  
**Limitations:** May throw errors if stream parsing fails  
**Used by:** `src/llm/factory.ts`  
