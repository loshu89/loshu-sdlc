import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bandsRecord } from '../../src/commands/bands.js';

let tmp: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'loshu-bands-record-'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('bands record', () => {
  it('creates .sdlc/metrics.json with the observation', async () => {
    const code = await bandsRecord({ path: tmp, metrics: [{ name: 'error_rate', value: 0.012 }] });
    expect(code).toBe(0);
    const raw = await readFile(join(tmp, '.sdlc', 'metrics.json'), 'utf-8');
    expect(JSON.parse(raw)).toEqual({ error_rate: 0.012 });
  });

  it('merges into an existing metrics file', async () => {
    await mkdir(join(tmp, '.sdlc'), { recursive: true });
    await writeFile(join(tmp, '.sdlc', 'metrics.json'), JSON.stringify({ error_rate: 0.01 }));
    const code = await bandsRecord({ path: tmp, metrics: [{ name: 'p95_latency_ms', value: 320 }] });
    expect(code).toBe(0);
    const raw = await readFile(join(tmp, '.sdlc', 'metrics.json'), 'utf-8');
    expect(JSON.parse(raw)).toEqual({ error_rate: 0.01, p95_latency_ms: 320 });
  });

  it('overwrites the same metric name', async () => {
    await bandsRecord({ path: tmp, metrics: [{ name: 'error_rate', value: 0.01 }] });
    await bandsRecord({ path: tmp, metrics: [{ name: 'error_rate', value: 0.05 }] });
    const raw = await readFile(join(tmp, '.sdlc', 'metrics.json'), 'utf-8');
    expect(JSON.parse(raw)).toEqual({ error_rate: 0.05 });
  });

  it('returns 2 when no metrics given', async () => {
    const code = await bandsRecord({ path: tmp, metrics: [] });
    expect(code).toBe(2);
  });
});
