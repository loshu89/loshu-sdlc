import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'fs-extra';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stateAssertions } from '../../../../src/lib/accept/assertions/state.js';

describe('stateAssertions', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'st-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it('C1 fails on bad state', async () => {
    const p = join(tmp, 'intent.md');
    writeFileSync(p, '---\nstate: bogus\n---\n');
    const r = await stateAssertions.find((a) => a.rule === 'C1')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
    });
    expect(r.pass).toBe(false);
  });

  it('C1 passes on valid state', async () => {
    const p = join(tmp, 'intent.md');
    writeFileSync(p, '---\nstate: accepted\n---\n');
    const r = await stateAssertions.find((a) => a.rule === 'C1')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
    });
    expect(r.pass).toBe(true);
  });
});