import { ILLMProvider, LLMMessage, LLMResponse, LLMError, RateLimitError } from '../types';

/**
 * OllamaProvider connects to a locally-running Ollama instance using its
 * native NDJSON streaming API (/api/chat), which is distinct from the
 * OpenAI-compatible /v1/chat/completions endpoint.
 *
 * Endpoint: POST <baseUrl>/api/chat
 * Stream format: one JSON object per line (newline-delimited JSON, not SSE).
 *
 * Supports early JSON termination: once the top-level object in the LLM
 * response text is complete (brace depth returns to 0), the stream is
 * cancelled so Ollama stops generating.
 */
export class OllamaProvider implements ILLMProvider {
  // Use name 'local' so the rate-limiter bypass in workflowRunner applies
  readonly name = 'local';

  constructor(
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  async complete(messages: LLMMessage[], maxTokens = 4096, signal?: AbortSignal): Promise<LLMResponse> {
    const endpoint = `${this.baseUrl.replace(/\/+$/, '')}/api/chat`;

    let response: Response;
    try {
      response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: messages.map(m => ({ role: m.role, content: m.content })),
          stream: true,
          options: {
            temperature: 0.2,
            num_predict: maxTokens,
          },
        }),
        signal,
      });
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') { throw err; }
      throw new LLMError(
        `Cannot reach Ollama at ${this.baseUrl}. ` +
        `Make sure Ollama is running (ollama serve). Original error: ${(err as Error).message}`,
        'local'
      );
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      if (response.status === 429) { throw new RateLimitError('local', 5_000); }
      throw new LLMError(
        `Ollama error: ${response.status} ${errorText}`,
        'local',
        response.status
      );
    }

    if (!response.body) {
      throw new LLMError('Ollama returned no response body', 'local');
    }

    return this.readStream(response.body, signal);
  }

  // ── NDJSON stream reader ─────────────────────────────────────────────────────
  // Ollama streams one JSON object per line (no "data:" SSE prefix).
  // Format: {"model":"...","message":{"role":"assistant","content":"token"},"done":false}
  //         {"model":"...","message":{"role":"assistant","content":""},"done":true,...}

  private async readStream(body: ReadableStream<Uint8Array>, signal?: AbortSignal): Promise<LLMResponse> {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let content = '';
    let partial = '';

    // JSON brace-depth tracking for early termination —
    // same algorithm as LocalProvider / extractJson() in fileAnalyzer.ts
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

        const text = partial + decoder.decode(value, { stream: true });
        const lines = text.split('\n');
        partial = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) { continue; }

          let parsed: {
            message?: { content?: string };
            done?: boolean;
            error?: string;
          };
          try { parsed = JSON.parse(trimmed); } catch { continue; }

          if (parsed.error) {
            throw new LLMError(`Ollama error: ${parsed.error}`, 'local');
          }

          if (parsed.done) { break outer; }

          const token = parsed.message?.content ?? '';
          if (!token) { continue; }

          content += token;

          // Walk token characters to track JSON brace depth
          for (const ch of token) {
            if (escape)               { escape = false; continue; }
            if (ch === '\\' && inString) { escape = true;  continue; }
            if (ch === '"')           { inString = !inString; continue; }
            if (inString)             { continue; }
            if (ch === '{')           { jsonStarted = true; depth++; }
            else if (ch === '}' && jsonStarted) {
              depth--;
              if (depth === 0) {
                reader.cancel().catch(() => {});
                break outer;
              }
            }
          }
        }
      }
    } finally {
      try { reader.releaseLock(); } catch { /* already released */ }
    }

    if (!content) {
      throw new LLMError('Ollama returned empty response', 'local');
    }

    return { content };
  }
}
