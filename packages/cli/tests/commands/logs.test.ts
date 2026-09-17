import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { logs } from '../../src/commands/logs.js';

describe('loshu-sdlc logs', () => {
  let logDir: string;
  let origHome: string | undefined;
  let tempHome: string | undefined;

  beforeEach(async () => {
    origHome = process.env.HOME;
    tempHome = await mkdtemp(join(tmpdir(), 'loshu-logs-home-'));
    process.env.HOME = tempHome;
    logDir = join(process.env.HOME, '.loshu-sdlc/logs');
    await import('fs-extra').then((m) => m.ensureDir(logDir));
  });

  afterEach(async () => {
    if (origHome === undefined) delete process.env.HOME;
    else process.env.HOME = origHome;
    if (tempHome) {
      await rm(tempHome, { recursive: true, force: true });
      tempHome = undefined;
    }
  });

  it('reads and prints log entries', async () => {
    await writeFile(
      join(logDir, 'test.log'),
      [
        '2026-01-01T00:00:00Z [cycle=1 stage=plan] INFO plan-exit: accepted intent',
        '2026-01-01T00:00:01Z [cycle=1 stage=design] ERROR design-exit: failed',
      ].join('\n'),
      'utf-8',
    );
    const rc = await logs({});
    expect(rc).toBe(0);
    // Can't easily capture console output here; the rc=0 + no-throw is the
    // primary signal. Add an explicit JSON-output variant below for
    // shape verification.
  });

  it('JSON output shape', async () => {
    await writeFile(
      join(logDir, 'test.log'),
      '2026-01-01T00:00:00Z [cycle=1 stage=plan] INFO msg',
      'utf-8',
    );
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };
    try {
      await logs({ json: true });
    } finally {
      console.log = origLog;
    }
    const parsed = JSON.parse(captured) as { entries: Array<{ cycle?: number; stage?: string; level: string; message: string }> };
    expect(parsed.entries).toHaveLength(1);
    expect(parsed.entries[0]).toMatchObject({ cycle: 1, stage: 'plan', level: 'INFO' });
  });

  it('filters by --cycle', async () => {
    await writeFile(
      join(logDir, 'test.log'),
      '2026-01-01T00:00:00Z [cycle=1 stage=plan] INFO c1\n2026-01-01T00:00:01Z [cycle=2 stage=design] INFO c2',
      'utf-8',
    );
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };
    try {
      await logs({ json: true, cycle: 1 });
    } finally {
      console.log = origLog;
    }
    const parsed = JSON.parse(captured) as { entries: Array<{ cycle?: number }> };
    expect(parsed.entries.every((e) => e.cycle === 1)).toBe(true);
  });

  it('--tail N returns the last N entries', async () => {
    await writeFile(
      join(logDir, 'test.log'),
      ['2026-01-01T00:00:00Z INFO 1', '2026-01-01T00:00:01Z INFO 2', '2026-01-01T00:00:02Z INFO 3'].join('\n'),
      'utf-8',
    );
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };
    try {
      await logs({ json: true, tail: 2 });
    } finally {
      console.log = origLog;
    }
    const parsed = JSON.parse(captured) as { entries: Array<{ message: string }> };
    expect(parsed.entries).toHaveLength(2);
    expect(parsed.entries[0]?.message).toBe('2');
    expect(parsed.entries[1]?.message).toBe('3');
  });

  it('returns no entries when log dir is empty (exit 0)', async () => {
    const rc = await logs({});
    expect(rc).toBe(0);
  });
});
