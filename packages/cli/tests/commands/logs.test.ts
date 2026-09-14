import { describe, it, expect } from 'vitest';
import { logs } from '../../src/commands/logs.js';

describe('logs command', () => {
  it('shows help with --help', async () => {
    const out: string[] = [];
    const original = console.log;
    console.log = (msg: string) => out.push(msg);
    try {
      const code = await logs({ help: true });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
    expect(out.join('\n')).toMatch(/Usage/);
  });

  it('runs without error when log directory is empty or missing', async () => {
    const out: string[] = [];
    const original = console.log;
    console.log = (msg: string) => out.push(msg);
    try {
      const code = await logs({});
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
    expect(out.length).toBeGreaterThan(0);
  });

  it('emits JSON array with --json', async () => {
    const out: string[] = [];
    const original = console.log;
    console.log = (msg: string) => out.push(msg);
    try {
      const code = await logs({ json: true });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
    const parsed = JSON.parse(out.join('\n')) as { entries: unknown[] };
    expect(Array.isArray(parsed.entries)).toBe(true);
  });
});