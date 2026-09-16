// packages/cli/tests/lib/migrate-load.test.ts
import { describe, it, expect } from 'vitest';
import { loadTransforms } from '../../src/lib/migrate-load.js';

describe('loadTransforms', () => {
  it('loads intent transforms (js or ts) in the test environment', async () => {
    const transforms = await loadTransforms('intent');
    // The repo ships intent-0.1.0-to-0.2.0 and intent-0.2.0-to-0.5.0.
    // After the build compiles .js, or on Node 22+ via .ts, at least the
    // 0.2.0->0.5.0 key must be present.
    expect(Object.keys(transforms)).toContain('0.2.0->0.5.0');
    expect(typeof transforms['0.2.0->0.5.0']).toBe('function');
  });

  it('returns empty object for unknown artifact type', async () => {
    const transforms = await loadTransforms('nonexistent-type');
    expect(transforms).toEqual({});
  });
});
