# src/llm/providers/gemini.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:16.383Z  

## Overview
Provides a Gemini LLM provider.

## Dependencies
- `src/llm/types.ts`

## Symbols

### `GeminiProvider` *(class)*
**Purpose:** Represents a Gemini LLM provider.  

**Behavior:** Provides a complete method for generating text.

**Parameters:** apiKey: string; model: string;  
**Returns:** Promise<LLMResponse>  
**Limitations:** None  
**Used by:** `src/llm/factory.ts`  

### `parseRetryDelay` *(function)*
**Purpose:** Parses the retry delay from a 429 response.  

**Behavior:** Returns the retry delay in milliseconds.

**Parameters:** body: string;  
**Returns:** number  
**Limitations:** None  
**Used by:** `src/llm/factory.ts`  
