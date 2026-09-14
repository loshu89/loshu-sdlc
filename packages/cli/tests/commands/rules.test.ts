import { describe, it, expect } from 'vitest';
import { rules, RULES } from '../../src/commands/rules.js';

describe('rules command', () => {
  it('list prints all rules', async () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await rules({ subcommand: 'list' });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
    const out = logs.join('\n');
    for (const r of RULES) {
      expect(out).toContain(r.name);
    }
  });

  it('list --json emits JSON object', async () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await rules({ subcommand: 'list', json: true });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
    const parsed = JSON.parse(logs.join('\n')) as { rules: typeof RULES };
    expect(parsed.rules.length).toBe(RULES.length);
  });

  it('check <name> returns 0 for a known rule', async () => {
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await rules({ subcommand: 'check', name: 'attribution-provenance', path: '.' });
      expect(code).toBe(0);
    } finally {
      console.log = original;
    }
  });

  it('check returns 2 for an unknown rule', async () => {
    const original = console.error;
    const errors: string[] = [];
    console.error = (msg: string) => errors.push(msg);
    try {
      const code = await rules({ subcommand: 'check', name: 'nonexistent-rule' });
      expect(code).toBe(2);
    } finally {
      console.error = original;
    }
    expect(errors.join('\n')).toMatch(/Unknown rule/);
  });

  it('check requires a name', async () => {
    const original = console.error;
    const errors: string[] = [];
    console.error = (msg: string) => errors.push(msg);
    try {
      const code = await rules({ subcommand: 'check' });
      expect(code).toBe(2);
    } finally {
      console.error = original;
    }
  });
});