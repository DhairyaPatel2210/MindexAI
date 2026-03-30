# src/llm/factory.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:15.512Z  

## Overview
LLM factory function that creates an instance of a language model provider based on the user's configuration.

## Dependencies
- `src/llm/types.ts`
- `src/llm/providers/openai.ts`
- `src/llm/providers/gemini.ts`
- `src/llm/providers/claude.ts`
- `src/llm/providers/local.ts`
- `src/llm/providers/ollama.ts`
- `src/llm/providers/openaiCompat.ts`

## Symbols

### `createLLMProvider` *(function)*
**Purpose:** Create a language model provider instance.  

**Behavior:** Creates an instance of a language model provider based on the user's configuration and returns it.

**Returns:** Promise<ILLMProvider>  
**Limitations:** Requires user configuration and may throw errors if configuration is invalid.  
**Used by:** `src/extension.ts`, `src/vscode/activityBar.ts`, `src/vscode/panel/mainPanel.ts`  
