import { ILLMProvider, LLMMessage, LLMResponse, LLMError, RateLimitError } from '../types';

export class GeminiProvider implements ILLMProvider {
  readonly name = 'gemini';

  constructor(
    private readonly apiKey: string,
    private readonly model: string = 'gemini-2.5-flash'
  ) {}

  async complete(messages: LLMMessage[], maxTokens = 4096, signal?: AbortSignal): Promise<LLMResponse> {
    // Convert messages to Gemini format
    const systemMessage = messages.find(m => m.role === 'system');
    const conversationMessages = messages.filter(m => m.role !== 'system');

    const contents = conversationMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const requestBody: Record<string, unknown> = {
      contents,
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature: 0.2,
      },
    };

    if (systemMessage) {
      requestBody.systemInstruction = {
        parts: [{ text: systemMessage.content }],
      };
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      if (response.status === 429) {
        throw new RateLimitError('gemini', parseRetryDelay(errorText));
      }
      throw new LLMError(
        `Gemini API error: ${response.status} ${errorText}`,
        'gemini',
        response.status
      );
    }

    const data = await response.json() as {
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
        finishReason?: string;
      }>;
      usageMetadata?: { totalTokenCount: number; promptTokenCount?: number; candidatesTokenCount?: number };
    };

    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) {
      throw new LLMError('Gemini returned empty response', 'gemini');
    }

    return {
      content,
      tokensUsed: data.usageMetadata?.totalTokenCount,
      inputTokens: data.usageMetadata?.promptTokenCount,
      outputTokens: data.usageMetadata?.candidatesTokenCount,
    };
  }
}

// Parses "retryDelay": "35s" or "retryDelay": "35.748s" from a 429 body.
// Falls back to 60s if not found.
function parseRetryDelay(body: string): number {
  try {
    const parsed = JSON.parse(body);
    const details: Array<{ '@type': string; retryDelay?: string }> =
      parsed?.error?.details ?? [];
    for (const detail of details) {
      if (detail['@type']?.endsWith('RetryInfo') && detail.retryDelay) {
        const seconds = parseFloat(detail.retryDelay.replace('s', ''));
        if (!isNaN(seconds)) {
          return Math.ceil(seconds) * 1000 + 2000; // add 2s buffer
        }
      }
    }
  } catch { /* ignore */ }
  return 65_000; // default 65s if we can't parse
}
