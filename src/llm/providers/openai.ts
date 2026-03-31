import { ILLMProvider, LLMMessage, LLMResponse, LLMError, RateLimitError } from '../types';

export class OpenAIProvider implements ILLMProvider {
  readonly name = 'openai';

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'gpt-4o'
  ) {}

  async complete(messages: LLMMessage[], maxTokens = 4096, signal?: AbortSignal): Promise<LLMResponse> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages.map(m => ({ role: m.role, content: m.content })),
        max_tokens: maxTokens,
        temperature: 0.2,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      if (response.status === 429) {
        // OpenAI sends Retry-After in seconds as a header
        const retryAfter = response.headers.get('retry-after');
        const retryMs = retryAfter
          ? (parseFloat(retryAfter) * 1000 + 2000)
          : 65_000;
        throw new RateLimitError('openai', retryMs);
      }
      throw new LLMError(
        `OpenAI API error: ${response.status} ${errorText}`,
        'openai',
        response.status
      );
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    const content = data.choices[0]?.message?.content;
    if (!content) {
      throw new LLMError('OpenAI returned empty response', 'openai');
    }

    return {
      content,
      tokensUsed: data.usage?.total_tokens,
      inputTokens: data.usage?.prompt_tokens,
      outputTokens: data.usage?.completion_tokens,
    };
  }
}
