import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, readFile, rm, ensureDir } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  loadCycleState,
  saveCycleState,
  incrementCycle,
  updateStage,
  getCurrentCycleId,
  getStage,
  archiveCycle,
  emptyCycleState,
  shaForFile,
  shaIfExists,
  type CycleStateFile,
} from '../../src/lib/cycle.js';

let tmp: string;
let cyclePath: string;

beforeEach(async () => {
  tmp = await mkdtemp(join(tmpdir(), 'loshu-cycle-'));
  cyclePath = join(tmp, '.loshu-sdlc/state/cycle.json');
  await ensureDir(join(tmp, '.loshu-sdlc/state'));
});

afterEach(async () => {
  await rm(tmp, { recursive: true, force: true });
});

describe('loadCycleState', () => {
  it('returns empty default when file does not exist', async () => {
    const state = await loadCycleState(cyclePath);
    expect(state.version).toBe(1);
    expect(state.current_cycle).toBe(0);
    expect(state.cycles).toEqual({});
  });

  it('returns empty default when file is corrupted', async () => {
    await writeFile(cyclePath, '{ this is not valid json', 'utf8');
    const state = await loadCycleState(cyclePath);
    expect(state.current_cycle).toBe(0);
  });

  it('returns parsed state when file is well-formed', async () => {
    const input: CycleStateFile = {
      version: 1,
      current_cycle: 5,
      cycles: {
        '5': {
          id: 5,
          title: 'demo',
          created_at: '2026-09-14T00:00:00Z',
          origin: null,
          stages: {
            plan: { state: 'accepted', ts: '2026-09-14T00:00:00Z', artifact: 'intent.md' },
          },
        },
      },
    };
    await writeFile(cyclePath, JSON.stringify(input), 'utf8');
    const state = await loadCycleState(cyclePath);
    expect(state.current_cycle).toBe(5);
    expect(state.cycles['5']?.title).toBe('demo');
  });
});

describe('saveCycleState', () => {
  it('writes atomically — no temp file remains after success', async () => {
    const state = emptyCycleState();
    state.current_cycle = 7;
    await saveCycleState(cyclePath, state);
    const content = await readFile(cyclePath, 'utf8');
    const parsed = JSON.parse(content) as CycleStateFile;
    expect(parsed.current_cycle).toBe(7);
    // No leftover .tmp
    const { stat } = await import('node:fs/promises');
    await expect(stat(`${cyclePath}.tmp`)).rejects.toThrow();
  });

  it('does not lose data when the rename target already exists (overwrite)', async () => {
    const first = emptyCycleState();
    first.current_cycle = 1;
    first.cycles['1'] = {
      id: 1,
      title: 'first',
      created_at: '2026-09-14T00:00:00Z',
      origin: null,
      stages: {},
    };
    await saveCycleState(cyclePath, first);

    const second = await loadCycleState(cyclePath);
    second.current_cycle = 2;
    second.cycles['2'] = {
      id: 2,
      title: 'second',
      created_at: '2026-09-14T01:00:00Z',
      origin: null,
      stages: {},
    };
    await saveCycleState(cyclePath, second);

    const after = await loadCycleState(cyclePath);
    expect(after.current_cycle).toBe(2);
    expect(after.cycles['1']?.title).toBe('first');
    expect(after.cycles['2']?.title).toBe('second');
  });

  it('creates the directory if missing', async () => {
    const deepPath = join(tmp, 'a/b/c/cycle.json');
    const state = emptyCycleState();
    state.current_cycle = 1;
    await saveCycleState(deepPath, state);
    const after = await loadCycleState(deepPath);
    expect(after.current_cycle).toBe(1);
  });
});

describe('incrementCycle', () => {
  it('bumps current_cycle to 1 from empty', async () => {
    const id = await incrementCycle(cyclePath, 'first cycle');
    expect(id).toBe(1);
    const state = await loadCycleState(cyclePath);
    expect(state.current_cycle).toBe(1);
    expect(state.cycles['1']?.title).toBe('first cycle');
    expect(state.cycles['1']?.origin).toBeNull();
    // All six stages should be initialized to pending
    for (const stage of ['plan', 'design', 'build', 'test', 'deploy', 'maintain']) {
      expect(state.cycles['1']?.stages[stage as 'plan']?.state).toBe('pending');
    }
  });

  it('serializes concurrent increments — every call gets a unique id', async () => {
    // Fire 10 concurrent increments; expect ids 1..10 with no duplicates.
    const promises: Array<Promise<number>> = [];
    for (let i = 0; i < 10; i++) {
      promises.push(incrementCycle(cyclePath, `cycle ${i}`));
    }
    const ids = await Promise.all(promises);
    const unique = new Set(ids);
    expect(unique.size).toBe(10);
    const sorted = [...ids].sort((a, b) => a - b);
    expect(sorted).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const final = await loadCycleState(cyclePath);
    expect(final.current_cycle).toBe(10);
    expect(Object.keys(final.cycles).length).toBe(10);
  });

  it('preserves previous cycles when incrementing again', async () => {
    await incrementCycle(cyclePath, 'first');
    const secondId = await incrementCycle(cyclePath, 'second', 'maintain/3sigma:error_rate');
    expect(secondId).toBe(2);
    const state = await loadCycleState(cyclePath);
    expect(state.cycles['1']?.title).toBe('first');
    expect(state.cycles['2']?.title).toBe('second');
    expect(state.cycles['2']?.origin).toBe('maintain/3sigma:error_rate');
  });
});

describe('updateStage', () => {
  it('merges stage fields without overwriting unknown ones', async () => {
    await incrementCycle(cyclePath, 'demo');
    const merged = await updateStage(cyclePath, 1, 'plan', {
      state: 'accepted',
      ts: '2026-09-14T10:00:00Z',
      sha: 'abc123',
      artifact: 'intent.md',
    });
    expect(merged.state).toBe('accepted');
    expect(merged.sha).toBe('abc123');
    expect(merged.ts).toBe('2026-09-14T10:00:00Z');
    const state = await loadCycleState(cyclePath);
    expect(state.cycles['1']?.stages.plan?.state).toBe('accepted');
  });

  it('throws when the cycle does not exist', async () => {
    await expect(
      updateStage(cyclePath, 999, 'plan', { state: 'accepted' }),
    ).rejects.toThrow(/cycle 999 not found/);
  });

  it('partial updates preserve existing fields', async () => {
    await incrementCycle(cyclePath, 'demo');
    await updateStage(cyclePath, 1, 'plan', {
      state: 'accepted',
      ts: '2026-09-14T10:00:00Z',
      sha: 'abc',
    });
    const partial = await updateStage(cyclePath, 1, 'plan', {
      state: 'iterating',
      ts: '2026-09-14T11:00:00Z',
    });
    expect(partial.state).toBe('iterating');
    expect(partial.sha).toBe('abc');
    expect(partial.ts).toBe('2026-09-14T11:00:00Z');
  });
});

describe('getCurrentCycleId / getStage', () => {
  it('returns null when no cycle exists', async () => {
    expect(await getCurrentCycleId(cyclePath)).toBeNull();
    expect(await getStage(cyclePath, 1, 'plan')).toBeNull();
  });

  it('returns current cycle id and the requested stage entry', async () => {
    await incrementCycle(cyclePath, 'demo');
    await updateStage(cyclePath, 1, 'design', { state: 'accepted' });
    expect(await getCurrentCycleId(cyclePath)).toBe(1);
    const stage = await getStage(cyclePath, 1, 'design');
    expect(stage?.state).toBe('accepted');
  });
});

describe('archiveCycle', () => {
  it('archives every non-pending stage in the current cycle', async () => {
    await incrementCycle(cyclePath, 'demo');
    await updateStage(cyclePath, 1, 'plan', { state: 'accepted' });
    await updateStage(cyclePath, 1, 'design', { state: 'accepted' });
    await updateStage(cyclePath, 1, 'build', { state: 'iterating' });
    const id = await archiveCycle(cyclePath);
    expect(id).toBe(1);
    const state = await loadCycleState(cyclePath);
    expect(state.cycles['1']?.stages.plan?.state).toBe('archived');
    expect(state.cycles['1']?.stages.design?.state).toBe('archived');
    expect(state.cycles['1']?.stages.build?.state).toBe('archived');
    // Stages that were pending stay pending (never reached).
    expect(state.cycles['1']?.stages.test?.state).toBe('pending');
  });

  it('returns null when there is no active cycle', async () => {
    expect(await archiveCycle(cyclePath)).toBeNull();
  });
});

describe('shaForFile / shaIfExists', () => {
  it('produces a stable fingerprint for identical content', async () => {
    const a = join(tmp, 'a.md');
    const b = join(tmp, 'b.md');
    await writeFile(a, 'same content', 'utf8');
    await writeFile(b, 'same content', 'utf8');
    expect(await shaForFile(a)).toBe(await shaForFile(b));
  });

  it('produces different fingerprints for different content', async () => {
    const a = join(tmp, 'a.md');
    const b = join(tmp, 'b.md');
    await writeFile(a, 'alpha', 'utf8');
    await writeFile(b, 'beta', 'utf8');
    expect(await shaForFile(a)).not.toBe(await shaForFile(b));
  });

  it('shaIfExists returns undefined for missing files', async () => {
    expect(await shaIfExists(join(tmp, 'nope.md'))).toBeUndefined();
    const f = join(tmp, 'present.md');
    await writeFile(f, 'hi', 'utf8');
    const sha = await shaIfExists(f);
    expect(typeof sha).toBe('string');
    expect((sha ?? '').length).toBe(12);
  });
});
