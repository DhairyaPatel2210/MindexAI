import { ILLMProvider, LLMMessage, LLMResponse, LLMError, RateLimitError } from '../types';
import { logger } from '../../utils/logger';

/**
 * OpenAICompatProvider connects to a remote server that exposes the OpenAI
 * /v1/chat/completions API — e.g. vLLM, LiteLLM, text-generation-inference,
 * Perplexity, Together AI, Anyscale, or any self-hosted inference endpoint.
 *
 * Unlike LocalProvider (which uses streaming for fast early termination),
 * this provider uses non-streaming requests to get accurate token counts
 * in the response. This is important for remote servers where we want
 * to track usage statistics accurately.
 */
export class OpenAICompatProvider implements ILLMProvider {
  readonly name = 'openai-compat';

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
    private readonly apiKey: string = 'no-key'
  ) {}

  async complete(messages: LLMMessage[], maxTokens = 4096, signal?: AbortSignal): Promise<LLMResponse> {
    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/chat/completions`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
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
          stream: false,  // Non-streaming to get accurate token counts
        }),
        signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') { throw err; }
      throw new LLMError(
        `Cannot reach OpenAI-compatible server at ${this.baseUrl}. ` +
        `Original error: ${(err as Error).message}`,
        this.name
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      if (response.status === 429) { throw new RateLimitError(this.name, 5_000); }
      throw new LLMError(
        `OpenAI-compatible server error: ${response.status} ${errorText}`,
        this.name,
        response.status
      );
    }

    const data = await response.json() as {
      choices?: Array<{ message?: { content?: string } }>;
      usage?: {
        prompt_tokens?: number;
        completion_tokens?: number;
        total_tokens?: number;
      };
    };

    const content = data.choices?.[0]?.message?.content ?? '';

    const inputTokens = data.usage?.prompt_tokens;
    const outputTokens = data.usage?.completion_tokens;
    const tokensUsed = data.usage?.total_tokens ??
      (inputTokens != null && outputTokens != null ? inputTokens + outputTokens : undefined);

    logger.debug(`OpenAI-compat tokens: ${inputTokens ?? '?'} in + ${outputTokens ?? '?'} out`);

    return { content, tokensUsed, inputTokens, outputTokens };
  }
}
