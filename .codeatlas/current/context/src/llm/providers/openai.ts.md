# src/llm/providers/openai.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:26.117Z  

## Overview
Defines an OpenAI LLM provider.

## Dependencies
- `src/llm/types.ts`

## Symbols

### `OpenAIProvider` *(class)*
**Purpose:** Represents an OpenAI LLM provider.  

**Behavior:** Has two properties: name and apiKey.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must have name and apiKey properties.  
**Used by:** `src/llm/factory.ts`  

### `complete` *(method)*
**Purpose:** Completes an LLM request.  

**Behavior:** Sends a request to the OpenAI API and returns the response.

**Parameters:** messages: LLMMessage[], maxTokens?: number, signal?: AbortSignal  
**Returns:** Promise<LLMResponse>  
**Limitations:** Must send a request to the OpenAI API and return the response.  
**Used by:** `src/llm/factory.ts`  
