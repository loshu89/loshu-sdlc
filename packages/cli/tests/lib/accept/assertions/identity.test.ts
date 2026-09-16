import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { identityAssertions } from '../../../../src/lib/accept/assertions/identity.js';
import type { Artifact } from '../../../../src/lib/accept/types.js';

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