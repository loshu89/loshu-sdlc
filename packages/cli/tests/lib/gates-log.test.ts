import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, ensureDir } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  appendEvent,
  readEvents,
  readEventsSince,
  type GateEvent,
} from '../../src/lib/gates-log.js';

let tmp: string;
let logPath: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'loshu-gates-'));
  logPath = join(tmp, '.loshu-sdlc/state/gates.jsonl');
  await ensureDir(join(tmp, '.loshu-sdlc/state'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('appendEvent', () => {
  it('writes a single JSON line and stamps ts when missing', async () => {
    const event = await appendEvent(logPath, {
      cycle: 1,
      gate: 'plan-exit',
      stage: 'plan',
      result: 'accept',
      artifact: 'intent.md',
      sha: 'abc',
    });
    expect(event.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    const content = await readFile(logPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBe(1);
    const parsed = JSON.parse(lines[0] ?? '') as GateEvent;
    expect(parsed.gate).toBe('plan-exit');
    expect(parsed.cycle).toBe(1);
  });

  it('appends multiple events on separate lines', async () => {
    await appendEvent(logPath, { cycle: 1, gate: 'plan-exit', stage: 'plan', result: 'accept' });
    await appendEvent(logPath, { cycle: 1, gate: 'design-exit', stage: 'design', result: 'block', errors: ['architecture required'] });
    await appendEvent(logPath, { cycle: 1, gate: 'build-exit', stage: 'build', result: 'accept' });
    const content = await readFile(logPath, 'utf8');
    const lines = content.split(/\r?\n/).filter(Boolean);
    expect(lines.length).toBe(3);
  });

  it('preserves a user-supplied ts verbatim', async () => {
    const ts = '2026-09-14T10:30:00Z';
    const event = await appendEvent(logPath, {
      ts,
      cycle: 1,
      gate: 'plan-exit',
      stage: 'plan',
      result: 'accept',
    });
    expect(event.ts).toBe(ts);
  });
});

describe('readEvents', () => {
  it('returns [] when the file does not exist', async () => {
    const events = await readEvents(logPath);
    expect(events).toEqual([]);
  });

  it('skips corrupted lines', async () => {
    await writeFile(
      logPath,
      [
        JSON.stringify({ ts: '2026-09-14T10:00:00Z', cycle: 1, gate: 'plan-exit', stage: 'plan', result: 'accept' }),
        '{ this is not valid json',
        JSON.stringify({ ts: '2026-09-14T10:01:00Z', cycle: 1, gate: 'design-exit', stage: 'design', result: 'accept' }),
      ].join('\n') + '\n',
      'utf8',
    );
    const events = await readEvents(logPath);
    expect(events.length).toBe(2);
  });

  it('filters by cycle, gate, and result', async () => {
    await appendEvent(logPath, { cycle: 1, gate: 'plan-exit', stage: 'plan', result: 'accept' });
    await appendEvent(logPath, { cycle: 1, gate: 'design-exit', stage: 'design', result: 'block' });
    await appendEvent(logPath, { cycle: 2, gate: 'plan-exit', stage: 'plan', result: 'accept' });
    const byCycle = await readEvents(logPath, { cycle: 1 });
    expect(byCycle.length).toBe(2);
    const byGate = await readEvents(logPath, { gate: 'plan-exit' });
    expect(byGate.length).toBe(2);
    const byResult = await readEvents(logPath, { result: 'block' });
    expect(byResult.length).toBe(1);
    const combined = await readEvents(logPath, { cycle: 1, gate: 'plan-exit' });
    expect(combined.length).toBe(1);
  });
});

describe('readEventsSince', () => {
  it('returns only events at or after the cutoff', async () => {
    await appendEvent(logPath, { ts: '2026-09-14T10:00:00Z', cycle: 1, gate: 'plan-exit', stage: 'plan', result: 'accept' });
    await appendEvent(logPath, { ts: '2026-09-14T11:00:00Z', cycle: 1, gate: 'design-exit', stage: 'design', result: 'accept' });
    await appendEvent(logPath, { ts: '2026-09-14T12:00:00Z', cycle: 1, gate: 'build-exit', stage: 'build', result: 'accept' });
    const events = await readEventsSince(logPath, '2026-09-14T11:00:00Z');
    expect(events.length).toBe(2);
    expect(events[0]?.gate).toBe('design-exit');
  });
});
