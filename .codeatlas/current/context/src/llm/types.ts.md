# src/llm/types.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T19:56:16.383Z  

## Overview
Defines types and interfaces for the LLM (Large Language Model) module.

## Symbols

### `LLMMessage` *(interface)*
**Purpose:** Represents a message sent to or received from the LLM.  

**Behavior:** Contains a role (user, assistant, or system) and content.

**Parameters:** role: 'user' | 'assistant' | 'system'; content: string;  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `LLMResponse` *(interface)*
**Purpose:** Represents the response from the LLM.  

**Behavior:** Contains content, tokens used, input tokens, and output tokens.

**Parameters:** content: string; tokensUsed?: number; inputTokens?: number; outputTokens?: number;  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `ILLMProvider` *(interface)*
**Purpose:** Defines the interface for an LLM provider.  

**Behavior:** Provides a complete method for generating text.

**Parameters:** readonly name: string; complete(messages: LLMMessage[], maxTokens?: number, signal?: AbortSignal): Promise<LLMResponse>;  
**Returns:** Promise<LLMResponse>  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `LLMProviderType` *(type)*
**Purpose:** Enum for LLM provider types.  

**Behavior:** Can be one of 'openai', 'gemini', 'claude', 'local', or 'openai-compat'.

**Parameters:** None  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `LLMConfig` *(interface)*
**Purpose:** Represents the configuration for an LLM provider.  

**Behavior:** Contains provider, API key, and model.

**Parameters:** provider: LLMProviderType; apiKey: string; model: string;  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `LLMError` *(class)*
**Purpose:** Represents an error that occurred while using the LLM.  

**Behavior:** Extends the Error class.

**Parameters:** message: string; provider: string; statusCode?: number;  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `RateLimitError` *(class)*
**Purpose:** Represents a rate limit error that occurred while using the LLM.  

**Behavior:** Extends the LLMError class.

**Parameters:** provider: string; retryAfterMs: number;  
**Returns:** None  
**Limitations:** None  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  
