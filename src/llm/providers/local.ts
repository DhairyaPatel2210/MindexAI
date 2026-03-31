import { ILLMProvider, LLMMessage, LLMResponse, LLMError, RateLimitError } from '../types';

/**
 * LocalProvider connects to any OpenAI-compatible local inference server.
 *
 * Uses SSE streaming so we can:
 *  1. Stop as soon as the top-level JSON object is complete (early termination —
 *     avoids waiting for the model to over-generate after the closing `}`).
 *  2. Abort the in-flight HTTP request instantly when a VS Code cancellation fires,
 *     which also signals the server to stop decoding (saves GPU/CPU cycles).
 *
 * Supported runners (all expose /v1/chat/completions):
 *   - Ollama          http://localhost:11434/v1
 *   - LM Studio       http://localhost:1234/v1
 *   - llama.cpp       http://localhost:8080/v1
 *   - Jan.ai          http://localhost:1337/v1
 *   - text-generation-webui  http://localhost:5000/v1
 */
export class LocalProvider implements ILLMProvider {
  readonly name: string;
  protected readonly serverLabel: string;

  constructor(
    protected readonly baseUrl: string,
    protected readonly model: string,
    protected readonly apiKey: string = 'local',
    name = 'local',
    serverLabel = 'local LLM server'
  ) {
    this.name = name;
    this.serverLabel = serverLabel;
  }

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
          stream: true,          // stream tokens so we can stop early + cancel immediately
        }),
        signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') { throw err; }
      throw new LLMError(
        `Cannot reach ${this.serverLabel} at ${this.baseUrl}. ` +
        `Make sure the server is running. Original error: ${(err as Error).message}`,
        this.name
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      if (response.status === 429) { throw new RateLimitError(this.name, 5_000); }
      throw new LLMError(
        `${this.serverLabel} error: ${response.status} ${errorText}`,
        this.name,
        response.status
      );
    }

    if (!response.body) {
      throw new LLMError(`${this.serverLabel} returned no response body`, this.name);
    }

    // Some servers ignore stream:true and return a regular JSON body.
    // Check Content-Type to decide parsing strategy.
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('text/event-stream') && contentType.includes('application/json')) {
      return this.readNonStreamingResponse(response);
    }

    return this.readStream(response.body, signal);
  }

  // ── SSE stream reader ───────────────────────────────────────────────────────

  private async readStream(body: ReadableStream<Uint8Array>, signal?: AbortSignal): Promise<LLMResponse> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let partial = '';   // carry-over from incomplete SSE lines

    // JSON brace-depth tracking for early termination
    let jsonStarted = false;
    let depth = 0;
    let inString = false;
    let escape = false;

    try {
      outer: while (true) {
        if (signal?.aborted) {
          reader.cancel().catch(() => {});
          throw new DOMException('Aborted', 'AbortError');
        }

        const { done, value } = await reader.read();
        if (done) { break; }

        // Decode and split on newlines; carry over partial lines
        const text = partial + decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        partial = lines.pop() ?? '';  // last element may be incomplete

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) { continue; }
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') { break outer; }

          let parsed: { choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }> };
          try { parsed = JSON.parse(data); } catch { continue; }

          const token = parsed.choices?.[0]?.delta?.content ?? '';
          if (!token) {
            if (parsed.choices?.[0]?.finish_reason) { break outer; }
            continue;
          }

          content += token;

          // Walk token characters to track JSON brace depth
          // Uses the same algorithm as extractJson() in fileAnalyzer.ts
          for (const ch of token) {
            if (escape)              { escape = false; continue; }
            if (ch === '\\' && inString) { escape = true;  continue; }
            if (ch === '"')          { inString = !inString; continue; }
            if (inString)            { continue; }
            if (ch === '{')          { jsonStarted = true; depth++; }
            else if (ch === '}' && jsonStarted) {
              depth--;
              if (depth === 0) {
                // Top-level JSON object complete — stop reading.
                // reader.cancel() signals the server to stop decoding,
                // saving GPU/CPU for all the tokens it would have generated after.
                reader.cancel().catch(() => {});
                break outer;
              }
            }
          }
        }
      }
    } finally {
      // Always release the reader lock, even on error
      try { reader.releaseLock(); } catch { /* already released */ }
    }

    // Empty content is valid — some servers don't stream tokens for very short responses.
    // Callers should handle empty content if needed.
    return { content };
  }

  // ── Non-streaming response reader ──────────────────────────────────────────

  private async readNonStreamingResponse(response: Response): Promise<LLMResponse> {
    const text = await response.text();
    if (!text) {
      // Server returned 200 OK with no body — treat as successful but empty
      return { content: '' };
    }

    try {
      const json = JSON.parse(text) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
      };
      const content = json.choices?.[0]?.message?.content ?? '';
      const inputTokens = json.usage?.prompt_tokens;
      const outputTokens = json.usage?.completion_tokens;
      const tokensUsed = json.usage?.total_tokens;
      return { content, tokensUsed, inputTokens, outputTokens };
    } catch {
      // If we can't parse as JSON, return the raw text
      return { content: text };
    }
  }
}
