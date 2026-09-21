# Task 4: Fix git.ts stale doc (A7)

**Goal:** Update the stale doc comment in `commitIfStaged` to reflect post-fix behavior. The comment was written when the function called execa directly; after v0.7.0 Task 4 fix round 1, the function routes through `runGit` and the surrounding loop wraps the call in try/catch.

**Spec:** Inventory A7 (`docs/internal/parked-minors-v0.6.4-to-v0.9.0.md`).

**Files:**
- Modify: `packages/cli/src/commands/git.ts`

---

- [ ] **Step 1: Read `commitIfStaged` and its surrounding comment**

Read `packages/cli/src/commands/git.ts:82-110` (or wherever `commitIfStaged` lives post-fix).

- [ ] **Step 2: Update the doc comment**

The current comment (approximately):
```
# Returns true when a commit was made, false when there was nothing to commit...
```

Update to reflect the new contract:
```
# Returns true when a commit was made, false when there was nothing to commit.
# After v0.7.0 Task 4 fix round 1, the commit call routes through runGit
# (which propagates execa failures). The caller (case 'sync') wraps
# this call in try/catch and emits 'git sync: commit failed for ...'
# + exits 1 on any failure (including the v0.9.0 maintain-exit hook's
# contract that this never throws unhandled).
```

- [ ] **Step 3: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 234/234 (no behavior change).

- [ ] **Step 4: Commit**

```bash
git add packages/cli/src/commands/git.ts
git commit -m "docs(git): update commitIfStaged doc comment for v0.7.0 fix behavior (A7)

Stale comment was written before the v0.7.0 Task 4 fix round 1
which routed the commit call through runGit (and wrapped the
caller in try/catch with 'git sync: commit failed for ...' on
failure). Doc-only; no behavior change.

Inventory ref: docs/internal/parked-minors-v0.6.4-to-v0.9.0.md
section A.7."
```
