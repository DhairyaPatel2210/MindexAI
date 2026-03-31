export interface LLMMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface LLMResponse {
  content: string;
  tokensUsed?: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface ILLMProvider {
  readonly name: string;
  complete(messages: LLMMessage[], maxTokens?: number, signal?: AbortSignal): Promise<LLMResponse>;
}

export type LLMProviderType = 'openai' | 'gemini' | 'claude' | 'local' | 'openai-compat';

export interface LLMConfig {
  provider: LLMProviderType;
  apiKey: string;
  model: string;
}

export class LLMError extends Error {
  constructor(
    message: string,
    public readonly provider: string,
    public readonly statusCode?: number
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

export class RateLimitError extends LLMError {
  constructor(
    provider: string,
    public readonly retryAfterMs: number
  ) {
    super(
      `Rate limit hit for ${provider}. Retry after ${Math.ceil(retryAfterMs / 1000)}s.`,
      provider,
      429
    );
    this.name = 'RateLimitError';
  }
}
