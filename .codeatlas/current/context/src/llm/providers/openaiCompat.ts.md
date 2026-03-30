# src/llm/providers/openaiCompat.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:15.512Z  

## Overview
OpenAICompatProvider connects to a remote server that exposes the OpenAI /v1/chat/completions API.

## Dependencies
- `src/llm/types.ts`
- `src/utils/logger.ts`

## Symbols

### `complete` *(function)*
**Purpose:** Generate text based on user input.  

**Behavior:** Makes a POST request to the OpenAI-compatible server with the user input and returns the generated text.

**Parameters:** messages: LLMMessage[], maxTokens: number, signal?: AbortSignal  
**Returns:** Promise<LLMResponse>  
**Limitations:** Requires an API key and may be rate-limited.  
**Used by:** `src/llm/factory.ts`  
