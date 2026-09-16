# Task 4: Restore 5 skipped tests + fix templates

**Plan:** [plan.md](plan.md) — read its Global Constraints first; they apply here.
**Debt:** D4 — `validate.test.ts` (3 tests) and `state.test.ts` (2 tests) were renamed to `.skip` and excluded in v0.6.0 because they failed. Root cause (verified): v0.6.0 made Identity fields **required** in all 6 artifact schemas (`id`, `schema_version`, `cycle_id`, `stage`, `state`, `created_by`, `created_at`), but `packages/templates/**` artifacts still use legacy frontmatter (`status: draft`, `cycle: 1`) → every schema validation of a template artifact fails. CI green is currently fake-green.

## Files

- Modify: `packages/templates/minimal/intent.md` (frontmatter)
- Modify: `packages/templates/full/intent.md`, `spec.md`, `plan.md`, `CLAUDE.md`, `REVIEW.md` (frontmatter)
- Modify: `packages/cli/src/commands/create.ts` (generate real IDs at scaffold time)
- Rename back: `packages/cli/tests/lib/validate.test.ts.skip` → `.test.ts`
- Rename back: `packages/cli/tests/commands/state.test.ts.skip` → `.test.ts`
- Modify: `packages/cli/package.json` (remove `--exclude` flags)
- Test: the two restored files

## Interfaces

- **Consumes:** `generateId({stage, cycle, slug}): string` from `../lib/identity.js` (Task 2 of v0.6.0, already merged). `ID_REGEX` for validation. Template EJS renderer (`renderFile` in `lib/render.ts`) — you will add new EJS variables.
- **Produces:** templates whose rendered artifacts pass `loshu-sdlc validate <type> <file>`; a scaffolder that emits unique real IDs per artifact; full test suite running with **zero excludes**.

## Steps

- [ ] **Step 1: Update template frontmatter to v0.6.0 schema**

For each template artifact, REPLACE the legacy frontmatter with Identity-complete frontmatter. Use EJS variables for values the scaffolder knows (`<%= intentId %>`, `<%= today %>`, `<%= projectName %>`) — Step 3 wires them.

`packages/templates/minimal/intent.md` — new frontmatter:

```markdown
---
id: <%= intentId %>
schema_version: 0.5.0
cycle_id: 1
stage: plan
state: draft
created_by: <%= createdBy %>
created_at: <%= today %>
title: <%= projectName %>
problem: "[What's broken or missing]"
proposedOutcome: "[Ideal end state]"
affectedUsersAndSystems:
  - "[Scope of impact]"
constraints:
  - "[Hard limits — security, compliance, etc.]"
openQuestions: []
---
```

(Body below `---` stays unchanged.)

`packages/templates/full/intent.md` — same frontmatter as minimal (drop legacy `status:`/`cycle:`).

`packages/templates/full/spec.md` — frontmatter:

```markdown
---
id: <%= specId %>
schema_version: 0.5.0
cycle_id: 1
stage: design
state: draft
created_by: <%= createdBy %>
created_at: <%= today %>
title: <%= projectName %>
intent: intent.md
architecture: "[System design — fill in during /sdlc-design]"
verificationCriteria:
  - "[How we'll know this works]"
---
```

Keep any other body sections the file currently has. If the current frontmatter has extra fields required by spec.schema.json (`ui`, `apiSurface`), preserve them.

`packages/templates/full/plan.md` — frontmatter:

```markdown
---
id: <%= planId %>
schema_version: 0.5.0
cycle_id: 1
stage: build
state: draft
created_by: <%= createdBy %>
created_at: <%= today %>
title: <%= projectName %>
spec: spec.md
tasks:
  - id: task-1
    title: "[First task]"
verification:
  build: "[build command]"
  test: "[test command]"
  lint: "[lint command]"
  typecheck: "[typecheck command]"
---
```

`packages/templates/full/CLAUDE.md` — frontmatter (stage `test`):

```markdown
---
id: <%= claudeId %>
schema_version: 0.5.0
cycle_id: 1
stage: test
state: draft
created_by: <%= createdBy %>
created_at: <%= today %>
title: <%= projectName %>
verification:
  build: "[build command]"
  test: "[test command]"
  lint: "[lint command]"
---
```

`packages/templates/full/REVIEW.md` — frontmatter (stage `deploy`):

```markdown
---
id: <%= reviewId %>
schema_version: 0.5.0
cycle_id: 1
stage: deploy
state: draft
created_by: <%= createdBy %>
created_at: <%= today %>
title: <%= projectName %>
bugs:
  status: pending
security:
  status: pending
compliance:
  status: pending
---
```

IMPORTANT: before writing, READ each current template file and each corresponding schema (`packages/plugin/schemas/{intent,spec,plan,claude-md,review}.schema.json`) — the schema's `required` array is the contract. Merge: keep every currently-present field the schema allows (`additionalProperties: false` means NO extra fields — drop anything not in the schema, e.g. legacy `status:`/`cycle:`/`migrated_from` if present).

`bands.yaml` (full template): check `bands.schema.json` required fields; if Identity fields are required there too, add them as plain YAML (no EJS needed except `<%= bandsId %>`; stage `maintain`).

- [ ] **Step 2: Verify templates render + validate standalone**

Quick manual render check (EJS vars substituted with valid static values):

```bash
cd "D:/workspace/3.my/SDLC"
TMP=$(mktemp -d)
node -e "
const ejs = require('ejs'); const fs = require('fs');
const vars = { projectName: 'demo', today: '2026-09-16T00:00:00Z', createdBy: 'human:demo',
  intentId: 'plan-c01-demo-0000-01J00000000000000000000000',
  specId: 'design-c01-demo-0000-01J00000000000000000000001',
  planId: 'build-c01-demo-0000-01J00000000000000000000002',
  claudeId: 'test-c01-demo-0000-01J00000000000000000000003',
  reviewId: 'deploy-c01-demo-0000-01J00000000000000000000004',
  bandsId: 'maintain-c01-demo-0000-01J00000000000000000000005' };
for (const f of ['intent.md']) {
  fs.writeFileSync('$TMP/' + f, ejs.render(fs.readFileSync('packages/templates/minimal/' + f, 'utf8'), vars));
}
"
node packages/cli/dist/bin/loshu-sdlc.js validate intent "$TMP/intent.md"
rm -rf "$TMP"
```

Expected: `✔ ... valid`. (Requires Task 3's build to have run — `pnpm --filter @loshu89/cli build` first if dist is stale.)

Note the ID fixtures above use only Crockford-Base32 chars (no I, L, O, U) and are exactly 26 chars — `01J00000000000000000000000`. Verify with `ID_REGEX` if unsure.

- [ ] **Step 3: Wire ID generation into the scaffolder**

In `packages/cli/src/commands/create.ts`, extend the EJS render vars (find where `renderVars` / `projectName` / `date` are built) with generated IDs:

```typescript
import { generateId } from '../lib/identity.js';

// inside create(), where render vars are assembled:
const slug = projectName.toLowerCase().replace(/[^a-z0-9-]+/g, '-').slice(0, 30) || 'app';
const idVars = {
  intentId: generateId({ stage: 'plan', cycle: 1, slug }),
  specId: generateId({ stage: 'design', cycle: 1, slug }),
  planId: generateId({ stage: 'build', cycle: 1, slug }),
  claudeId: generateId({ stage: 'test', cycle: 1, slug }),
  reviewId: generateId({ stage: 'deploy', cycle: 1, slug }),
  bandsId: generateId({ stage: 'maintain', cycle: 1, slug }),
  createdBy: `human:${(process.env.GITHUB_USER ?? process.env.USERNAME ?? process.env.USER ?? 'unknown')}`,
  today: new Date().toISOString(),
};
```

Merge `idVars` into the existing render-vars object used for ALL template files (currently only `intent.md` is re-rendered post-copy — extend the render loop to cover `spec.md`, `plan.md`, `CLAUDE.md`, `REVIEW.md`, `bands.yaml` in the full template; read the current create.ts render logic first and follow its pattern).

- [ ] **Step 4: Restore the skipped test files**

```bash
cd "D:/workspace/3.my/SDLC"
git mv packages/cli/tests/lib/validate.test.ts.skip packages/cli/tests/lib/validate.test.ts
git mv packages/cli/tests/commands/state.test.ts.skip packages/cli/tests/commands/state.test.ts
```

- [ ] **Step 5: Remove the excludes**

In `packages/cli/package.json`:

```json
"test": "vitest run",
```

(was `"vitest run --exclude tests/lib/validate.test.ts --exclude tests/commands/state.test.ts"`)

Also delete `packages/cli/vitest.config.ts`'s exclude entries for those two files if present (read it first; keep the `node_modules`/`dist` excludes).

- [ ] **Step 6: Run the restored tests, fix assertions against v0.6.0 behavior**

```bash
npx pnpm@9.0.0 --filter @loshu89/cli build
npx pnpm@9.0.0 --filter @loshu89/cli test -- tests/lib/validate.test.ts tests/commands/state.test.ts
```

Expected failures and their correct resolutions:

1. `validates a correct intent.md` — the fixture/template lacked Identity fields. After Steps 1-3 the template validates. If the test builds its own fixture inline, update the fixture frontmatter to include all required Identity fields (copy the minimal template's frontmatter shape).
2. `parses markdown body sections for intent.md (no frontmatter)` / `for spec.md` — v0.6.0 made Identity fields required; a no-frontmatter artifact CANNOT validate anymore. Rewrite these tests to assert the NEW contract: body-section parsing still fills `problem`/`proposedOutcome` etc., but the artifact is only valid when required Identity fields are present in frontmatter. I.e., fixture = Identity frontmatter + body sections, assert valid; and a second case: body sections only → assert INVALID with errors mentioning `id`.
3. `--validate runs schema + cross-stage checks` — the state command's messages/guards changed in v0.6.0 (DAG). Run it, read the actual output, align assertions to actual behavior ONLY where the behavior is correct per spec `docs/superpowers/specs/doc-mgmt/3-state-machine-git.md`; if behavior is wrong, fix the command, not the test.
4. `plan-exit transitions intent.md draft -> accepted` — the hook now requires Identity-complete intent.md (Task 1/2 changed emit flow too). Update the test fixture to a v0.6.0-valid intent.md (Identity fields + `state: draft`), keep the assertion that the hook exits 0 and the artifact ends `accepted`. This test spawns bash + stub CLI — preserve its existing stubbing approach; only update fixture content. If it times out, it has a 10s budget already (v0.4.2 fix); do not lower it.

- [ ] **Step 7: Full suite green with zero excludes**

```bash
npx pnpm@9.0.0 test
```

Expected: ALL test files run (no `--exclude`), 0 failures. Record the total test count in your report (was 136 with excludes; expect ~141+ after restoring 5).

- [ ] **Step 8: Integration test still passes (scaffolder changes from Step 3)**

```bash
npx pnpm@9.0.0 test -- tests/integration/scaffold.test.ts
```

Expected: PASS — and now the scaffolded artifacts should actually VALIDATE (the old test only asserted `errors` was defined; if it's cheap, strengthen it: assert `result.valid === true` for intent.md after scaffold. This is the real proof the templates + ID generation work end-to-end).

- [ ] **Step 9: Commit**

```bash
git add packages/templates/ packages/cli/src/commands/create.ts packages/cli/tests/ packages/cli/package.json packages/cli/vitest.config.ts
git commit -m "fix(test): restore 5 skipped tests; templates gain Identity fields; scaffolder generates real IDs"
```

## Known gotchas

- `additionalProperties: false` in every schema — ONE leftover legacy field (`status:`, `cycle:`) fails validation. Grep each template after editing: `grep -E "^(status|cycle):" packages/templates/**/*.md` must return nothing.
- EJS `<%= var %>` on undefined vars throws — every template var you introduce must be provided by create.ts's render call, including in the `--existing` path if it renders templates (read create.ts to confirm which paths render).
- `generateId` imports `ulid` — already a dependency (v0.6.0 Task 1).
- state.test.ts is 370 lines with 18 tests; only 2 were failing. Fix ONLY the 2 failing ones; don't rewrite passing assertions.
- The stub-CLI pattern in hook tests: a fake `node_modules/.bin/loshu-sdlc` that exits 0. With Identity validation now in the hook path, an exit-0 stub still passes the hook — the fixture frontmatter is what matters.

## Report contract

Write report to the SDD workspace `task-04-report.md`; reply with only:

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- Commits created (short SHA + subject)
- One-line test summary (total count, 0 excludes, 0 failures)
- Concerns (if any)
- Report file path
