import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs-extra';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { runProject } from '../../../src/lib/accept/runner.js';

describe('runProject', () => {
  let tmp: string;
  beforeEach(() => {
    tmp = mkdtempSync(join(tmpdir(), 'run-'));
  });
  afterEach(() => {
    rmSync(tmp, { recursive: true });
  });

  it('returns empty result when no artifacts', async () => {
    const r = await runProject(tmp, {});
    expect(r.total).toBe(0);
    expect(r.passed).toBe(0);
    expect(r.failed).toBe(0);
  });

  it('reports pass for well-formed intent', async () => {
    writeFileSync(
      join(tmp, 'intent.md'),
      `---
id: plan-c01-test-7f3a-01HXYZABCDEFGHJKMNPQRSTVWX
schema_version: 0.5.0
cycle_id: 1
stage: plan
state: draft
created_by: human:test
created_at: 2026-09-15T10:00:00Z
title: Test intent
problem: Something is broken
proposedOutcome: It works
affectedUsersAndSystems:
  - Users
openQuestions: []
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
            created_at: '2026-09-15T10:00:00Z',
            created_by: { type: 'human', id: 'x' },
            stages: {
              plan: {
                state: 'draft',
                artifact: 'intent.md',
              },
            },
          },
        },
      }),
    );
    const r = await runProject(tmp, {});
    expect(r.total).toBeGreaterThan(0);
    expect(r.passed).toBeGreaterThan(0);
    expect(r.failed).toBe(0);
  });
});