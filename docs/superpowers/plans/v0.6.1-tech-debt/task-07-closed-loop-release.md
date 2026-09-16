# Task 7: Closed-loop E2E test + release v0.6.1

**Plan:** [plan.md](plan.md) — read its Global Constraints first; they apply here.
**Purpose:** Prove the AI-Native SDLC closed loop works end-to-end for the first time (metric → 3σ → incident cycle), lock it in with an automated test, then ship v0.6.1.

## Files

- Create: `tests/integration/closed-loop.test.ts`
- Modify: `CHANGELOG.md` (v0.6.1 entry)
- Modify: `packages/{plugin,cli,templates}/package.json` (version bump — via release script)
- Create: `.changeset/v0.6.1.md`

## Interfaces

- **Consumes:** Task 1/2's working `emit_event` (events.jsonl), Task 3's compiled migrations, Task 4's Identity-complete templates, Task 5's `bands record`, Task 6's CODEOWNERS. The hook scripts run via `bash` (Git Bash on Windows, native on CI ubuntu).
- **Produces:** the acceptance proof for v0.6.1: one automated test that runs a real hook chain and asserts the loop closes.

## Steps

- [x] **Step 1: Write the closed-loop E2E test**

```typescript
// tests/integration/closed-loop.test.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { mkdtemp, rm, writeFile, readFile, mkdir, pathExists } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { execa } from 'execa';

const REPO_ROOT = resolve(import.meta.dirname ?? '.', '../..');
const HOOKS_DIR = join(REPO_ROOT, 'packages/plugin/hooks');
const CLI_BIN = join(REPO_ROOT, 'packages/cli/dist/bin/loshu-sdlc.js');

let bashAvailable = true;
beforeAll(async () => {
  try {
    await execa('bash', ['--version']);
  } catch {
    bashAvailable = false;
  }
});

describe('closed loop (3σ incident → new cycle)', () => {
  let tmp: string;

  beforeAll(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-loop-'));
  });

  afterAll(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('maintain-exit forks an incident cycle on a 3σ metric', async (ctx) => {
    if (!bashAvailable) return ctx.skip();
    // Prerequisites: the loop only evaluates when bands.yaml validates and
    // REVIEW.md is accepted (cross-stage guard). Build the minimal world:

    // 1. Stub CLI on PATH so hooks' `npx --no-install loshu-sdlc` resolves.
    //    Real CLI behavior is needed for validate/state/cycle/bands, so instead
    //    of stubbing, symlink the built dist bin as `loshu-sdlc`:
    await mkdir(join(tmp, 'node_modules/.bin'), { recursive: true });
    // npx --no-install resolves bins from node_modules/.bin — create a shim:
    const shim = join(tmp, 'node_modules/.bin/loshu-sdlc');
    await writeFile(shim, `#!/usr/bin/env bash\nexec node "${CLI_BIN.replace(/\\/g, '/')}" "$@"\n`);
    // (chmod handled by bash execution on Windows/Git Bash; on POSIX add:)
    if (process.platform !== 'win32') {
      const { chmod } = await import('node:fs/promises');
      await chmod(shim, 0o755);
    }

    // 2. bands.yaml with a tight error_rate band (baseline 0.01, 3σ 0.03)
    //    plus Identity fields per v0.6.0 schema — generate a real ID via the CLI lib:
    const { generateId } = await import(join(REPO_ROOT, 'packages/cli/dist/lib/identity.js'));
    const bandsId = generateId({ stage: 'maintain', cycle: 1, slug: 'loop-test' });
    await writeFile(join(tmp, 'bands.yaml'), `---
id: ${bandsId}
schema_version: 0.5.0
cycle_id: 1
stage: maintain
state: draft
created_by: human:test
created_at: ${new Date().toISOString()}
version: 1
metrics:
  - name: error_rate
    baseline: 0.01
    sigma_1: 0.015
    sigma_2: 0.02
    sigma_3: 0.03
    unit: ratio
    window: 1h
evaluation:
  interval: 5m
  on_3sigma: block_maintain_exit
  on_2sigma: warn
  on_1sigma: log
---
`);
    // NOTE: if bands.schema.json does NOT accept frontmatter-style Identity
    // fields inside a YAML doc (it validates the parsed YAML object), the
    // frontmatter IS the YAML here — verify with:
    //   node packages/cli/dist/bin/loshu-sdlc.js validate bands <tmp>/bands.yaml
    // and adapt field placement until it exits 0.

    // 3. REVIEW.md accepted (cross-stage guard for maintain)
    await writeFile(join(tmp, 'REVIEW.md'), `---
id: ${generateId({ stage: 'deploy', cycle: 1, slug: 'loop-test' })}
schema_version: 0.5.0
cycle_id: 1
stage: deploy
state: accepted
created_by: human:test
created_at: ${new Date().toISOString()}
title: loop test
bugs: { status: pass }
security: { status: pass }
compliance: { status: pass }
---
`);

    // 4. Seed cycle.json so CURRENT_CYCLE=1 exists:
    await execa('node', [CLI_BIN, 'cycle', 'new', 'loop test', tmp]);

    // 5. Record a 3σ metric (Task 5's producer): 0.035 > sigma_3 0.03
    await execa('node', [CLI_BIN, 'bands', 'record', tmp, '--metric', 'error_rate', '--value', '0.035']);

    // 6. Fire maintain-exit — expect BLOCK (exit 2): 3σ incident, no
    //    incident-driven intent.md yet.
    const first = await execa('bash', [join(HOOKS_DIR, 'maintain-exit.sh'), tmp], { reject: false });
    expect(first.exitCode).toBe(2);
    expect(first.stderr).toMatch(/3σ|3sigma/i);

    // 7. Simulate /sdlc-maintain producing the incident intent.md
    await writeFile(join(tmp, 'intent.md'), `---
id: ${generateId({ stage: 'plan', cycle: 2, slug: 'incident-error-rate' })}
schema_version: 0.5.0
cycle_id: 2
stage: plan
state: draft
created_by: agent:incident-investigator
created_at: ${new Date().toISOString()}
origin: maintain/3sigma:error_rate
title: Fix error_rate 3σ incident
problem: error_rate breached 3σ
proposedOutcome: error_rate back within 1σ
affectedUsersAndSystems:
  - production users
openQuestions: []
---
`);

    // 8. Re-fire maintain-exit — with incident intent present the block lifts
    //    and the loop-closure path archives the old cycle + forks a new one.
    const second = await execa('bash', [join(HOOKS_DIR, 'maintain-exit.sh'), tmp], { reject: false });
    expect([0, 2]).toContain(second.exitCode); // 0 = closed; 2 = debounce settle (see gotchas)

    // 9. Assert the loop artifacts exist:
    //    - events.jsonl has entries (Tasks 1-2's emitter)
    const eventsExist = await pathExists(join(tmp, '.loshu-sdlc/state/events.jsonl'));
    //    - cycle.json shows the incident origin OR a new cycle was forked
    const cycleRaw = await readFile(join(tmp, '.loshu-sdlc/state/cycle.json'), 'utf-8');
    const cycle = JSON.parse(cycleRaw);
    const hasIncidentCycle = Object.values(cycle.cycles).some(
      (c: any) => typeof c.origin === 'string'
        ? c.origin.includes('3sigma')
        : c.origin?.type === 'maintain-3sigma' || JSON.stringify(c.origin ?? '').includes('3sigma'),
    );
    expect(eventsExist || hasIncidentCycle,
      `loop must leave evidence: events.jsonl=${eventsExist}, incidentCycle=${hasIncidentCycle}`).toBe(true);
  }, 30000);
});
```

ADAPT after first run: this test encodes the EXPECTED contract; exact hook behavior (debounce timing, cycle origin shape) may require assertion adjustments. The contract that must NOT be weakened: **(a)** first fire blocks with exit 2 on 3σ without incident intent; **(b)** after incident intent exists, evidence of the loop (events.jsonl entries or forked incident cycle) is present. If you must relax (a) or (b), STOP and report BLOCKED — that means the loop is broken, not the test.

- [x] **Step 2: Build, then run the test**

```bash
cd "D:/workspace/3.my/SDLC"
npx pnpm@9.0.0 --filter @loshu89/cli build
npx pnpm@9.0.0 test -- tests/integration/closed-loop.test.ts
```

Expected: PASS (≤30s). If FAIL: read hook stderr in the test output; distinguish test-fixture bugs (yours to fix) from product bugs (fix the product — that's what this task is for; the loop has literally never run end-to-end).

- [x] **Step 3: Full gauntlet**

```bash
npx pnpm@9.0.0 typecheck
npx pnpm@9.0.0 test
npx pnpm@9.0.0 build
npx pnpm@9.0.0 test:eval:strict
npx pnpm@9.0.0 lint
```

All green, zero excludes, zero skips. Record totals in the report.

- [x] **Step 4: CHANGELOG v0.6.1 entry**

Replace the `## [Unreleased]` placeholder comments in `CHANGELOG.md` with a real entry ABOVE `## [0.6.0]`:

```markdown
## [0.6.1] - <today's date>

Make v0.6.0's promises real: the event log actually logs, migrations work on Node 20, the test suite has no hidden skips, and the 3σ closed loop fires for the first time.

### Fixed

- **plan-exit hook emitted nothing** — the `emit_event` block sat after `exit 0` (unreachable). events.jsonl now receives DAG events.
- **design/build/deploy/maintain exit hooks** wired to the same event emitter; maintain-exit also emits `incident` events on 3σ forks.
- **`loshu-sdlc migrate` silently no-op'd on Node 20** — plugin migrations are now compiled to `.js` during build; loader prefers `.js`, falls back to `.ts`, and warns loudly when a transform fails to load.
- **5 skipped tests restored** (validate ×3, state ×2) — root cause was templates missing the v0.6.0 required Identity fields. Templates now carry full Identity frontmatter and the scaffolder generates real ULID-slug IDs at creation time.
- **Template copy silently dropped `.github/`** — the scaffolder's copy filter matched `.github` as `.git`. Fixed to exact basename match; scaffolded projects now receive CI workflow stubs and the PR template.

### Added

- **`loshu-sdlc bands record`** — writes metric observations to `.sdlc/metrics.json`, the sidecar maintain-exit evaluates. The 3σ closed loop now has a data producer.
- **CODEOWNERS + PR/issue templates** — full-template projects ship `.loshu-sdlc/CODEOWNERS` (artifact → reviewer routing) and `.github/PULL_REQUEST_TEMPLATE.md`; this repo gains PR + issue templates.
- **Closed-loop E2E test** (`tests/integration/closed-loop.test.ts`) — records a 3σ metric, fires maintain-exit, asserts the block and the incident-cycle evidence.
```

- [x] **Step 5: Release**

```bash
cd "D:/workspace/3.my/SDLC"
node scripts/release.mjs 0.6.1
git tag -a v0.6.1 -m "v0.6.1 — tech debt: real event log, Node 20 migrations, zero-skip tests, working 3σ closed loop"
```

Do NOT push — the controller pushes after review.

- [x] **Step 6: Verify tag + tree**

```bash
git log --oneline -3
git tag -l "v0.6*"
git status --short   # must be empty
```

## Known gotchas

- **Debounce:** maintain-exit sources debounce.sh — two hook fires within 2s make the second a no-op exit 0. The test fires twice; if the second fire is debounce-skipped, either sleep 2.1s between fires or pre-clear `<tmp>/.loshu-sdlc/state/.debounce/`. Prefer the sleep (tests the real path).
- **Hook `npx --no-install loshu-sdlc` resolution:** npx looks up `node_modules/.bin` from CWD upward. The hook runs with CWD = wherever bash was spawned, NOT `$ROOT` — check maintain-exit.sh: it passes `$ROOT` as argv but npx resolves from process CWD. If the shim isn't found, spawn the hook with `cwd: tmp` in execa. Verify during Step 2 debugging; if the product has this bug for real users, the fix is `cd "$ROOT"` at hook top — report it as a concern either way.
- `import.meta.dirname` needs Node 20.11+; fallback `fileURLToPath(import.meta.url)` if the vitest env complains.
- bands.yaml + frontmatter: the validate command parses YAML directly for `.yaml` files (no frontmatter stripping) — the Identity fields must be TOP-LEVEL YAML keys merged with `version:`/`metrics:`. Step 1's fixture does this; if `validate bands` rejects unknown keys (`additionalProperties: false`), check whether bands.schema.json got the Identity properties in v0.6.0 Task 4 — it should have. If it didn't, that's a product bug: add the properties to the schema in this task and note it in the report.
- release.mjs runs the gauntlet itself; if Step 3 passed, Step 5 won't newly fail. It also refuses on a dirty tree — commit the CHANGELOG first (it does `git add -A` internally, but the entry must exist before running it).

## Report contract

Write report to the SDD workspace `task-07-report.md`; reply with only:

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- Commits created (short SHA + subject) + tag
- One-line gauntlet summary (all five checks + totals)
- Concerns (if any) — especially any product bugs found by the E2E
- Report file path
