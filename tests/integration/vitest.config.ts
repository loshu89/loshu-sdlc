import { defineConfig } from 'vitest/config';

// v0.6.1 T7: closed-loop E2E can take ~9 minutes on Windows (T2's smoke).
// Default testTimeout 5s is too tight — wire a generous default here so the
// hook-chain test in closed-loop.test.ts gets enough headroom. The closed-
// loop test further sets its own per-test timeout (5 min locally, 3 min in
// CI via the LOSHU_LOOP_TIMEOUT_MS env var) — this config-level default
// is a safety net for any other long-running test added later.
//
// Default: 5 min (300_000 ms). CI overrides to 3 min via CI=true detection.
const isCI = process.env.CI === 'true' || process.env.CI === '1';
const defaultTimeoutMs = isCI ? 180_000 : 300_000;

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    testTimeout: defaultTimeoutMs,
    hookTimeout: defaultTimeoutMs,
  },
});
