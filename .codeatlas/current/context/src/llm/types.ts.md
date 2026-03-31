# src/llm/types.ts
**Language:** typescript  
**Analyzed:** 2026-03-30T21:28:26.117Z  

## Overview
Defines types and interfaces for the LLM (Large Language Model) module.

## Symbols

### `LLMMessage` *(interface)*
**Purpose:** Represents a message sent to or received from the LLM.  

**Behavior:** Has two properties: role and content.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must have either user, assistant, or system role.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `LLMResponse` *(interface)*
**Purpose:** Represents a response from the LLM.  

**Behavior:** Has four properties: content, tokensUsed, inputTokens, and outputTokens.

**Parameters:** None  
**Returns:** None  
**Limitations:** TokensUsed, inputTokens, and outputTokens are optional.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `ILLMProvider` *(interface)*
**Purpose:** Defines the interface for an LLM provider.  

**Behavior:** Has two methods: complete and name.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must implement complete and name methods.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `LLMProviderType` *(type)*
**Purpose:** Represents the type of LLM provider.  

**Behavior:** Has five possible values: openai, gemini, claude, local, or openai-compat.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must be one of the five possible values.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `LLMConfig` *(interface)*
**Purpose:** Represents the configuration for an LLM provider.  

**Behavior:** Has three properties: provider, apiKey, and model.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must have provider, apiKey, and model properties.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `LLMError` *(class)*
**Purpose:** Represents an error that occurred while using the LLM.  

**Behavior:** Has three properties: message, provider, and statusCode.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must have message, provider, and statusCode properties.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  

### `RateLimitError` *(class)*
**Purpose:** Represents a rate limit error that occurred while using the LLM.  

**Behavior:** Has two properties: provider and retryAfterMs.

**Parameters:** None  
**Returns:** None  
**Limitations:** Must have provider and retryAfterMs properties.  
**Used by:** `src/core/analyzer/fileAnalyzer.ts`, `src/core/stats/usageStats.ts`, `src/core/workflow/runner.ts`, `src/extension.ts`, `src/llm/factory.ts`, `src/llm/providers/claude.ts`, `src/llm/providers/gemini.ts`, `src/llm/providers/local.ts`, `src/llm/providers/ollama.ts`, `src/llm/providers/openai.ts`  
