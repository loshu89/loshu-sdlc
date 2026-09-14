import { describe, it, expect } from 'vitest';
import { coverage } from '../../src/commands/coverage.js';

describe('coverage command', () => {
  it('shows help with --help', async () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await coverage({ path: '.', help: true });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
    expect(logs.join('\n')).toMatch(/Usage/);
  });

  it('returns 6 when node_modules is missing', async () => {
    const original = console.error;
    const errors: string[] = [];
    console.error = (msg: string) => errors.push(msg);
    try {
      const code = await coverage({ path: '/tmp/definitely-not-a-real-path-for-coverage-xyz' });
      expect(code).toBe(6);
    } finally {
      console.error = original;
    }
  });
});