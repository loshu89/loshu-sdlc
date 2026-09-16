# Task 5: Fill missing test coverage: A7, A8, V3, B1, B2

**Goal:** Add unit tests for assertions that exist but are untested:
- A7 (created_at is ISO 8601) — `identity.ts`
- A8 (stage matches file context) — `identity.ts`
- V3 (not deprecated) — `versioning.ts`
- B1 (bands.yaml σ thresholds monotonic) — `bands.ts` (no test file exists yet)
- B2 (bands.yaml ≥1 metric defined) — `bands.ts` (no test file exists yet)

**Independent of Tasks 2/3/4** — those add NEW assertions; this task adds tests for EXISTING assertions. Can be done in parallel with Tasks 2-4 once Task 1 lands (rootPath needed for some tests).

## Files to change

### `packages/cli/tests/lib/accept/assertions/identity.test.ts`

Read existing. Add tests for A7 and A8.

**A7 tests:**
- Positive: artifact with valid ISO 8601 created_at passes.
- Negative: artifact with malformed date (e.g., "not-a-date") fails.
- Negative: artifact with empty created_at fails.

```ts
describe('A7 — created_at is ISO 8601', () => {
  // similar mkdtemp setup
  it('passes when created_at is a valid ISO date', async () => {
    // build valid artifact, run A7, expect pass
  });
  it('fails when created_at is malformed', async () => {
    // build with created_at: 'not-a-date', expect fail with "bad created_at"
  });
});
```

**A8 tests:**
- Positive: artifact with stage matching the file's stage field passes.
- Negative: artifact with stage mismatch fails.

```ts
describe('A8 — stage matches file context', () => {
  it('passes when artifact.stage matches file frontmatter', async () => {
    // artifact.stage = 'plan', fm.stage = 'plan', pass
  });
  it('fails when artifact.stage differs from file', async () => {
    // artifact.stage = 'plan', fm.stage = 'design', fail
  });
});
```

### `packages/cli/tests/lib/accept/assertions/versioning.test.ts`

Read existing. Add V3 tests.

**V3 tests:**
- Positive: artifact with schema_version that is NOT deprecated passes.
- Negative: artifact with deprecated schema_version fails.

### `packages/cli/tests/lib/accept/assertions/bands.test.ts` (NEW FILE)

The file `bands.ts` exists but has zero tests. Create the test file with B1 and B2 coverage.

**B1 tests:**
- Positive: bands.yaml with monotonic σ thresholds (sigma_1 ≥ baseline, sigma_2 ≥ sigma_1, sigma_3 ≥ sigma_2) passes.
- Negative: non-monotonic (e.g., sigma_2 < sigma_1) fails.
- Edge: sigma_3 missing → handled gracefully (the impl uses `?? []` for metrics, but each metric should have all fields; a missing sigma_3 would NaN the comparison — check actual behavior and assert accordingly).

**B2 tests:**
- Positive: bands.yaml with ≥1 metric passes.
- Negative: bands.yaml with zero metrics fails.
- Negative: bands.yaml without `metrics:` key fails (covered by "no metrics defined" message).

The bands assertions only apply to `stage === 'maintain'` artifacts. The test fixture must use `stage: 'maintain'`.

```ts
import { describe, it, expect } from 'vitest';
import { mkdtemp, rm, writeFile } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bandsAssertions } from '../../../src/lib/accept/assertions/bands.js';
import type { Artifact } from '../../../src/lib/accept/types.js';

const findRule = (rule: string) => bandsAssertions.find((a) => a.rule === rule);

async function writeBands(
  dir: string,
  body: string,
): Promise<string> {
  const filePath = join(dir, 'bands.yaml');
  await writeFile(filePath, body, 'utf-8');
  return filePath;
}

function makeArtifact(filePath: string, rootPath: string): Artifact {
  return { stage: 'maintain', filePath, id: 'bands-c01-test-0001-01HXYZBAND', rootPath };
}

describe('B1 — bands σ thresholds monotonic', () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), 'loshu-bands-')); });
  afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }); });

  it('passes with monotonic thresholds', async () => {
    const filePath = await writeBands(tmpDir, [
      'metrics:',
      '  - name: error_rate',
      '    baseline: 0.01',
      '    sigma_1: 0.015',
      '    sigma_2: 0.02',
      '    sigma_3: 0.03',
    ].join('\n'));
    const result = await findRule('B1')!.run(makeArtifact(filePath, tmpDir));
    expect(result.pass).toBe(true);
  });

  it('fails with non-monotonic thresholds', async () => {
    const filePath = await writeBands(tmpDir, [
      'metrics:',
      '  - name: error_rate',
      '    baseline: 0.01',
      '    sigma_1: 0.02',  // higher than sigma_2
      '    sigma_2: 0.015,
      '    sigma_3: 0.03',
    ].join('\n'));
    const result = await findRule('B1')!.run(makeArtifact(filePath, tmpDir));
    expect(result.pass).toBe(false);
  });
});

describe('B2 — bands has at least one metric', () => {
  let tmpDir: string;
  beforeEach(async () => { tmpDir = await mkdtemp(join(tmpdir(), 'loshu-bands-')); });
  afterEach(async () => { await rm(tmpDir, { recursive: true, force: true }); });

  it('passes with one metric', async () => {
    const filePath = await writeBands(tmpDir, [
      'metrics:',
      '  - name: error_rate',
      '    baseline: 0.01',
      '    sigma_1: 0.015',
      '    sigma_2: 0.02',
      '    sigma_3: 0.03',
    ].join('\n'));
    const result = await findRule('B2')!.run(makeArtifact(filePath, tmpDir));
    expect(result.pass).toBe(true);
  });

  it('fails with empty metrics list', async () => {
    const filePath = await writeBands(tmpDir, 'metrics: []');
    const result = await findRule('B2')!.run(makeArtifact(filePath, tmpDir));
    expect(result.pass).toBe(false);
  });

  it('fails without metrics key', async () => {
    const filePath = await writeBands(tmpDir, 'version: 1');
    const result = await findRule('B2')!.run(makeArtifact(filePath, tmpDir));
    expect(result.pass).toBe(false);
  });
});
```

(Use the same `makeArtifact` pattern for both B1 and B2; consolidate into one file.)

## Verification

1. `pnpm test` — all tests pass. Total identity tests ≥7 (existing 3 + A3×3 + A7×2 + A8×2 = 10), versioning tests ≥5 (existing 2 + V3×2 + V4×? from Task 4 + new V3 here), bands tests ≥5 (new file).
2. `pnpm lint` clean.
3. `pnpm typecheck` clean.

## TDD discipline

Each new test should reference the rule via `findRule('X')` and the test should fail with a clear "rule not implemented" message OR pass once Task 1 (rootPath) is in place. Since A7, A8, V3, B1, B2 already exist, the tests should pass immediately once the test file exists. The discipline is "tests-first" — write the test, run it, see it pass (because the impl already exists). This documents the assertion contract.

## Commit

```
test(accept): fill missing coverage — A7, A8, V3, B1, B2

Five assertions existed but had no unit tests:

  - A7 (created_at ISO 8601): positive + malformed-date fail.
  - A8 (stage matches file context): positive + mismatch fail.
  - V3 (not deprecated): positive + deprecated-version fail.
  - B1 (σ monotonic): positive + non-monotonic fail.
  - B2 (≥1 metric): positive + empty-metrics fail + no-metrics-key fail.

Bands tests live in a new file bands.test.ts (none existed).
Identity/versioning test files extended.
```

