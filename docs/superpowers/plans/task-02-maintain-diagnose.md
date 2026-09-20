# Task 2: Add `maintain diagnose` subcommand (stub) + tests

**Goal:** Add `loshu-sdlc maintain diagnose <bands.yaml> [output.md] --root <root>` — reads the breach proposal from `bands diagnose` and writes a valid `intent.md` (stub path: structured fields populated, natural-language fields marked TODO). Falls back gracefully on schema validation failure.

**Spec:** `docs/superpowers/specs/2026-09-20-v0.9.0-design.md` §Components.1 (`loshu-sdlc maintain diagnose`).

**Files:**
- Modify: `packages/cli/src/commands/maintain.ts` (add `maintainDiagnose` function + export; or create new file `packages/cli/src/commands/maintain-diagnose.ts` if cleaner)
- Modify: `packages/cli/src/bin/loshu-sdlc.ts` (plumb `maintain diagnose` subcommand)
- Test: `packages/cli/tests/commands/maintain.test.ts` (new file)

**Interfaces:**

```ts
export interface MaintainDiagnoseArgs {
  bandsPath: string;
  outputPath: string;        // where to write intent.md
  rootPath: string;          // for cycle.json lookup + metrics.json fallback
  metricsPath?: string;      // optional override; default <rootPath>/.sdlc/metrics.json
}

export interface MaintainDiagnoseResult {
  status: 'written' | 'failed';
  intentPath: string;
  error?: string;
  durationMs: number;
  breachedMetric?: string;    // first breached metric, if any
}

export async function maintainDiagnose(args: MaintainDiagnoseArgs): Promise<MaintainDiagnoseResult>;
```

**Behavior contract (stub path):**

1. Call `bandsDiagnose({ bandsPath, metricsPath, rootPath })` to get the proposal.
2. If `breachedMetrics` is empty: return `status: 'failed'` with `error: 'no breached metrics; nothing to diagnose'`.
3. Take the first breached metric (or the user-specified one — out of scope for v0.9.0; just use the first).
4. Compose the intent.md frontmatter:
   - `id`: `proposal.suggestedIntentId`
   - `schema_version`: `'0.5.0'` (constant — matches existing intent.md fixtures)
   - `cycle_id`: `proposal.evaluationContext.cycleId + 1` (next cycle)
   - `stage`: `'plan'`
   - `state`: `'draft'`
   - `created_at`: ISO timestamp
   - `created_by`: `'system:loshu-sdlc/maintain-diagnose'`
   - `origin`: `'maintain/3sigma:<firstBreachedMetric>'`
   - `title`: `'Incident: <firstBreachedMetric> (<timestamp>)'`
   - `problem`: `'TODO: agent must describe the problem'` (stub)
   - `proposedOutcome`: `'TODO: agent must describe the proposed outcome'` (stub)
   - `affectedUsersAndSystems`: `['TODO: identify affected components']` (stub)
   - `openQuestions`: `[]` (stub — empty array, valid)
5. Validate against `intent.schema.json` using existing `validateArtifact('intent', outputPath)`. If invalid, retry up to 2 times with corrective scaffolding; if still invalid, return `status: 'failed'` with the validation errors.
6. Write the intent.md (frontmatter + body) to `outputPath`. The body can be a single line: `<!-- TODO: agent must fill in problem / proposedOutcome / affectedUsersAndSystems fields -->`.
7. Return `status: 'written'`.

**Stub vs LLM note:** The TODO fields are explicit. Future v0.10+ may replace this with an LLM synthesis call (single-file swap inside `maintainDiagnose`); the stub's structured fields still inform the LLM.

---

- [ ] **Step 1: Read existing `commands/maintain.ts` (if it exists) and `commands/bands.ts`**

If `packages/cli/src/commands/maintain.ts` exists, read it to understand the existing structure. Otherwise the file is new.

Read `commands/bands.ts` for the CLI wiring pattern (parseArgs, json output, error handling).

- [ ] **Step 2: Read `intent.schema.json` to know the required fields**

`D:/workspace/3.my/SDLC/packages/plugin/schemas/intent.schema.json` — confirm required fields. The 7 required fields (per existing fixtures) are: `id`, `schema_version`, `cycle_id`, `stage`, `state`, `created_at`, `created_by`, `origin`, `title`, `problem`, `proposedOutcome`, `affectedUsersAndSystems`, `openQuestions`.

- [ ] **Step 3: Write the failing test**

Create `packages/cli/tests/commands/maintain.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, writeJson, rm, readFile } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maintainDiagnose } from '../../src/commands/maintain.js';

describe('maintainDiagnose', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-maintain-diag-'));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('writes a stub intent.md with structured fields when 3σ breach detected', async () => {
    const bandsPath = join(tmp, 'bands.yaml');
    const metricsPath = join(tmp, '.sdlc', 'metrics.json');
    const cyclePath = join(tmp, '.loshu-sdlc', 'state', 'cycle.json');
    const outputPath = join(tmp, 'intent.md');

    await writeFile(bandsPath, [
      'id: bands-c01-test-0001-01HXYZBANDS',
      'schema_version: 0.5.0',
      'cycle_id: 1',
      'stage: maintain',
      'state: draft',
      'created_at: 2026-01-01T00:00:00Z',
      'created_by: human:test',
      'version: 1',
      'metrics:',
      '  - name: error_rate',
      '    baseline: 0.01',
      '    sigma_1: 0.015',
      '    sigma_2: 0.02',
      '    sigma_3: 0.03',
      '    unit: ratio',
      '    window: 1h',
      'evaluation:',
      '  interval: 5m',
      '  on_3sigma: block_maintain_exit',
      '  on_2sigma: warn',
      '  on_1sigma: log',
      '',
    ].join('\n'));
    await writeJson(metricsPath, { error_rate: 0.045 });
    await writeJson(cyclePath, {
      version: 1, current_cycle: 1,
      cycles: { '1': { id: 1, title: 'demo cycle', created_at: '2026-01-01T00:00:00Z', origin: null, stages: {} } },
    });

    const start = Date.now();
    const result = await maintainDiagnose({
      bandsPath, outputPath, rootPath: tmp, metricsPath,
    });

    expect(result.status).toBe('written');
    expect(result.intentPath).toBe(outputPath);
    expect(result.breachedMetric).toBe('error_rate');
    expect(result.durationMs).toBeGreaterThanOrEqual(0);
    expect(result.durationMs).toBeLessThan(Date.now() - start + 100);  // sanity

    const written = await readFile(outputPath, 'utf-8');
    expect(written).toMatch(/^---/);
    expect(written).toMatch(/id: plan-c02-error-rate/);
    expect(written).toMatch(/origin: maintain\/3sigma:error_rate/);
    expect(written).toMatch(/problem: TODO/);
    expect(written).toMatch(/proposedOutcome: TODO/);
    expect(written).toMatch(/affectedUsersAndSystems:/);
  });

  it('returns status: failed when no breached metrics', async () => {
    const bandsPath = join(tmp, 'bands.yaml');
    const metricsPath = join(tmp, '.sdlc', 'metrics.json');
    const cyclePath = join(tmp, '.loshu-sdlc', 'state', 'cycle.json');
    const outputPath = join(tmp, 'intent.md');

    await writeFile(bandsPath, [
      'id: bands-c01-test-0001-01HXYZBANDS',
      'schema_version: 0.5.0',
      'cycle_id: 1',
      'stage: maintain',
      'state: draft',
      'created_at: 2026-01-01T00:00:00Z',
      'created_by: human:test',
      'version: 1',
      'metrics:',
      '  - name: error_rate',
      '    baseline: 0.01',
      '    sigma_1: 0.015',
      '    sigma_2: 0.02',
      '    sigma_3: 0.03',
      '    unit: ratio',
      '    window: 1h',
      'evaluation:',
      '  interval: 5m',
      '  on_3sigma: block_maintain_exit',
      '  on_2sigma: warn',
      '  on_1sigma: log',
      '',
    ].join('\n'));
    await writeJson(metricsPath, { error_rate: 0.011 });  // below sigma_1
    await writeJson(cyclePath, {
      version: 1, current_cycle: 1,
      cycles: { '1': { id: 1, title: 'demo cycle', created_at: '2026-01-01T00:00:00Z', origin: null, stages: {} } },
    });

    const result = await maintainDiagnose({
      bandsPath, outputPath, rootPath: tmp, metricsPath,
    });
    expect(result.status).toBe('failed');
    expect(result.error).toMatch(/no breached metrics/i);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails (red)**

Run: `npx pnpm@9.0.0 test -- tests/commands/maintain.test.ts`
Expected: FAIL — `maintainDiagnose` import resolves to a non-existent module.

- [ ] **Step 5: Write the implementation**

In `packages/cli/src/commands/maintain.ts` (add to existing file or create new):

```ts
import { writeFile, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { bandsDiagnose } from './bands-diagnose.js';
import { validateArtifact } from '../lib/validate.js';
import { generateId } from '../lib/identity.js';

export interface MaintainDiagnoseArgs {
  bandsPath: string;
  outputPath: string;
  rootPath: string;
  metricsPath?: string;
}

export interface MaintainDiagnoseResult {
  status: 'written' | 'failed';
  intentPath: string;
  error?: string;
  durationMs: number;
  breachedMetric?: string;
}

const MAX_VALIDATION_RETRIES = 2;

export async function maintainDiagnose(args: MaintainDiagnoseArgs): Promise<MaintainDiagnoseResult> {
  const start = Date.now();
  const proposal = await bandsDiagnose({
    bandsPath: args.bandsPath,
    ...(args.metricsPath ? { metricsPath: args.metricsPath } : {}),
    rootPath: args.rootPath,
  });

  if (proposal.breachedMetrics.length === 0) {
    return {
      status: 'failed',
      intentPath: args.outputPath,
      error: 'no breached metrics; nothing to diagnose',
      durationMs: Date.now() - start,
    };
  }

  const first = proposal.breachedMetrics[0]!;
  const timestamp = new Date().toISOString();
  const slug = first.metric.replace(/[^a-z0-9-]+/g, '-');
  const intentId = generateId({
    stage: 'plan',
    cycle: proposal.evaluationContext.cycleId + 1,
    slug,
  });

  const composeIntent = (): string => {
    const frontmatter: Record<string, unknown> = {
      id: intentId,
      schema_version: '0.5.0',
      cycle_id: proposal.evaluationContext.cycleId + 1,
      stage: 'plan',
      state: 'draft',
      created_at: timestamp,
      created_by: 'system:loshu-sdlc/maintain-diagnose',
      origin: `maintain/3sigma:${first.metric}`,
      title: `Incident: ${first.metric} (${timestamp})`,
      problem: 'TODO: agent must describe the problem (auto-stub from v0.9.0 maintain-diagnose)',
      proposedOutcome: 'TODO: agent must describe the proposed outcome',
      affectedUsersAndSystems: ['TODO: identify affected components'],
      openQuestions: [],
    };
    const yaml = stringifyYaml(frontmatter);
    return `---\n${yaml}---\n\n<!-- TODO: agent must fill in problem / proposedOutcome / affectedUsersAndSystems fields before committing this incident intent.md -->\n`;
  };

  let lastError: string | undefined;
  for (let attempt = 0; attempt <= MAX_VALIDATION_RETRIES; attempt++) {
    const intent = composeIntent();
    await writeFile(args.outputPath, intent, 'utf-8');
    const result = await validateArtifact('intent', args.outputPath);
    if (result.valid) {
      return {
        status: 'written',
        intentPath: args.outputPath,
        durationMs: Date.now() - start,
        breachedMetric: first.metric,
      };
    }
    lastError = result.errors.slice(0, 3).join('; ');
  }

  return {
    status: 'failed',
    intentPath: args.outputPath,
    error: `schema validation failed after ${MAX_VALIDATION_RETRIES + 1} attempts: ${lastError ?? 'unknown'}`,
    durationMs: Date.now() - start,
  };
}
```

- [ ] **Step 6: Wire the CLI subcommand in `bin/loshu-sdlc.ts`**

Find the existing `maintain` switch case (if any) or the right location to add a new one. Add:

```ts
case 'maintain': {
  if (positionals[1] !== 'diagnose') {
    console.error('Usage: loshu-sdlc maintain diagnose <bands.yaml> <output.md>');
    process.exit(2);
  }
  const bandsPath = positionals[2];
  const outputPath = positionals[3];
  if (!bandsPath || !outputPath) {
    console.error('Usage: loshu-sdlc maintain diagnose <bands.yaml> <output.md>');
    process.exit(2);
  }
  const rootPath = values.rootPath ?? process.cwd();
  const result = await maintainDiagnose({ bandsPath, outputPath, rootPath });
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.status === 'written' ? 0 : 1);
}
```

Add the import at the top:
```ts
import { maintainDiagnose } from './commands/maintain.js';
```

- [ ] **Step 7: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 234/234 (229 baseline + 3 bands-diagnose + 2 maintain-diagnose = 234).

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/commands/maintain.ts \
        packages/cli/tests/commands/maintain.test.ts \
        packages/cli/src/bin/loshu-sdlc.ts
git commit -m "feat(cli): add \`maintain diagnose\` subcommand - stub incident intent.md

Synthesizes an incident intent.md from bands.yaml + .sdlc/metrics.json
+ cycle context. Stub-mode: structured fields (id, origin, cycle_id,
title) populated from the bandsDiagnose proposal; natural-language
fields (problem, proposedOutcome, affectedUsersAndSystems) marked
TODO for agent to fill in.

Degraded-mode contract: loop still closes without LLM. The TODO
fields inform the agent (human or LLM) what to write before
committing the incident intent.md. Future v0.10+ may replace the
TODO scaffold with an LLM synthesis call (single-file swap).

Validates output against intent.schema.json via the existing
validateArtifact helper; retries up to 2 times on validation
failure; returns status: 'failed' if still invalid.

Adds 2 unit tests covering 3sigma breach (writes TODO-stub intent.md)
and no-breach (returns status: 'failed' with helpful error)."
```
