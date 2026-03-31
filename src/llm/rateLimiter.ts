import { logger } from '../utils/logger';

/**
 * Sliding-window rate limiter.
 * Tracks timestamps of recent requests and blocks until it is safe to proceed.
 *
 * Example: maxRequestsPerMinute=12 means at most 12 LLM calls in any 60-second window.
 */
export class RateLimiter {
  private readonly windowMs = 60_000;
  private readonly timestamps: number[] = [];

  constructor(private readonly maxRequestsPerMinute: number) {}

  /**
   * Call this before every LLM request.
   * If the quota for the current window is exhausted it sleeps until a slot opens.
   */
  async acquire(): Promise<void> {
    while (true) {
      const now = Date.now();

      // Drop timestamps outside the sliding window
      while (this.timestamps.length > 0 && now - this.timestamps[0] >= this.windowMs) {
        this.timestamps.shift();
      }

      if (this.timestamps.length < this.maxRequestsPerMinute) {
        this.timestamps.push(now);
        return;
      }

      // How long until the oldest timestamp falls out of the window?
      const oldestTs = this.timestamps[0];
      const waitMs = this.windowMs - (now - oldestTs) + 500; // +500ms buffer
      logger.info(
        `Rate limiter: ${this.timestamps.length}/${this.maxRequestsPerMinute} requests used. ` +
        `Waiting ${Math.ceil(waitMs / 1000)}s for next slot…`
      );
      await sleep(waitMs);
    }
  }

  get usedInWindow(): number {
    const now = Date.now();
    return this.timestamps.filter(t => now - t < this.windowMs).length;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
