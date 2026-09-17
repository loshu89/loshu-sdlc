# Task 1: Stage-schema extraction + versioning fix

**Goal:** Extract `STAGE_TO_SCHEMA` (the canonical Stage→schema-name map) into its own file; have `state.ts` import from there; have `versioning.ts` V2/V3/V4 use the map (instead of the buggy direct `a.stage` lookup that throws on 4 of 6 stages).

**Spec:** v0.7.0-design §5.1 (carryover).

**Files:**
- Create: `packages/cli/src/lib/stage-schema.ts`
- Modify: `packages/cli/src/lib/accept/assertions/state.ts:13-26` (local `STAGE_TO_SCHEMA` block) and `packages/cli/src/lib/accept/assertions/versioning.ts:95,108,138` (the three `getArtifactTypeRegistry(reg, a.stage)` call sites)
- Test: extend `packages/cli/tests/lib/accept/assertions/versioning.test.ts` to cover a non-plan stage's V2/V4 lookup (today they pass coincidentally because `plan` and `build` stage names match schema names).

**Interfaces:**
- Consumes: existing `Stage` type from `lib/identity.js`.
- Produces: `STAGE_TO_SCHEMA: Record<Stage, string>` — `plan→intent, design→spec, build→plan, test→claude-md, deploy→review, maintain→bands`.

- [ ] **Step 1: Create `lib/stage-schema.ts`**

```ts
import type { Stage } from './identity.js';

/**
 * Canonical Stage → schema-name mapping. The acceptance C2 assertion and
 * the `validate *` subcommand both use this; reusing it from V2/V3/V4 in
 * `lib/accept/assertions/versioning.ts` fixes a latent bug where the
 * registry was looked up by stage name (e.g. `design`) instead of the
 * schema name (e.g. `spec`) and threw for 4 of 6 stages.
 */
export const STAGE_TO_SCHEMA: Record<Stage, string> = {
  plan: 'intent',
  design: 'spec',
  build: 'plan',
  test: 'claude-md',
  deploy: 'review',
  maintain: 'bands',
};
```

- [ ] **Step 2: Run `pnpm typecheck` — verify the new file compiles**

Run: `npx pnpm@9.0.0 typecheck`
Expected: clean (existing code doesn't import this yet, but the file is type-checked as part of the package).

- [ ] **Step 3: Update `state.ts` to import `STAGE_TO_SCHEMA` from the new module**

In `packages/cli/src/lib/accept/assertions/state.ts`, replace the local `STAGE_TO_SCHEMA` constant (currently lines ~21–28, the `const STAGE_TO_SCHEMA: Record<Stage, string> = { ... }` block) with an import:

```ts
import { STAGE_TO_SCHEMA } from '../../stage-schema.js';
```

Keep the comment that explains why this mapping exists.

- [ ] **Step 4: Update `versioning.ts` V2, V3, and V4 to use the map**

In `packages/cli/src/lib/accept/assertions/versioning.ts`:
- Add the import: `import { STAGE_TO_SCHEMA } from '../../stage-schema.js';`
- At line ~95 (V2): change `getArtifactTypeRegistry(reg, a.stage)` → `getArtifactTypeRegistry(reg, STAGE_TO_SCHEMA[a.stage])`.
- At line ~108 (V3): same change.
- At line ~138 (V4): same change.

- [ ] **Step 5: Run full gauntlet — verify existing 201 tests still pass**

Run: `npx pnpm@9.0.0 test`
Expected: 201/201 still passing. (Existing V2 test uses `plan` stage which maps to `plan` schema — same lookup. V4's two cross-cycle tests use the `plan` stage. No behavior change for existing tests.)

- [ ] **Step 6: Extend `versioning.test.ts` with a non-plan V2 test**

Add a test in `packages/cli/tests/lib/accept/assertions/versioning.test.ts`:

```ts
describe('V2 — design stage lookup (regression: a.stage vs STAGE_TO_SCHEMA)', () => {
  it('passes when design stage artifact has schema_version registered under "spec"', async () => {
    // Write a .loshu-sdlc/spec.md file with valid frontmatter; run V2; expect pass.
    // (Before the fix, this would throw because the registry key is 'spec' but
    // getArtifactTypeRegistry was called with 'design'.)
  });
});
```

Follow the existing mkdtemp/writeFile fixture pattern.

- [ ] **Step 7: Run the new test alone, confirm it fails red**

Run: `npx pnpm@9.0.0 test -- tests/lib/accept/assertions/versioning.test.ts`
Expected: the new test passes (because Step 4 fixed the bug). If you're checking that the fix works, revert Step 4 temporarily and re-run — the test should then throw. (Skip this verification step if you trust the type checker + manual code review; the existing tests don't catch the bug because they only use the `plan` stage.)

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/lib/stage-schema.ts \
        packages/cli/src/lib/accept/assertions/versioning.ts \
        packages/cli/src/lib/accept/assertions/state.ts \
        packages/cli/tests/lib/accept/assertions/versioning.test.ts
git commit -m "fix(accept): extract STAGE_TO_SCHEMA + use it for V2/V3/V4 lookup

Carries forward the canonical Stage→schema mapping out of
state.ts so versioning.ts V2/V3/V4 stop calling
getArtifactTypeRegistry(reg, a.stage). The direct-stage lookup
threw for 4 of 6 stages (only 'plan' and 'build' coincidentally
matched schema names); V2/V3/V4 silently passed when the
stage happened to be plan/build and silently threw otherwise.

Adds a regression test for V2 against a 'design' stage artifact."
```