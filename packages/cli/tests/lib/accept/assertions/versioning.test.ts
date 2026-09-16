import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync, mkdirSync } from 'fs-extra';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { versioningAssertions } from '../../../../src/lib/accept/assertions/versioning.js';

describe('versioningAssertions', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'ver-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it('V1 fails when schema_version missing', async () => {
    const p = join(tmp, 'intent.md');
    writeFileSync(p, '---\nid: x\n---\n');
    const r = await versioningAssertions.find((a) => a.rule === 'V1')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(false);
  });

  it('V2 fails when version not in registry', async () => {
    const p = join(tmp, 'intent.md');
    writeFileSync(p, '---\nid: x\nschema_version: 99.0.0\n---\n');
    const r = await versioningAssertions.find((a) => a.rule === 'V2')!.run({
      stage: 'plan',
      filePath: p,
      id: 'x',
      rootPath: tmp,
    });
    expect(r.pass).toBe(false);
  });
});

// Helpers (mirroring state.test.ts fixture pattern).
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

describe('V4 — cross-cycle parent schema consistency', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'ver-v4-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  const findRule = (rule: string) =>
    versioningAssertions.find((a) => a.rule === rule);

  it('passes when cross-cycle parent has current schema_version', async () => {
    const parentId = 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX';
    const childId = 'plan-c02-test-7f3b-01HXYZABCDEFGHJKMNPQRSTVW1';
    writeCycle(
      tmp,
      {
        '1': {
          stages: {
            plan: { state: 'accepted', artifact: 'parent.md' },
          },
        },
        '2': {
          stages: {
            plan: { state: 'draft', artifact: 'child.md' },
          },
        },
      },
      2,
    );
    writeArtifact(tmp, 'parent.md', {
      id: parentId,
      schema_version: '0.5.0',
      cycle_id: 1,
      stage: 'plan',
      state: 'accepted',
    });
    const p = writeArtifact(tmp, 'child.md', {
      id: childId,
      schema_version: '0.5.0',
      cycle_id: 2,
      stage: 'plan',
      state: 'draft',
      parent_ids: [parentId],
    });
    const r = await findRule('V4')!.run({
      stage: 'plan',
      filePath: p,
      id: childId,
      rootPath: tmp,
    });
    expect(r.pass).toBe(true);
  });

  it('fails when cross-cycle parent has deprecated schema_version', async () => {
    const parentId = 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX';
    const childId = 'plan-c02-test-7f3b-01HXYZABCDEFGHJKMNPQRSTVW1';
    writeCycle(
      tmp,
      {
        '1': {
          stages: {
            plan: { state: 'accepted', artifact: 'parent.md' },
          },
        },
        '2': {
          stages: {
            plan: { state: 'draft', artifact: 'child.md' },
          },
        },
      },
      2,
    );
    writeArtifact(tmp, 'parent.md', {
      id: parentId,
      schema_version: '0.1.0', // deprecated for plan stage
      cycle_id: 1,
      stage: 'plan',
      state: 'accepted',
    });
    const p = writeArtifact(tmp, 'child.md', {
      id: childId,
      schema_version: '0.5.0',
      cycle_id: 2,
      stage: 'plan',
      state: 'draft',
      parent_ids: [parentId],
    });
    const r = await findRule('V4')!.run({
      stage: 'plan',
      filePath: p,
      id: childId,
      rootPath: tmp,
    });
    expect(r.pass).toBe(false);
    expect(r.message).toContain('deprecated');
  });

  it('passes when no parent_ids', async () => {
    const childId = 'plan-c02-test-7f3b-01HXYZABCDEFGHJKMNPQRSTVW1';
    const p = writeArtifact(tmp, 'child.md', {
      id: childId,
      schema_version: '0.5.0',
      cycle_id: 2,
      stage: 'plan',
      state: 'draft',
    });
    const r = await findRule('V4')!.run({
      stage: 'plan',
      filePath: p,
      id: childId,
      rootPath: tmp,
    });
    expect(r.pass).toBe(true);
  });

  it('passes when parent is in the same cycle (skips intra-cycle)', async () => {
    const parentId = 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX';
    const childId = 'plan-c01-test-7f3b-01HXYZABCDEFGHJKMNPQRSTVW1';
    // Both parent and child are in cycle 1. Parent's file is registered in
    // cycle.json so V4 can find it. Child is processed via direct file
    // path (V4 only consults cycle.json to locate parents).
    writeCycle(tmp, {
      '1': {
        stages: {
          plan: { state: 'accepted', artifact: 'parent.md' },
        },
      },
    });
    writeArtifact(tmp, 'parent.md', {
      id: parentId,
      schema_version: '0.5.0',
      cycle_id: 1,
      stage: 'plan',
      state: 'accepted',
    });
    const p = writeArtifact(tmp, 'child.md', {
      id: childId,
      schema_version: '0.5.0',
      cycle_id: 1,
      stage: 'plan',
      state: 'draft',
      parent_ids: [parentId],
    });
    const r = await findRule('V4')!.run({
      stage: 'plan',
      filePath: p,
      id: childId,
      rootPath: tmp,
    });
    expect(r.pass).toBe(true);
  });
});