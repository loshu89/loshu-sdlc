import { describe, it, expect } from 'vitest';
import { doctor } from '../../src/commands/doctor.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
// packages/cli/tests/commands/<file>.ts → repo root (4 levels up)
const repoRoot = resolve(__dirname, '../../../..');

describe('doctor command', () => {
  it('reports issues when schemas are missing', async () => {
    // Mock missing schemas dir
    const code = await doctor({ path: '/tmp/nonexistent' });
    expect(code).toBeGreaterThan(0);
  });

  it('returns 0 when repo is complete', async () => {
    const code = await doctor({ path: repoRoot });
    expect(code).toBe(0);
  });
});
