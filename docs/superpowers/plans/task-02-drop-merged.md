# Task 2: Drop merged from TRANSITIONS

**Goal:** Remove the two `merged` rows from the v0.6.4 TRANSITIONS table to resolve a type-time lie (`StageState` excludes `'merged'` per `cycle.ts:48-55` but the v0.6.4 TRANSITIONS table accepted transitions to/from it).

**Spec:** v0.7.0-design §5.2 (carryover).

**Files:**
- Modify: `packages/cli/src/lib/accept/assertions/state.ts:27-36` (TRANSITIONS table).
- Test: `packages/cli/tests/lib/accept/assertions/state.test.ts` — verify the C1 DAG tests still pass with the new transitions; remove any test that asserted `accepted → merged` or `merged → archived` (none should exist, but verify).

**Interfaces:**
- Consumes: TRANSITIONS table with `merged` entries (current state from v0.6.4).
- Produces: TRANSITIONS table without `merged` as a key or value.

- [ ] **Step 1: Read current TRANSITIONS in `state.ts`**

Read `packages/cli/src/lib/accept/assertions/state.ts` lines 27–36 to confirm the v0.6.4 form:
```ts
const TRANSITIONS: Record<string, string[]> = {
  pending: ['draft', 'archived'],
  draft: ['accepted', 'iterating', 'blocked', 'rejected', 'archived'],
  iterating: ['accepted', 'blocked', 'rejected', 'archived'],
  accepted: ['iterating', 'blocked', 'rejected', 'merged', 'archived'],
  blocked: ['draft', 'archived'],
  rejected: ['draft', 'archived'],
  merged: ['archived'],
  archived: ['draft'],
};
```

- [ ] **Step 2: Edit the TRANSITIONS table — drop the `merged` key and remove `'merged'` from `accepted`'s values**

Replace with:
```ts
const TRANSITIONS: Record<string, string[]> = {
  pending: ['draft', 'archived'],
  draft: ['accepted', 'iterating', 'blocked', 'rejected', 'archived'],
  iterating: ['accepted', 'blocked', 'rejected', 'archived'],
  accepted: ['iterating', 'blocked', 'rejected', 'archived'],
  blocked: ['draft', 'archived'],
  rejected: ['draft', 'archived'],
  archived: ['draft'],
};
```

Also update the comment block (state.ts:13–26) to drop the two `merged`-related lines. New comment:
```
// Summary:
//   pending    → draft | archived
//   draft      → accepted | iterating | blocked | rejected | archived
//   iterating  → accepted | blocked | rejected | archived
//   accepted   → iterating | blocked | rejected | archived
//   blocked    → draft | archived
//   rejected   → draft | archived
//   archived   → draft               (unarchive — conservative allow)
// Note: 'merged' is intentionally absent — it's a PRRef['state'], not a
// StageState; recording 'merged' at stage level would conflict with
// cycle.ts:48-55's type. The PR-level state lives in cycleEntry.pr.state.
```

- [ ] **Step 3: Run the state test file — confirm 14 existing tests still pass**

Run: `npx pnpm@9.0.0 test -- tests/lib/accept/assertions/state.test.ts`
Expected: 14 passed, 14 total (existing C1/C2/C3/C4 tests all still pass — none of them asserted `accepted → merged` directly).

- [ ] **Step 4: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: all clean, 201/201 still passing.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/lib/accept/assertions/state.ts
git commit -m "fix(accept): drop merged from TRANSITIONS for type consistency

The v0.6.4 TRANSITIONS table (added for the C1 DAG transition check)
included 'merged' as both a key (merged → archived) and an accepted
target (accepted → merged). But cycle.ts:48-55's StageState type
excludes 'merged' on the principled ground that 'merged' is a
PRRef['state'], not a stage state.

Allowing it as a transition target in C1 is a type-time lie: any
artifact with state='merged' would pass C1 and A6 (enum) but be
type-incorrect vs cycle.json's schema.

Resolution: remove the two merged rows from TRANSITIONS. The spec
diagram's 'accepted → merged' is at the PR level — it manifests in
cycleEntry.pr.state via the platform adapter, not in stage.state.
A separate spec amendment (if needed) can add 'merged' to
StageState in v0.7.x."
```