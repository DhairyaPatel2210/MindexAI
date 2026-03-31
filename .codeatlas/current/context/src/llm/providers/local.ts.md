# src/llm/providers/local.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:31.510Z  

## Overview
LocalProvider is a class that connects to OpenAI-compatible local inference servers, providing a way to interact with these servers through a unified interface.

## Dependencies
- `src/llm/types.ts`

## Symbols

### `LocalProvider` *(class)*
**Purpose:** Connects to OpenAI-compatible local inference servers  

**Behavior:** Provides a unified interface to interact with local inference servers

**Parameters:** [object Object]  
**Returns:** An LLMResponse object containing the result of the request  
**Limitations:** Does not handle cases where the server returns an error or does not respond with a JSON body  
**Used by:** `src/llm/factory.ts`  

### `complete` *(function)*
**Purpose:** Makes a request to the local inference server to complete a task  

**Behavior:** Sends a POST request to the server with the provided messages and options

**Parameters:** [object Object]  
**Returns:** An LLMResponse object containing the result of the request  
**Limitations:** Does not handle cases where the server returns an error or does not respond with a JSON body  
**Used by:** `src/llm/factory.ts`  

### `readStream` *(function)*
**Purpose:** Reads a stream of tokens from the server  

**Behavior:** Uses a TextDecoder to decode the stream and a JSON parser to extract the tokens

**Parameters:** [object Object]  
**Returns:** An LLMResponse object containing the result of the request  
**Limitations:** Does not handle cases where the server returns an error or does not respond with a JSON body  
**Used by:** `src/llm/factory.ts`  

### `readNonStreamingResponse` *(function)*
**Purpose:** Reads a non-streaming response from the server  

**Behavior:** Uses a JSON parser to extract the tokens from the response

**Parameters:** [object Object]  
**Returns:** An LLMResponse object containing the result of the request  
**Limitations:** Does not handle cases where the server returns an error or does not respond with a JSON body  
**Used by:** `src/llm/factory.ts`  
