import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm, ensureDir } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { status } from '../../src/commands/status.js';

describe('status command', () => {
  it('infers state from artifact files when status.json is missing', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-status-'));
    await ensureDir(join(tmp, '.loshu-sdlc'));
    await writeFile(join(tmp, '.loshu-sdlc/intent.md'), '# Intent');
    try {
      const logs: string[] = [];
      const original = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        const code = await status({ path: tmp });
        expect(code).toBe(0);
      } finally {
        console.log = original;
      }
      const out = logs.join('\n');
      expect(out).toContain('Plan');
      expect(out).toContain('intent.md');
      expect(out).toContain('present');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('reports missing artifacts as such', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-status-'));
    try {
      const logs: string[] = [];
      const original = console.log;
      console.log = (msg: string) => logs.push(msg);
      try {
        const code = await status({ path: tmp });
        expect(code).toBe(0);
      } finally {
        console.log = original;
      }
      const out = logs.join('\n');
      expect(out).toContain('missing');
    } finally {
      await rm(tmp, { recursive: true, force: true });
    }
  });

  it('emits structured JSON when --json is set', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-status-'));
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await status({ path: tmp, json: true });
      expect(code).toBe(0);
    } finally {
      console.log = original;
      await rm(tmp, { recursive: true, force: true });
    }
    const parsed = JSON.parse(logs.join('\n')) as { stages: unknown[] };
    expect(parsed.stages.length).toBeGreaterThan(0);
  });

  it('reads .loshu-sdlc/state/status.json when present', async () => {
    const tmp = await mkdtemp(join(tmpdir(), 'loshu-status-'));
    await ensureDir(join(tmp, '.loshu-sdlc/state'));
    await writeFile(
      join(tmp, '.loshu-sdlc/state/status.json'),
      JSON.stringify({
        version: '0.1.0',
        cycle: 7,
        cycleTitle: 'demo',
        stages: [{ stage: 'Plan', artifact: 'intent.md', status: 'present', updated: '2026-09-14', nextGate: '—' }],
        externalDeps: { tier1: '5/5', tier2: '6/6', tier3: '17/17' },
      }),
    );
    const logs: string[] = [];
    const original = console.log;
    console.log = (msg: string) => logs.push(msg);
    try {
      const code = await status({ path: tmp });
      expect(code).toBe(0);
    } finally {
      console.log = original;
      await rm(tmp, { recursive: true, force: true });
    }
    const out = logs.join('\n');
    expect(out).toContain('Cycle: 7');
    expect(out).toContain('demo');
  });
});