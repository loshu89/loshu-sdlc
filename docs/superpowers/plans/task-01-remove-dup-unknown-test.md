# Task 1: Remove duplicate unknown-rule test

**Goal:** Delete the duplicate `check returns 2 for an unknown rule` test (lines 57-68) in `packages/cli/tests/commands/rules.test.ts`. Keep the version inside the `describe('rules check (borrowed / unknown)', ...)` block at line 328.

**Source of truth:** v0.7.0 final whole-branch review Minor #1: "Duplicate 'unknown rule → exit 2' test in rules.test.ts. Lines 57-68 ('check returns 2 for an unknown rule') and 328-337 ('exits 2 for unknown rule names') cover the exact same branch."

**Files:**
- Modify: `packages/cli/tests/commands/rules.test.ts` (lines 57-68 + surrounding imports if they become unused)

**Interfaces:**
- Consumes: existing `rules` function under test.
- Produces: no API change.

- [ ] **Step 1: Read the current state of the file at the two duplicate test locations**

Use `Read` to inspect:
- Lines 50-70 (around the duplicate at line 57)
- Lines 320-340 (around the kept test at line 328)

Verify both tests cover the same branch (calling `rules({ subcommand: 'check', name: '<unknown>' })` and asserting exit code 2).

- [ ] **Step 2: Delete lines 57-68 (the duplicate test block)**

Use `Edit` with the exact text from Step 1 as `old_string` and an empty string as `new_string`. If the surrounding `describe` block becomes empty after the deletion, also remove its opening `describe(...)` line and its closing `});` — but only if it's now empty of tests.

- [ ] **Step 3: Remove unused imports if any were only used by the deleted test**

If the deleted test was the only consumer of an import (e.g., a specific helper), remove that import. Verify by re-reading the file.

- [ ] **Step 4: Run the test file — confirm 1 fewer test and no failures**

Run: `npx pnpm@9.0.0 test -- packages/cli/tests/commands/rules.test.ts`
Expected: pass count decreases by exactly 1; all remaining tests green.

- [ ] **Step 5: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean; test count drops by 1.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/tests/commands/rules.test.ts
git commit -m "test(rules): remove duplicate unknown-rule test (covered in borrowed/unknown block)"
```
