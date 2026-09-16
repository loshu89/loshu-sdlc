import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, writeFileSync, rmSync } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bandsAssertions } from '../../../../src/lib/accept/assertions/bands.js';
import type { Artifact } from '../../../../src/lib/accept/types.js';

const findRule = (rule: string) => bandsAssertions.find((a) => a.rule === rule);
if (!findRule('B1')) throw new Error('B1 not implemented');
if (!findRule('B2')) throw new Error('B2 not implemented');

function writeBands(dir: string, body: string): string {
  const filePath = join(dir, 'bands.yaml');
  writeFileSync(filePath, body, 'utf-8');
  return filePath;
}

function makeArtifact(filePath: string, rootPath: string): Artifact {
  return {
    stage: 'maintain',
    filePath,
    id: 'maintain-c01-test-0001-01HXYZBANDSTESTXYZX',
    rootPath,
  };
}

describe('B1 — bands σ thresholds monotonic', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'loshu-bands-b1-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it('passes with monotonic thresholds', async () => {
    const filePath = writeBands(
      tmpDir,
      [
        'metrics:',
        '  - name: error_rate',
        '    baseline: 0.01',
        '    sigma_1: 0.015',
        '    sigma_2: 0.02',
        '    sigma_3: 0.03',
      ].join('\n'),
    );
    const result = await findRule('B1')!.run(makeArtifact(filePath, tmpDir));
    expect(result.pass).toBe(true);
  });

  it('fails with non-monotonic thresholds (sigma_2 < sigma_1)', async () => {
    const filePath = writeBands(
      tmpDir,
      [
        'metrics:',
        '  - name: error_rate',
        '    baseline: 0.01',
        '    sigma_1: 0.02', // higher than sigma_2
        '    sigma_2: 0.015',
        '    sigma_3: 0.03',
      ].join('\n'),
    );
    const result = await findRule('B1')!.run(makeArtifact(filePath, tmpDir));
    expect(result.pass).toBe(false);
    if (!result.pass) {
      expect(result.message).toContain('error_rate');
      expect(result.message).toContain('not monotonic');
    }
  });

  it('fails when sigma_1 is below baseline', async () => {
    const filePath = writeBands(
      tmpDir,
      [
        'metrics:',
        '  - name: error_rate',
        '    baseline: 0.05',
        '    sigma_1: 0.01', // below baseline
        '    sigma_2: 0.02',
        '    sigma_3: 0.03',
      ].join('\n'),
    );
    const result = await findRule('B1')!.run(makeArtifact(filePath, tmpDir));
    expect(result.pass).toBe(false);
  });
});

describe('B2 — bands has at least one metric', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'loshu-bands-b2-'));
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true });
  });

  it('passes with one metric', async () => {
    const filePath = writeBands(
      tmpDir,
      [
        'metrics:',
        '  - name: error_rate',
        '    baseline: 0.01',
        '    sigma_1: 0.015',
        '    sigma_2: 0.02',
        '    sigma_3: 0.03',
      ].join('\n'),
    );
    const result = await findRule('B2')!.run(makeArtifact(filePath, tmpDir));
    expect(result.pass).toBe(true);
  });

  it('fails with empty metrics list', async () => {
    const filePath = writeBands(tmpDir, 'metrics: []');
    const result = await findRule('B2')!.run(makeArtifact(filePath, tmpDir));
    expect(result.pass).toBe(false);
    if (!result.pass) {
      expect(result.message).toContain('no metrics defined');
    }
  });

  it('fails without metrics key', async () => {
    const filePath = writeBands(tmpDir, 'version: 1');
    const result = await findRule('B2')!.run(makeArtifact(filePath, tmpDir));
    expect(result.pass).toBe(false);
    if (!result.pass) {
      expect(result.message).toContain('no metrics defined');
    }
  });
});