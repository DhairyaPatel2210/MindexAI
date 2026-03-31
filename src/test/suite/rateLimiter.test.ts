import * as assert from 'assert';
import { RateLimiter } from '../../llm/rateLimiter';

suite('RateLimiter', () => {
  test('does not block below the limit', async () => {
    const limiter = new RateLimiter(10);
    const start = Date.now();
    // Acquire 5 slots — should complete instantly
    for (let i = 0; i < 5; i++) {
      await limiter.acquire();
    }
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 200, `Should be nearly instant, took ${elapsed}ms`);
  });

  test('usedInWindow reflects recent acquisitions', async () => {
    const limiter = new RateLimiter(100);
    assert.strictEqual(limiter.usedInWindow, 0);
    await limiter.acquire();
    assert.strictEqual(limiter.usedInWindow, 1);
    await limiter.acquire();
    assert.strictEqual(limiter.usedInWindow, 2);
  });

  test('usedInWindow returns correct count after multiple acquires', async () => {
    const limiter = new RateLimiter(100);
    for (let i = 0; i < 8; i++) {
      await limiter.acquire();
    }
    assert.strictEqual(limiter.usedInWindow, 8);
  });

  test('allows acquiring up to maxRequestsPerMinute without blocking', async () => {
    const max = 5;
    const limiter = new RateLimiter(max);
    const start = Date.now();
    for (let i = 0; i < max; i++) {
      await limiter.acquire();
    }
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 500, `Acquiring ${max} slots should be instant, took ${elapsed}ms`);
    assert.strictEqual(limiter.usedInWindow, max);
  });

  test('instantiation with different limits works independently', async () => {
    const limiter1 = new RateLimiter(10);
    const limiter2 = new RateLimiter(20);
    await limiter1.acquire();
    await limiter1.acquire();
    await limiter2.acquire();
    assert.strictEqual(limiter1.usedInWindow, 2);
    assert.strictEqual(limiter2.usedInWindow, 1);
  });
});
