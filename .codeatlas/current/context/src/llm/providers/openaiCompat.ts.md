# src/llm/providers/openaiCompat.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:26.305Z  

## Overview
OpenAICompatProvider is an LLM provider that connects to a remote server that exposes the OpenAI /v1/chat/completions API.

## Dependencies
- `src/llm/types.ts`
- `src/utils/logger.ts`

## Symbols

### `OpenAICompatProvider` *(class)*
**Purpose:** LLM provider for remote OpenAI-compatible server  

**Behavior:** Handles API requests and responses to provide LLM functionality

**Parameters:** baseUrl, model, apiKey  
**Returns:** Promise<LLMResponse>  
**Limitations:** Requires OpenAI-compatible server URL and model name  
**Used by:** `src/llm/factory.ts`  

### `complete` *(function)*
**Purpose:** Completes a conversation with the LLM  

**Behavior:** Sends a request to the OpenAI API and returns the response

**Parameters:** messages, maxTokens, signal  
**Returns:** Promise<LLMResponse>  
**Limitations:** May throw errors if API request fails  
**Used by:** `src/llm/factory.ts`  
