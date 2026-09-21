# Task 1: Fix A6 enum 'merged' lie (A1)

**Goal:** Drop `'merged'` from `packages/cli/src/lib/accept/assertions/identity.ts:105` (the A6 enum `allowed` array). Add a regression test that A6 rejects `state: merged`.

**Spec:** Inventory A1 (`docs/internal/parked-minors-v0.6.4-to-v0.9.0.md`). Sibling of v0.7.0 Task 2 TRANSITIONS fix.

**Files:**
- Modify: `packages/cli/src/lib/accept/assertions/identity.ts` (one-line change)
- Test: `packages/cli/tests/lib/accept/assertions/identity.test.ts` (add regression test)

**Interfaces:**
- Consumes: existing A6 assertion in `identity.ts:87-92`
- Produces: updated enum, A6 now rejects `state: merged`

---

- [ ] **Step 1: Read current A6 in `identity.ts`**

Read `packages/cli/src/lib/accept/assertions/identity.ts:84-93` to see the current enum and how the test is structured.

- [ ] **Step 2: Write the failing regression test**

In `packages/cli/tests/lib/accept/assertions/identity.test.ts`, find the existing A6 describe block (or its equivalent). Add:

```ts
it('rejects state: merged (sibling fix for TRANSITIONS, v0.9.1 Minor A1)', async () => {
  // Regression for the A6 enum lie: StageState in cycle.ts:48-55 excludes 'merged'
  // (v0.7.0 Task 2 dropped it from TRANSITIONS; v0.9.1 Task 1 drops it from A6).
  await writeFile(join(tmp, 'intent.md'), '---\nstate: merged\n---\n', 'utf-8');
  const a6 = identityAssertions.find((a) => a.rule === 'A6')!;
  const result = await a6.run({
    stage: 'plan',
    filePath: join(tmp, 'intent.md'),
    id: 'plan-c01-test-0001-01HXYZA6M',
    rootPath: tmp,
  });
  expect(result.pass).toBe(false);
  if (!result.pass) expect(result.message).toContain('not in enum');
});
```

(Adjust fixture setup to match the file's existing pattern — check if other tests use a helper like `writeArtifact`.)

- [ ] **Step 3: Run the test to verify it fails (red)**

Run: `npx pnpm@9.0.0 test -- tests/lib/accept/assertions/identity.test.ts`
Expected: FAIL — the new test passes when it should fail (because A6 currently allows 'merged').

- [ ] **Step 4: Drop `'merged'` from the A6 enum**

Edit `packages/cli/src/lib/accept/assertions/identity.ts:105`:

```ts
      const allowed = ['draft', 'accepted', 'iterating', 'blocked', 'rejected', 'merged', 'archived'];
```

becomes

```ts
      const allowed = ['draft', 'accepted', 'iterating', 'blocked', 'rejected', 'archived'];
```

(Also update the test that asserts 'merged' is in the enum, if such a test exists in this file.)

- [ ] **Step 5: Run the test to verify it passes (green)**

Run: `npx pnpm@9.0.0 test -- tests/lib/accept/assertions/identity.test.ts`
Expected: All identity tests pass (the new regression test now passes; the original test that asserted 'merged' is in the enum is updated to assert it's not).

- [ ] **Step 6: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 234/234 + the new A6 test (235).

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/lib/accept/assertions/identity.ts \
        packages/cli/tests/lib/accept/assertions/identity.test.ts
git commit -m "fix(accept): drop 'merged' from A6 enum for type consistency (A1)

The v0.7.0 Task 2 fix dropped 'merged' from TRANSITIONS because
StageState (cycle.ts:48-55) excludes it — 'merged' is a
PRRef['state'], not a stage state. A6's enum at identity.ts:105
still included 'merged', contradicting the type system.

This was the only remaining type-time lie from the v0.7.0
TRANSITIONS fix. After this commit, A6 rejects state: merged
(A6 fail message is the user-visible one; C1 then also rejects
on transition validity — both layers consistent).

Inventory ref: docs/internal/parked-minors-v0.6.4-to-v0.9.0.md
section A. Adds 1 regression test (A6 rejects 'merged')."
```
