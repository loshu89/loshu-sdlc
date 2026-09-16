# Task 2: A3 — id global uniqueness

**Goal:** Add assertion `A3` (per spec §4.3: "id globally unique") to `identity.ts`. Collects every artifact's id across the project, fails if any duplicates exist.

**Spec:** `docs/superpowers/specs/doc-mgmt/4-acceptance.md` row A3: "id globally unique | regenerate".

**Depends on:** Task 1 (Artifact.rootPath) — re-discovers via `discoverArtifacts(a.rootPath)`.

## Files to change

### `packages/cli/src/lib/accept/assertions/identity.ts`

Add `A3` assertion to the `identityAssertions` array. It re-discovers all artifacts in the project and checks for duplicate ids.

```ts
import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';
import type { Assertion, Artifact, AssertionResult } from '../types.js';
import { discoverArtifacts } from '../discover.js';
import { ID_REGEX } from '../../identity.js';

// ... existing readFrontmatter, pass, fail ...

export const identityAssertions: Assertion[] = [
  // ... existing A1, A2 ...
  {
    rule: 'A3',
    layer: 1,
    description: 'id is globally unique across the project',
    run: async (a) => {
      const all = await discoverArtifacts(a.rootPath);
      const seen = new Map<string, string[]>();
      for (const art of all) {
        const paths = seen.get(art.id) ?? [];
        paths.push(art.filePath);
        seen.set(art.id, paths);
      }
      const dupes = [...seen.entries()].filter(([, paths]) => paths.length > 1);
      if (dupes.length === 0) return pass('A3');
      const detail = dupes
        .map(([id, paths]) => `${id} (in ${paths.join(', ')})`)
        .join('; ');
      return fail(
        'A3',
        `${dupes.length} duplicate id(s) found: ${detail}`,
        'loshu-sdlc repair <file>',
      );
    },
  },
  // ... existing A4, A5, A6, A7, A8 ...
];
```

**Implementation notes:**
- Re-discovery is the cleanest way to get all artifacts (avoids cross-assertion state).
- The runner invokes each assertion once per artifact (see runner.ts), so A3 will run N times (once per artifact). The result for each invocation should be the same. This is wasteful but correct.
- An optimization (run-once semantics) is out of scope — keep parity with how other Layer 1 assertions work.
- The `seen` map deduplicates within a single call; the test should verify duplicate detection works.

### `packages/cli/tests/lib/accept/assertions/identity.test.ts`

Add tests for A3 — both positive (no duplicates) and negative (duplicates exist). Read the existing test file structure first.

**Positive test:** Create a tmpdir with `.loshu-sdlc/state/cycle.json` referencing two artifacts with different IDs. Run A3 against one of them. Assert pass.

**Negative test:** Same setup but two artifacts share an ID. Run A3 against one of them. Assert fail with the duplicate ID in the message.

Use the same mkdtemp/writeFile/readFile/rm pattern from existing tests.

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { identityAssertions } from '../../../src/lib/accept/assertions/identity.js';
import type { Artifact } from '../../../src/lib/accept/types.js';

const findRule = (rule: string) =>
  identityAssertions.find((a) => a.rule === rule);
if (!findRule('A3')) throw new Error('A3 not implemented');

// Helper to build a minimal valid frontmatter artifact for testing.
async function writeArtifact(
  dir: string,
  fileRel: string,
  frontmatter: Record<string, string>,
  body = '',
): Promise<string> {
  const fm = Object.entries(frontmatter)
    .map(([k, v]) => `${k}: ${v}`)
    .join('\n');
  const filePath = join(dir, fileRel);
  await writeFile(filePath, `---\n${fm}\n---\n${body}`, 'utf-8');
  return filePath;
}

async function writeCycle(
  dir: string,
  cycles: Record<string, { stages: Record<string, { artifact: string }> }>,
  currentCycle = 1,
): Promise<void> {
  const state = { version: 1, current_cycle: currentCycle, cycles };
  await writeFile(
    join(dir, '.loshu-sdlc/state/cycle.json'),
    JSON.stringify(state),
    'utf-8',
  );
}

describe('A3 — id global uniqueness', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'loshu-a3-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('passes when all ids are unique', async () => {
    await writeCycle(tmpDir, {
      '1': {
        stages: {
          plan: { artifact: 'intent.md' },
          design: { artifact: 'spec.md' },
        },
      },
    });
    await writeArtifact(tmpDir, 'intent.md', {
      id: 'plan-c01-foo-0001-01HXYZAAAAAA',
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'plan',
      state: 'draft',
      created_at: new Date().toISOString(),
    });
    await writeArtifact(tmpDir, 'spec.md', {
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
    const result = await findRule('A3')!.run(artifact);
    expect(result.pass).toBe(true);
  });

  it('fails when two artifacts share an id', async () => {
    const sharedId = 'plan-c01-foo-0001-01HXYZCCCCCC';
    await writeCycle(tmpDir, {
      '1': {
        stages: {
          plan: { artifact: 'intent.md' },
          build: { artifact: 'plan.md' },
        },
      },
    });
    await writeArtifact(tmpDir, 'intent.md', {
      id: sharedId,
      schema_version: '0.5.0',
      cycle_id: '1',
      stage: 'plan',
      state: 'draft',
      created_at: new Date().toISOString(),
    });
    await writeArtifact(tmpDir, 'plan.md', {
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
    const result = await findRule('A3')!.run(artifact);
    expect(result.pass).toBe(false);
    if (!result.pass) {
      expect(result.message).toContain(sharedId);
    }
  });

  it('passes when only one artifact exists', async () => {
    await writeCycle(tmpDir, {
      '1': { stages: { plan: { artifact: 'intent.md' } } },
    });
    await writeArtifact(tmpDir, 'intent.md', {
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
    const result = await findRule('A3')!.run(artifact);
    expect(result.pass).toBe(true);
  });
});
```

## Verification

1. `pnpm test` — all tests pass (existing + new A3 tests, total 172).
2. `pnpm lint` — clean.
3. `pnpm typecheck` — clean.

## TDD discipline

Write the test file FIRST (with `findRule('A3')` throwing if missing — so the test fails for the right reason). Then implement A3. Then re-run tests.

## Commit

```
feat(accept): A3 — id global uniqueness

Spec §4.3 row A3 ("id globally unique | regenerate"). The
assertion re-discovers all artifacts via a.rootPath and fails
when two or more share the same id.

Adds three unit tests: unique-ids pass, duplicate-id fails with
the duplicate id in the message, single-artifact case passes.

Depends on Task 1 (Artifact.rootPath).
```

