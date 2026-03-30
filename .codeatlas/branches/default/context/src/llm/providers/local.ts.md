# src/llm/providers/local.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:20.171Z  

## Overview
LocalProvider is a class that connects to OpenAI-compatible local inference servers for text completion tasks, supporting early termination and cancellation.

## Dependencies
- `src/llm/types.ts`

## Symbols

### `LocalProvider` *(class)*
**Purpose:** Connects to OpenAI-compatible local inference servers for text completion tasks  

**Behavior:** Supports early termination and cancellation, handles different server types and error cases

**Parameters:** baseUrl, model, apiKey, name, serverLabel  
**Returns:** LLMResponse  
**Limitations:** Requires OpenAI-compatible local inference server, may not work with all server types  
**Used by:** `src/llm/factory.ts`  

### `complete` *(method)*
**Purpose:** Completes text based on input messages  

**Behavior:** Makes a POST request to the server, handles errors and cancellation, returns LLMResponse

**Parameters:** messages, maxTokens, signal  
**Returns:** Promise<LLMResponse>  
**Limitations:** May throw LLMError or RateLimitError, requires OpenAI-compatible local inference server  
**Used by:** `src/llm/factory.ts`  

### `readStream` *(method)*
**Purpose:** Reads an SSE stream from the server  

**Behavior:** Tracks JSON brace depth, handles early termination and cancellation, returns LLMResponse

**Parameters:** body, signal  
**Returns:** Promise<LLMResponse>  
**Limitations:** May throw DOMException or LLMError, requires SSE stream from server  
**Used by:** `src/llm/factory.ts`  

### `readNonStreamingResponse` *(method)*
**Purpose:** Reads a non-streaming response from the server  

**Behavior:** Handles different response formats, returns LLMResponse

**Parameters:** response  
**Returns:** Promise<LLMResponse>  
**Limitations:** May throw LLMError, requires non-streaming response from server  
**Used by:** `src/llm/factory.ts`  
