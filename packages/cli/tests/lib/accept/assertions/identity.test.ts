import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { identityAssertions } from '../../../../src/lib/accept/assertions/identity.js';
import type { Artifact } from '../../../../src/lib/accept/types.js';

const findRule = (rule: string) =>
  identityAssertions.find((a) => a.rule === rule);
if (!findRule('A3')) throw new Error('A3 not implemented');

describe('identityAssertions', () => {
  let tmp: string;
  const artifact: Artifact = { stage: 'plan', filePath: '', id: '', rootPath: '' };

  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'id-'));
    artifact.filePath = join(tmp, 'intent.md');
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  async function runAssertions() {
    return Promise.all(
      identityAssertions.map(async (a) => ({ rule: a.rule, result: await a.run(artifact) })),
    );
  }

  it('all pass on well-formed artifact', async () => {
    writeFileSync(
      artifact.filePath,
      `---
id: plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX
schema_version: 0.5.0
cycle_id: 1
stage: plan
state: draft
created_by: human:test
created_at: 2026-09-15T10:00:00Z
---
content`,
    );
    const results = await runAssertions();
    for (const { rule, result } of results) {
      expect(result.pass, `${rule} should pass`).toBe(true);
    }
  });

  it('A1 fails when no id', async () => {
    writeFileSync(
      artifact.filePath,
      `---
schema_version: 0.5.0
---
content`,
    );
    const results = await runAssertions();
    expect(results.find((r) => r.rule === 'A1')!.result.pass).toBe(false);
  });

  it('A2 fails when id is malformed', async () => {
    writeFileSync(
      artifact.filePath,
      `---
id: bad-id
schema_version: 0.5.0
---
content`,
    );
    const results = await runAssertions();
    expect(results.find((r) => r.rule === 'A2')!.result.pass).toBe(false);
  });
});

// Helper to build a minimal valid frontmatter artifact for testing.
function writeArtifact(
  dir: string,
  fileRel: string,
  frontmatter: Record<string, string>,
  body = '',
): string {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  const filePath = join(dir, fileRel);
  writeFileSync(filePath, `---\n${fm}\n---\n${body}`, 'utf-8');
  return filePath;
}

function writeCycle(
  dir: string,
  cycles: Record<string, { stages: Record<string, { artifact: string }> }>,
  currentCycle = 1,
): void {
  const state = { version: 1, current_cycle: currentCycle, cycles };
  const stateDir = join(dir, '.loshu-sdlc/state');
  mkdirSync(stateDir, { recursive: true });
  writeFileSync(
    join(stateDir, 'cycle.json'),
    JSON.stringify(state),
    'utf-8',
  );
}

describe('A3 — id global uniqueness', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'loshu-a3-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it('passes when all ids are unique', () => {
    writeCycle(tmpDir, {
      '1': {
        stages: {
          plan: { artifact: 'intent.md' },
          design: { artifact: 'spec.md' },
        },
      },
    });
    writeArtifact(tmpDir, 'intent.md', {
      id: 'plan-c01-foo-0001-01HXYZAAAAAA',
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'plan',
      state: 'draft',
      created_at: new Date().toISOString(),
    });
    writeArtifact(tmpDir, 'spec.md', {
      id: 'design-c01-foo-0001-01HXYZBbbbbb',
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'design',
      state: 'draft',
      created_at: new Date().toISOString(),
    });
    const artifact: Artifact = {
      stage: 'plan',
      filePath: join(tmpDir, 'intent.md'),
      id: 'plan-c01-foo-0001-01HXYZAAAAAA',
      rootPath: tmpDir,
    };
    return findRule('A3')!.run(artifact).then((result) => {
      expect(result.pass).toBe(true);
    });
  });

  it('fails when two artifacts share an id', () => {
    const sharedId = 'plan-c01-foo-0001-01HXYZCCCCCC';
    writeCycle(tmpDir, {
      '1': {
        stages: {
          plan: { artifact: 'intent.md' },
          build: { artifact: 'plan.md' },
        },
      },
    });
    writeArtifact(tmpDir, 'intent.md', {
      id: sharedId,
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'plan',
      state: 'draft',
      created_at: new Date().toISOString(),
    });
    writeArtifact(tmpDir, 'plan.md', {
      id: sharedId, // duplicate
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'build',
      state: 'draft',
      created_at: new Date().toISOString(),
    });
    const artifact: Artifact = {
      stage: 'plan',
      filePath: join(tmpDir, 'intent.md'),
      id: sharedId,
      rootPath: tmpDir,
    };
    return findRule('A3')!.run(artifact).then((result) => {
      expect(result.pass).toBe(false);
      if (!result.pass) {
        expect(result.message).toContain(sharedId);
      }
    });
  });

  it('passes when only one artifact exists', () => {
    writeCycle(tmpDir, {
      '1': { stages: { plan: { artifact: 'intent.md' } } },
    });
    writeArtifact(tmpDir, 'intent.md', {
      id: 'plan-c01-foo-0001-01HXYZDDDDDD',
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'plan',
      state: 'draft',
      created_at: new Date().toISOString(),
    });
    const artifact: Artifact = {
      stage: 'plan',
      filePath: join(tmpDir, 'intent.md'),
      id: 'plan-c01-foo-0001-01HXYZDDDDDD',
      rootPath: tmpDir,
    };
    return findRule('A3')!.run(artifact).then((result) => {
      expect(result.pass).toBe(true);
    });
  });
});

describe('A7 — created_at is ISO 8601', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'loshu-a7-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it('passes when created_at is a valid ISO date', async () => {
    const p = writeArtifact(tmpDir, 'intent.md', {
      id: 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX',
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'plan',
      state: 'draft',
      created_at: '2026-09-15T10:00:00Z',
    });
    const artifact: Artifact = {
      stage: 'plan',
      filePath: p,
      id: 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX',
      rootPath: tmpDir,
    };
    const result = await findRule('A7')!.run(artifact);
    expect(result.pass).toBe(true);
  });

  it('fails when created_at is malformed', async () => {
    const p = writeArtifact(tmpDir, 'intent.md', {
      id: 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX',
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'plan',
      state: 'draft',
      created_at: 'not-a-date',
    });
    const artifact: Artifact = {
      stage: 'plan',
      filePath: p,
      id: 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX',
      rootPath: tmpDir,
    };
    const result = await findRule('A7')!.run(artifact);
    expect(result.pass).toBe(false);
    if (!result.pass) {
      expect(result.message).toContain('bad created_at');
    }
  });

  it('fails when created_at is empty', async () => {
    const p = writeArtifact(tmpDir, 'intent.md', {
      id: 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX',
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'plan',
      state: 'draft',
      created_at: '',
    });
    const artifact: Artifact = {
      stage: 'plan',
      filePath: p,
      id: 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX',
      rootPath: tmpDir,
    };
    const result = await findRule('A7')!.run(artifact);
    expect(result.pass).toBe(false);
    if (!result.pass) {
      expect(result.message).toContain('bad created_at');
    }
  });
});

describe('A8 — stage matches file context', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'loshu-a8-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it('passes when artifact.stage matches file frontmatter', async () => {
    const p = writeArtifact(tmpDir, 'intent.md', {
      id: 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX',
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'plan',
      state: 'draft',
      created_at: '2026-09-15T10:00:00Z',
    });
    const artifact: Artifact = {
      stage: 'plan',
      filePath: p,
      id: 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX',
      rootPath: tmpDir,
    };
    const result = await findRule('A8')!.run(artifact);
    expect(result.pass).toBe(true);
  });

  it('fails when artifact.stage differs from file frontmatter', async () => {
    const p = writeArtifact(tmpDir, 'spec.md', {
      id: 'design-c01-test-7f3b-01HXYZABCDEFGHJKMNPQRSTVW1',
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'design', // frontmatter says design
      state: 'draft',
      created_at: '2026-09-15T10:00:00Z',
    });
    const artifact: Artifact = {
      stage: 'plan', // but discover.ts routed as plan stage
      filePath: p,
      id: 'design-c01-test-7f3b-01HXYZABCDEFGHJKMNPQRSTVW1',
      rootPath: tmpDir,
    };
    const result = await findRule('A8')!.run(artifact);
    expect(result.pass).toBe(false);
    if (!result.pass) {
      expect(result.message).toContain('stage mismatch');
    }
  });
});
