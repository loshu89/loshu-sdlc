# Task 1: Add `bands diagnose` subcommand + tests

**Goal:** Add a new CLI subcommand `loshu-sdlc bands diagnose` that reads `bands.yaml` + `.sdlc/metrics.json` and emits a structured JSON proposal of the currently breached metrics. **No LLM call** — pure mechanical extraction.

**Spec:** `docs/superpowers/specs/2026-09-20-v0.9.0-design.md` §Components.3 (`loshu-sdlc bands diagnose`).

**Files:**
- Create: `packages/cli/src/commands/bands-diagnose.ts` (or add a `diagnose` sub-mode to `commands/bands.ts` — pick whichever doesn't collide with existing names; the spec says new file is fine)
- Modify: `packages/cli/src/bin/loshu-sdlc.ts` (plumb the new subcommand)
- Test: `packages/cli/tests/commands/bands-diagnose.test.ts`

**Interfaces:**

```ts
// packages/cli/src/commands/bands-diagnose.ts
export interface BandBreach {
  metric: string;
  baseline: number;
  sigma_1: number;
  sigma_2: number;
  sigma_3: number;
  current: number;
  sigmaMagnitude: number;
  evaluation: 'auto-3sigma' | 'auto-2sigma' | 'auto-1sigma';
  evaluationTimestamp: string;
}

export interface MaintainDiagnosisProposal {
  breachedMetrics: BandBreach[];
  evaluationContext: {
    cycleId: number;
    cycleTitle: string;
    previousCycleTitle?: string;
  };
  suggestedIntentId: string;
}

export interface BandsDiagnoseArgs {
  bandsPath: string;
  metricsPath?: string;     // optional: defaults to <rootPath>/.sdlc/metrics.json
  rootPath: string;         // required: for cycle.json lookup
}

export async function bandsDiagnose(args: BandsDiagnoseArgs): Promise<MaintainDiagnosisProposal>;
```

**Behavior contract:**

1. Read `bands.yaml` at `args.bandsPath` (use existing `readFrontmatterFile` from v0.7.0 Task 3; do not re-implement).
2. Read `.sdlc/metrics.json` at `args.metricsPath` (default to `<rootPath>/.sdlc/metrics.json`).
3. Read `cycle.json` at `<rootPath>/.loshu-sdlc/state/cycle.json` for the current cycle's title + id.
4. For each metric in `bands.metrics[]`, find the current observation in `.sdlc/metrics.json`:
   - The metrics.json is a flat map `{ [metricName: string]: number }` (existing convention from v0.6.4 Task 5).
   - Compute `sigmaMagnitude = (current - baseline) / (sigma_3 - baseline)` (linear interpolation; for current < baseline, magnitude is negative — clamp to 0 for breach detection).
   - Classify:
     - `|magnitude| >= 1.0` → `auto-3sigma`
     - `|magnitude| >= 0.66` → `auto-2sigma`
     - `|magnitude| >= 0.33` → `auto-1sigma`
     - otherwise → not a breach, skip
5. For each breached metric, emit a `BandBreach` entry.
6. Compute `evaluationTimestamp` from `Date.now().toISOString()`.
7. Generate `suggestedIntentId` using the existing `generateId({ stage: 'plan', cycle: cycleId + 1, slug: <metric-slug> })` helper from `lib/identity.js`.
8. Return the assembled `MaintainDiagnosisProposal`. Always succeeds unless file reads fail (return a thrown Error in that case; let the caller handle it).

---

- [ ] **Step 1: Read existing bands code to understand the convention**

From `D:/workspace/3.my/SDLC`:
- `packages/cli/src/commands/bands.ts` — the existing `bands record` and `bands evaluate` commands. Match the file structure (CLI args parsing, JSON output, error handling).
- `packages/cli/src/lib/validate.ts` — the `validateArtifact(name, path)` helper signature.
- `packages/cli/src/lib/identity.ts` — the `generateId({ stage, cycle, slug })` signature.
- `packages/cli/src/lib/accept/frontmatter.ts` (v0.7.0 Task 3) — the shared `readFrontmatterFile(path)` helper.
- `packages/plugin/schemas/bands.schema.json` — the bands.yaml schema (find the metrics array shape).

- [ ] **Step 2: Write the failing test**

Create `packages/cli/tests/commands/bands-diagnose.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, writeJson, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { bandsDiagnose } from '../../../src/commands/bands-diagnose.js';

describe('bandsDiagnose', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-bands-diag-'));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('emits one BandBreach for a 3σ metric (auto-3sigma)', async () => {
    const bandsPath = join(tmp, 'bands.yaml');
    const metricsPath = join(tmp, '.sdlc', 'metrics.json');
    const cyclePath = join(tmp, '.loshu-sdlc', 'state', 'cycle.json');

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
      version: 1,
      current_cycle: 1,
      cycles: {
        '1': { id: 1, title: 'demo cycle', created_at: '2026-01-01T00:00:00Z', origin: null, stages: {} },
      },
    });

    const proposal = await bandsDiagnose({ bandsPath, metricsPath, rootPath: tmp });
    expect(proposal.breachedMetrics).toHaveLength(1);
    expect(proposal.breachedMetrics[0]).toMatchObject({
      metric: 'error_rate',
      baseline: 0.01,
      current: 0.045,
      sigmaMagnitude: expect.closeTo(1.75, 2),  // (0.045 - 0.01) / (0.03 - 0.01) = 1.75
      evaluation: 'auto-3sigma',
    });
    expect(proposal.evaluationContext.cycleId).toBe(1);
    expect(proposal.evaluationContext.cycleTitle).toBe('demo cycle');
    expect(proposal.suggestedIntentId).toMatch(/^plan-c02-/);
  });

  it('emits empty breachedMetrics when no metric is in breach', async () => {
    const bandsPath = join(tmp, 'bands.yaml');
    const metricsPath = join(tmp, '.sdlc', 'metrics.json');
    const cyclePath = join(tmp, '.loshu-sdlc', 'state', 'cycle.json');

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
    await writeJson(metricsPath, { error_rate: 0.012 });  // below sigma_1
    await writeJson(cyclePath, {
      version: 1, current_cycle: 1,
      cycles: { '1': { id: 1, title: 'demo', created_at: '2026-01-01T00:00:00Z', origin: null, stages: {} } },
    });

    const proposal = await bandsDiagnose({ bandsPath, metricsPath, rootPath: tmp });
    expect(proposal.breachedMetrics).toEqual([]);
    expect(proposal.evaluationContext.cycleId).toBe(1);
  });

  it('throws on missing bands.yaml', async () => {
    await expect(
      bandsDiagnose({ bandsPath: join(tmp, 'nonexistent.yaml'), rootPath: tmp }),
    ).rejects.toThrow();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails (red)**

Run: `npx pnpm@9.0.0 test -- tests/commands/bands-diagnose.test.ts`
Expected: FAIL — `bandsDiagnose` import resolves to a non-existent module.

- [ ] **Step 4: Write the implementation in `commands/bands-diagnose.ts`**

```ts
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parse as parseYaml } from 'yaml';
import { readFrontmatterFile } from '../lib/accept/frontmatter.js';
import { generateId } from '../lib/identity.js';

export interface BandBreach {
  metric: string;
  baseline: number;
  sigma_1: number;
  sigma_2: number;
  sigma_3: number;
  current: number;
  sigmaMagnitude: number;
  evaluation: 'auto-3sigma' | 'auto-2sigma' | 'auto-1sigma';
  evaluationTimestamp: string;
}

export interface MaintainDiagnosisProposal {
  breachedMetrics: BandBreach[];
  evaluationContext: {
    cycleId: number;
    cycleTitle: string;
    previousCycleTitle?: string;
  };
  suggestedIntentId: string;
}

export interface BandsDiagnoseArgs {
  bandsPath: string;
  metricsPath?: string;
  rootPath: string;
}

const SIGMA_THRESHOLDS = {
  'auto-3sigma': 1.0,
  'auto-2sigma': 0.66,
  'auto-1sigma': 0.33,
} as const;

export async function bandsDiagnose(args: BandsDiagnoseArgs): Promise<MaintainDiagnosisProposal> {
  const fm = await readFrontmatterFile(args.bandsPath);
  if (!fm || !Array.isArray(fm.metrics)) {
    throw new Error(`bands file at ${args.bandsPath} has no metrics array`);
  }
  const metricsPath = args.metricsPath ?? join(args.rootPath, '.sdlc', 'metrics.json');
  let observations: Record<string, number> = {};
  try {
    const raw = await readFile(metricsPath, 'utf-8');
    observations = JSON.parse(raw) as Record<string, number>;
  } catch {
    // No metrics yet — no breaches.
    observations = {};
  }

  const cycleRaw = await readFile(join(args.rootPath, '.loshu-sdlc/state/cycle.json'), 'utf-8');
  const cycle = JSON.parse(cycleRaw) as {
    current_cycle: number;
    cycles: Record<string, { id: number; title: string }>;
  };
  const currentCycle = cycle.cycles[String(cycle.current_cycle)];
  const nextCycleId = cycle.current_cycle + 1;
  const timestamp = new Date().toISOString();

  const breachedMetrics: BandBreach[] = [];
  for (const m of fm.metrics as Array<{
    name: string; baseline: number; sigma_1: number; sigma_2: number; sigma_3: number;
  }>) {
    const current = observations[m.name];
    if (current === undefined) continue;
    const span = m.sigma_3 - m.baseline;
    if (span <= 0) continue;
    const magnitude = (current - m.baseline) / span;
    const absMag = Math.abs(magnitude);
    if (absMag < SIGMA_THRESHOLDS['auto-1sigma']) continue;
    let evaluation: BandBreach['evaluation'];
    if (absMag >= SIGMA_THRESHOLDS['auto-3sigma']) evaluation = 'auto-3sigma';
    else if (absMag >= SIGMA_THRESHOLDS['auto-2sigma']) evaluation = 'auto-2sigma';
    else evaluation = 'auto-1sigma';
    breachedMetrics.push({
      metric: m.name,
      baseline: m.baseline,
      sigma_1: m.sigma_1,
      sigma_2: m.sigma_2,
      sigma_3: m.sigma_3,
      current,
      sigmaMagnitude: magnitude,
      evaluation,
      evaluationTimestamp: timestamp,
    });
  }

  const suggestedIntentId = generateId({
    stage: 'plan',
    cycle: nextCycleId,
    slug: breachedMetrics[0]?.metric ?? 'incident',
  });

  return {
    breachedMetrics,
    evaluationContext: {
      cycleId: cycle.current_cycle,
      cycleTitle: currentCycle?.title ?? '(unknown)',
    },
    suggestedIntentId,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes (green)**

Run: `npx pnpm@9.0.0 test -- tests/commands/bands-diagnose.test.ts`
Expected: 3 passed.

- [ ] **Step 6: Wire the CLI subcommand in `bin/loshu-sdlc.ts`**

Find the existing `bands` switch case in `bin/loshu-sdlc.ts` (look for `bands record` / `bands evaluate`). Add `bands diagnose` as a new subcommand. Pattern follows the existing subcommands:

```ts
case 'diagnose': {
  const bandsPath = positionals[1];
  const metricsPath = positionals[2]; // optional
  if (!bandsPath) {
    console.error('Usage: loshu-sdlc bands diagnose <bands.yaml> [metrics.json]');
    process.exit(2);
  }
  const rootPath = values.rootPath ?? process.cwd();
  const proposal = await bandsDiagnose({
    bandsPath,
    ...(metricsPath ? { metricsPath } : {}),
    rootPath,
  });
  console.log(JSON.stringify(proposal, null, 2));
  break;
}
```

Add the import at the top:
```ts
import { bandsDiagnose } from './commands/bands-diagnose.js';
```

- [ ] **Step 7: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 232/232 (229 baseline + 3 new bands-diagnose tests).

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/commands/bands-diagnose.ts \
        packages/cli/tests/commands/bands-diagnose.test.ts \
        packages/cli/src/bin/loshu-sdlc.ts
git commit -m "feat(cli): add \`bands diagnose\` subcommand - extract breach metrics as JSON

Pure mechanical extraction of breached-metric details from
bands.yaml + .sdlc/metrics.json into a structured
MaintainDiagnosisProposal. No LLM call. Returns:
  - breachedMetrics[] (each with sigmaMagnitude + classification)
  - evaluationContext (cycleId, cycleTitle)
  - suggestedIntentId (from lib/identity.ts generateId)

Classifies severity via magnitude thresholds:
  - 1.0+  -> auto-3sigma
  - 0.66+ -> auto-2sigma
  - 0.33+ -> auto-1sigma

This is the input side of the Maintain -> Plan loop closure
(v0.9.0). The maintain diagnose command (Task 2) consumes
this output to build the incident intent.md.

Adds 3 unit tests covering 3sigma breach, no-breach, and
missing-file error paths."
```
