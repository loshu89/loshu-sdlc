import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'fs-extra';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { stateAssertions } from '../../../../src/lib/accept/assertions/state.js';

const findRule = (rule: string) => stateAssertions.find((a) => a.rule === rule);

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
    const r = await findRule('C1')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(false);
  });

  it('C1 passes on valid state', async () => {
    const p = join(tmp, 'intent.md');
    writeFileSync(p, '---\nstate: accepted\n---\n');
    const r = await findRule('C1')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(true);
  });

  it('C1 passes valid transition with prev_state', async () => {
    const p = join(tmp, 'intent.md');
    writeFileSync(p, '---\nstate: accepted\nprev_state: draft\n---\n');
    const r = await findRule('C1')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(true);
  });

  it('C1 fails invalid transition with prev_state', async () => {
    // draft → merged is not in the DAG (draft can only go to
    // accepted/iterating/blocked/rejected/archived, never merged).
    const p = join(tmp, 'intent.md');
    writeFileSync(p, '---\nstate: merged\nprev_state: draft\n---\n');
    const r = await findRule('C1')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(false);
  });

  it('C1 fails when prev_state is unknown', async () => {
    const p = join(tmp, 'intent.md');
    writeFileSync(p, '---\nstate: accepted\nprev_state: nonsense\n---\n');
    const r = await findRule('C1')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(false);
  });
});

// Helper to build a minimal valid frontmatter artifact for testing.
function writeArtifact(
  dir: string,
  fileRel: string,
  frontmatter: Record<string, unknown>,
  body = '',
): string {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length === 0) return `${k}: []`;
        return `${k}:\n${v.map((item) => `  - ${String(item)}`).join('\n')}`;
      }
      return `${k}: ${String(v)}`;
    })
    .join('\n');
  const filePath = join(dir, fileRel);
  writeFileSync(filePath, `---\n${fm}\n---\n${body}`, 'utf-8');
  return filePath;
}

function writeCycle(
  dir: string,
  cycles: Record<string, { stages: Record<string, { state: string; artifact?: string }> }>,
  currentCycle = 1,
): void {
  const state = {
    version: 1,
    current_cycle: currentCycle,
    cycles: Object.fromEntries(
      Object.entries(cycles).map(([k, v]) => [
        k,
        {
          id: Number(k),
          title: 'test',
          created_at: '2026-09-16T00:00:00Z',
          origin: null,
          stages: v.stages,
        },
      ]),
    ),
  };
  const stateDir = join(dir, '.loshu-sdlc/state');
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(join(stateDir, 'cycle.json'), JSON.stringify(state), 'utf-8');
}

describe('C2 — schema validate', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'st-c2-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it('passes for a valid intent.md frontmatter', async () => {
    const p = writeArtifact(
      tmp,
      'intent.md',
      {
        id: 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX',
        schema_version: '0.5.0',
        cycle_id: 1,
        stage: 'plan',
        state: 'draft',
        created_by: 'human:test',
        created_at: '2026-09-16T00:00:00Z',
        title: 'Test intent',
        problem: 'Something is broken',
        proposedOutcome: 'It works',
        affectedUsersAndSystems: ['Users'],
        openQuestions: [],
      },
      '',
    );
    const r = await findRule('C2')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(true);
  });

  it('fails for an invalid intent.md frontmatter', async () => {
    const p = join(tmp, 'intent.md');
    writeFileSync(p, '---\ntitle: Bad\n---\n');
    const r = await findRule('C2')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(false);
  });
});

describe('C3 — cross-stage guard (prev accepted)', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'st-c3-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it('passes for the first stage (no prev)', async () => {
    writeCycle(tmp, {
      '1': {
        stages: {
          plan: { state: 'draft', artifact: 'intent.md' },
        },
      },
    });
    const p = writeArtifact(tmp, 'intent.md', { cycle_id: 1 });
    const r = await findRule('C3')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(true);
  });

  it('passes when previous stage is accepted', async () => {
    writeCycle(tmp, {
      '1': {
        stages: {
          plan: { state: 'accepted', artifact: 'intent.md' },
          design: { state: 'draft', artifact: 'spec.md' },
        },
      },
    });
    const p = writeArtifact(tmp, 'spec.md', { cycle_id: 1 });
    const r = await findRule('C3')!.run({
      stage: 'design',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(true);
  });

  it('fails when previous stage is not accepted', async () => {
    writeCycle(tmp, {
      '1': {
        stages: {
          plan: { state: 'draft', artifact: 'intent.md' },
          design: { state: 'draft', artifact: 'spec.md' },
        },
      },
    });
    const p = writeArtifact(tmp, 'spec.md', { cycle_id: 1 });
    const r = await findRule('C3')!.run({
      stage: 'design',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(false);
  });
});

describe('C4 — parent_ids well-formed and exist', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'st-c4-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it('fails on invalid format (too short)', async () => {
    const p = writeArtifact(tmp, 'spec.md', {
      cycle_id: 1,
      parent_ids: ['short'],
    });
    const r = await findRule('C4')!.run({
      stage: 'design',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(false);
  });

  it('passes when no parent_ids', async () => {
    const p = writeArtifact(tmp, 'intent.md', { cycle_id: 1 });
    const r = await findRule('C4')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(true);
  });

  it('passes when parent_id refers to an existing artifact', async () => {
    const parentId = 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX';
    writeCycle(tmp, {
      '1': {
        stages: {
          plan: { state: 'accepted', artifact: 'intent.md' },
          design: { state: 'draft', artifact: 'spec.md' },
        },
      },
    });
    writeArtifact(tmp, 'intent.md', { id: parentId, cycle_id: 1 });
    const p = writeArtifact(tmp, 'spec.md', {
      cycle_id: 1,
      parent_ids: [parentId],
    });
    const r = await findRule('C4')!.run({
      stage: 'design',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(true);
  });

  it('fails when parent_id refers to a missing artifact', async () => {
    writeCycle(tmp, {
      '1': {
        stages: {
          plan: { state: 'draft', artifact: 'intent.md' },
        },
      },
    });
    const p = writeArtifact(tmp, 'intent.md', {
      cycle_id: 1,
      parent_ids: ['plan-c99-nonexistent-deadbeef-01HXYZNOPENOPENOPENOPEN'],
    });
    const r = await findRule('C4')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(false);
  });
});
