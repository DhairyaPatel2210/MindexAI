import { ILLMProvider, LLMMessage, LLMResponse, LLMError, RateLimitError } from '../types';

export class ClaudeProvider implements ILLMProvider {
  readonly name = 'claude';

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'claude-opus-4-6'
  ) {}

  async complete(messages: LLMMessage[], maxTokens = 4096, signal?: AbortSignal): Promise<LLMResponse> {
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const requestBody: Record<string, unknown> = {
      model: this.model,
      max_tokens: maxTokens,
      temperature: 0.2,
      messages: conversationMessages.map(m => ({
        role: m.role,
        content: m.content,
      })),
    };

    if (systemMessage) {
      requestBody.system = systemMessage.content;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      if (response.status === 429) {
        // Claude sends retry-after in seconds as a header
        const retryAfter = response.headers.get('retry-after');
        const retryMs = retryAfter
          ? (parseFloat(retryAfter) * 1000 + 2000)
          : 65_000;
        throw new RateLimitError('claude', retryMs);
      }
      throw new LLMError(
        `Claude API error: ${response.status} ${errorText}`,
        'claude',
        response.status
      );
    }

    const data = await response.json() as {
      content: Array<{ type: string; text: string }>;
      usage?: { input_tokens: number; output_tokens: number };
    };

    const content = data.content.find(c => c.type === 'text')?.text;
    if (!content) {
      throw new LLMError('Claude returned empty response', 'claude');
    }

    return {
      content,
      tokensUsed: data.usage
        ? data.usage.input_tokens + data.usage.output_tokens
        : undefined,
      inputTokens: data.usage?.input_tokens,
      outputTokens: data.usage?.output_tokens,
    };
  }
}
