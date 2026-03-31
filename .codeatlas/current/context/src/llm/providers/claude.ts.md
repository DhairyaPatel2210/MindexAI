# src/llm/providers/claude.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:26.305Z  

## Overview
ClaudeProvider is an LLM provider that connects to the Anthropic API.

## Dependencies
- `src/llm/types.ts`

## Symbols

### `ClaudeProvider` *(class)*
**Purpose:** LLM provider for Anthropic API  

**Behavior:** Handles API requests and responses to provide LLM functionality

**Parameters:** apiKey, model  
**Returns:** Promise<LLMResponse>  
**Limitations:** Requires Anthropic API key and model name  
**Used by:** `src/llm/factory.ts`  

### `complete` *(function)*
**Purpose:** Completes a conversation with the LLM  

**Behavior:** Sends a request to the Anthropic API and returns the response

**Parameters:** messages, maxTokens, signal  
**Returns:** Promise<LLMResponse>  
**Limitations:** May throw errors if API request fails  
**Used by:** `src/llm/factory.ts`  
