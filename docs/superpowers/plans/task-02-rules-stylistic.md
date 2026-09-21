# Task 2: Fix rules.ts stylistic items (A2, A3)

**Goal:** Two items in `commands/rules.ts`:
- **A2**: JSON error path uses `console.log`; should be `console.error` for CI (so error JSON doesn't pollute stdout success paths).
- **A3**: Hard-coded glob in eslint runner; should read `rule.appliesTo`.

**Spec:** Inventory A2 + A3 (`docs/internal/parked-minors-v0.6.4-to-v0.9.0.md`).

**Files:**
- Modify: `packages/cli/src/commands/rules.ts`

**Interfaces:**
- Consumes: existing rules.ts dispatch logic from v0.7.0 Task 6 (lines 155-181); eslint runner from v0.7.0 Task 7 (lines 32-55).
- Produces: rules.ts with corrected error JSON output and respects `rule.appliesTo`.

---

- [ ] **Step 1: Read the JSON error branch in `rules.ts`**

Read `packages/cli/src/commands/rules.ts:155-181` (the `if (rule.runner)` block).

- [ ] **Step 2: Find the JSON error path**

The current code:
```ts
if (args.json) {
  console.log(JSON.stringify({ rule: rule.name, status: 'error', error: msg }));
}
```

Change to:
```ts
if (args.json) {
  console.error(JSON.stringify({ rule: rule.name, status: 'error', error: msg }));
}
```

- [ ] **Step 3: Read the eslint runner's glob hard-coding**

Read `packages/cli/src/commands/rules.ts:36-43` (the `execa(...)` call inside `eslintRunner`).

- [ ] **Step 4: Pass `appliesTo` into the runner**

Currently the eslint runner takes `(targetPath: string)` and uses hard-coded globs. Refactor:

a) Update the `Rule` interface (from v0.7.0 Task 6, around `rules.ts:20-29`) to allow the runner to receive its own rule's data, OR
b) Simpler approach: pass the rule's `appliesTo` from the dispatch site.

Per the inventory, the simplest fix is to read `rule.appliesTo` from the dispatch site and pass it as a second argument to `eslintRunner`. Update:

```ts
// rules.ts:32 (eslintRunner signature)
const eslintRunner = async (targetPath: string, appliesTo?: string[]): Promise<RuleResult> => {
  const globs = appliesTo ?? ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'];
  // ...
  await execa('npx', [
    '--no-install', 'eslint', '--no-error-on-unmatched-pattern',
    ...globs,
  ], { cwd: targetPath });
  // ...
};
```

Then in the dispatch site (around `rules.ts:166`):
```ts
const result = await rule.runner(targetPath, rule.appliesTo);
```

(The runner's `globs` then respects `rule.appliesTo` for the eslint rule. The fallback default keeps the runner usable if invoked from somewhere else.)

- [ ] **Step 5: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 234/234 (no new tests; behavior unchanged for the existing eslint rule since its `appliesTo: ['packages/*/src/**/*.ts']` produces the same glob list).

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/rules.ts
git commit -m "refactor(rules): JSON error -> console.error; eslint globs from rule.appliesTo (A2, A3)

A2: When rules check fails (runner throws), the structured error
JSON was printed via console.log, polluting stdout and making
CI consumers mistake it for a success payload. Switched to
console.error so stdout stays clean for the success path.

A3: The eslint runner hard-coded the glob list rather than
reading rule.appliesTo. Now accepts appliesTo as a second arg
and falls back to the conservative default for direct callers.
The eslint rule's appliesTo produces the same glob list, so
behavior is unchanged; future eslint-like rules with different
appliesTo now work correctly without code changes.

Inventory ref: docs/internal/parked-minors-v0.6.4-to-v0.9.0.md
sections A.2 + A.3."
```
