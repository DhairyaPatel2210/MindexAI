# src/llm/providers/claude.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:15.512Z  

## Overview
ClaudeProvider connects to the Anthropic API to generate text based on user input.

## Dependencies
- `src/llm/types.ts`

## Symbols

### `complete` *(function)*
**Purpose:** Generate text based on user input.  

**Behavior:** Makes a POST request to the Anthropic API with the user input and returns the generated text.

**Parameters:** messages: LLMMessage[], maxTokens: number, signal?: AbortSignal  
**Returns:** Promise<LLMResponse>  
**Limitations:** Requires an API key and may be rate-limited.  
**Used by:** `src/llm/factory.ts`  
