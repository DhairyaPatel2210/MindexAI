import * as assert from 'assert';
import { UsageTracker, getStatsDisplay, UsageStatsData } from '../../core/stats/usageStats';
import { LLMResponse } from '../../llm/types';

// ── UsageTracker ──────────────────────────────────────────────────────────────

suite('UsageTracker', () => {
  test('starts at zero', () => {
    const tracker = new UsageTracker();
    assert.strictEqual(tracker.inputTokens, 0);
    assert.strictEqual(tracker.outputTokens, 0);
    assert.strictEqual(tracker.unsplitTokens, 0);
    assert.strictEqual(tracker.requestCount, 0);
    assert.strictEqual(tracker.totalDurationMs, 0);
  });

  test('recordCall accumulates split input/output tokens', () => {
    const tracker = new UsageTracker();
    const response: LLMResponse = { content: 'ok', inputTokens: 100, outputTokens: 50 };
    tracker.recordCall(response, 500);
    assert.strictEqual(tracker.inputTokens, 100);
    assert.strictEqual(tracker.outputTokens, 50);
    assert.strictEqual(tracker.unsplitTokens, 0);
    assert.strictEqual(tracker.requestCount, 1);
    assert.strictEqual(tracker.totalDurationMs, 500);
  });

  test('recordCall accumulates unsplit tokens when no split available', () => {
    const tracker = new UsageTracker();
    const response: LLMResponse = { content: 'ok', tokensUsed: 200 };
    tracker.recordCall(response, 300);
    assert.strictEqual(tracker.unsplitTokens, 200);
    assert.strictEqual(tracker.inputTokens, 0);
    assert.strictEqual(tracker.outputTokens, 0);
  });

  test('recordCall accumulates across multiple calls', () => {
    const tracker = new UsageTracker();
    const r1: LLMResponse = { content: 'a', inputTokens: 100, outputTokens: 50 };
    const r2: LLMResponse = { content: 'b', inputTokens: 200, outputTokens: 75 };
    tracker.recordCall(r1, 100);
    tracker.recordCall(r2, 200);
    assert.strictEqual(tracker.inputTokens, 300);
    assert.strictEqual(tracker.outputTokens, 125);
    assert.strictEqual(tracker.requestCount, 2);
    assert.strictEqual(tracker.totalDurationMs, 300);
  });

  test('recordCall handles response with no token info', () => {
    const tracker = new UsageTracker();
    const response: LLMResponse = { content: 'empty' };
    tracker.recordCall(response, 100);
    assert.strictEqual(tracker.inputTokens, 0);
    assert.strictEqual(tracker.outputTokens, 0);
    assert.strictEqual(tracker.unsplitTokens, 0);
    assert.strictEqual(tracker.requestCount, 1);
  });

  test('prefers split tokens over combined total', () => {
    const tracker = new UsageTracker();
    // When both split and total are present, split should be used
    const response: LLMResponse = {
      content: 'ok',
      inputTokens: 80,
      outputTokens: 40,
      tokensUsed: 120,
    };
    tracker.recordCall(response, 0);
    assert.strictEqual(tracker.inputTokens, 80);
    assert.strictEqual(tracker.outputTokens, 40);
    assert.strictEqual(tracker.unsplitTokens, 0);
  });
});

// ── getStatsDisplay ───────────────────────────────────────────────────────────

suite('getStatsDisplay', () => {
  function makeStats(providerName: string, overrides: Partial<{
    inputTokens: number;
    outputTokens: number;
    unsplitTokens: number;
    requestCount: number;
    filesAnalyzed: number;
    filesFromCache: number;
    errors: number;
    totalDurationMs: number;
    workflowRuns: number;
  }>): UsageStatsData {
    const {
      inputTokens = 0, outputTokens = 0, unsplitTokens = 0,
      requestCount = 0, filesAnalyzed = 0, filesFromCache = 0,
      errors = 0, totalDurationMs = 0, workflowRuns = 1,
    } = overrides;
    const now = new Date().toISOString();
    return {
      version: 1,
      providers: {
        [providerName]: {
          inputTokens, outputTokens, unsplitTokens,
          requestCount, filesAnalyzed, filesFromCache,
          errors, totalDurationMs, lastUsed: now,
        },
      },
      global: { workflowRuns, firstUsed: now, lastUsed: now },
      runHistory: [],
    };
  }

  test('computes totalTokens as sum of input + output + unsplit', () => {
    const data = makeStats('openai', { inputTokens: 500, outputTokens: 200, unsplitTokens: 50 });
    const display = getStatsDisplay(data);
    assert.strictEqual(display.providers[0].totalTokens, 750);
  });

  test('computes avgInputTokensPerRun correctly', () => {
    const data = makeStats('openai', {
      inputTokens: 3000,
      outputTokens: 1000,
      workflowRuns: 3,
    });
    const display = getStatsDisplay(data);
    assert.strictEqual(display.providers[0].avgInputTokensPerRun, 1000);
  });

  test('computes avgOutputTokensPerRun correctly', () => {
    const data = makeStats('claude', {
      inputTokens: 0,
      outputTokens: 600,
      workflowRuns: 4,
    });
    const display = getStatsDisplay(data);
    assert.strictEqual(display.providers[0].avgOutputTokensPerRun, 150);
  });

  test('computes avgFilesPerRun correctly', () => {
    const data = makeStats('gemini', {
      filesAnalyzed: 30,
      filesFromCache: 10,
      workflowRuns: 4,
    });
    const display = getStatsDisplay(data);
    assert.strictEqual(display.providers[0].avgFilesPerRun, 10);
  });

  test('returns zero averages when workflowRuns is 0', () => {
    const data = makeStats('openai', { workflowRuns: 0, inputTokens: 100, outputTokens: 50 });
    const display = getStatsDisplay(data);
    assert.strictEqual(display.providers[0].avgInputTokensPerRun, 0);
    assert.strictEqual(display.providers[0].avgOutputTokensPerRun, 0);
    assert.strictEqual(display.providers[0].avgFilesPerRun, 0);
  });

  test('rounds averages to nearest integer', () => {
    const data = makeStats('local', {
      inputTokens: 100,
      outputTokens: 50,
      workflowRuns: 3,
    });
    const display = getStatsDisplay(data);
    // 100/3 = 33.33... → rounds to 33
    assert.strictEqual(display.providers[0].avgInputTokensPerRun, 33);
    // 50/3 = 16.67... → rounds to 17
    assert.strictEqual(display.providers[0].avgOutputTokensPerRun, 17);
  });

  test('converts duration to minutes', () => {
    const data = makeStats('openai', { totalDurationMs: 120_000 }); // 2 minutes
    const display = getStatsDisplay(data);
    assert.strictEqual(display.providers[0].durationMin, 2);
  });

  test('preserves global stats', () => {
    const data = makeStats('openai', { workflowRuns: 5 });
    const display = getStatsDisplay(data);
    assert.strictEqual(display.global.workflowRuns, 5);
  });

  test('handles multiple providers', () => {
    const now = new Date().toISOString();
    const data: UsageStatsData = {
      version: 1,
      providers: {
        openai: {
          inputTokens: 1000, outputTokens: 500, unsplitTokens: 0,
          requestCount: 10, filesAnalyzed: 20, filesFromCache: 5,
          errors: 0, totalDurationMs: 60_000, lastUsed: now,
        },
        claude: {
          inputTokens: 2000, outputTokens: 800, unsplitTokens: 0,
          requestCount: 8, filesAnalyzed: 15, filesFromCache: 3,
          errors: 1, totalDurationMs: 45_000, lastUsed: now,
        },
      },
      global: { workflowRuns: 3, firstUsed: now, lastUsed: now },
      runHistory: [],
    };
    const display = getStatsDisplay(data);
    assert.strictEqual(display.providers.length, 2);
    const openai = display.providers.find(p => p.name === 'openai');
    const claude = display.providers.find(p => p.name === 'claude');
    assert.ok(openai, 'Should have openai provider');
    assert.ok(claude, 'Should have claude provider');
    assert.strictEqual(openai!.totalTokens, 1500);
    assert.strictEqual(claude!.errors, 1);
  });
});
