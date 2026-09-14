import { describe, it, expect } from 'vitest';
import { doctor } from '../../src/commands/doctor.js';

describe('doctor command', () => {
  it('reports issues when schemas are missing', async () => {
    // Mock missing schemas dir
    const code = await doctor({ path: '/tmp/nonexistent' });
    expect(code).toBeGreaterThan(0);
  });

  it('returns 0 when repo is complete', async () => {
    // Test runs from packages/cli/, so repo root is '../..'
    const code = await doctor({ path: '../..' });
    expect(code).toBe(0);
  });
});
