import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdtempSync, rmSync } from 'fs-extra';
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
    });
    expect(r.pass).toBe(false);
  });
});