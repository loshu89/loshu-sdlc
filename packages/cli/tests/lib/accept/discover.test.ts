import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { discoverArtifacts } from '../../../src/lib/accept/discover.js';

describe('discoverArtifacts', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'disc-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it('returns empty array when no cycle.json exists', async () => {
    expect(await discoverArtifacts(tmp)).toEqual([]);
  });

  it('returns artifact from cycle.json + frontmatter', async () => {
    writeFileSync(
      join(tmp, 'intent.md'),
      `---
id: plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX
schema_version: 0.5.0
cycle_id: 1
stage: plan
---
content`,
    );
    mkdirSync(join(tmp, '.loshu-sdlc/state'), { recursive: true });
    writeFileSync(
      join(tmp, '.loshu-sdlc/state/cycle.json'),
      JSON.stringify({
        schema_version: 1,
        current_cycle: 1,
        cycles: {
          '1': {
            id: 1,
            title: 'test',
            created_at: new Date().toISOString(),
            created_by: { type: 'human', id: 'x' },
            stages: {
              plan: {
                state: 'draft',
                artifact_id: 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX',
                artifact_path: 'intent.md',
                updated_at: new Date().toISOString(),
                updated_by: 'x',
              },
            },
          },
        },
      }),
    );
    const result = await discoverArtifacts(tmp);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      stage: 'plan',
      filePath: join(tmp, 'intent.md'),
      id: 'plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX',
    });
  });
});