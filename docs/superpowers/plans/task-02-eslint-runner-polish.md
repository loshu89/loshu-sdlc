# Task 2: Hoist ESLINT_GLOBS + fix stderr fallback in eslint runner

**Goal:** Two Minor polish items in `packages/cli/src/commands/rules.ts`:
- **Minor #2**: Eslint runner hardcodes its glob at `rules.ts:41` (`...['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx']`) despite `appliesTo: ['packages/*/src/**/*.ts']` being declared on the rule entry (line 107). Hoist the globs to a module-scope constant referenced from both the runner and the rule's `appliesTo`.
- **Minor #3**: Eslint fail-path quirk `err.stdout ?? err.stderr ?? ''` at `rules.ts:46` uses nullish coalescing, so empty-string stdout does not fall through to stderr. Use `||` so empty stdout falls through.

**Source of truth:** v0.7.0 final whole-branch review Minors #2 and #3.

**Files:**
- Modify: `packages/cli/src/commands/rules.ts` (eslint runner function + rule entry)
- Test: extend `packages/cli/tests/commands/rules.test.ts` with a new test case for the empty-stdout fallback

**Interfaces:**
- Consumes: existing `Rule` interface.
- Produces: same `eslintRunner(targetPath: string): Promise<RuleResult>` signature.

- [ ] **Step 1: Read the current state of `commands/rules.ts` lines 27-55 (eslint runner) and lines 95-110 (rule entry)**

- [ ] **Step 2: Hoist the globs to a module-scope constant**

Insert above the `eslintRunner` definition:

```ts
// Hoisted so both the runner and the rule's appliesTo reference the
// same list. v0.7.0 final-review Minor #2 (previously the runner
// inlined the globs instead of reading from the rule entry).
const ESLINT_GLOBS = ['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'];
```

- [ ] **Step 3: Replace the inline globs in `eslintRunner` with `...ESLINT_GLOBS`**

Edit `commands/rules.ts:41`:

```ts
            ...['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],  // conservative
```

becomes

```ts
            ...ESLINT_GLOBS,
```

- [ ] **Step 4: Replace the rule entry's `appliesTo` with the same constant**

Edit `commands/rules.ts:107` (the eslint rule entry):

```ts
  {
    name: 'eslint',
    source: 'loshu-sdlc',
    description: 'Run ESLint with the project ESLint config.',
    appliesTo: ['packages/*/src/**/*.ts'],
    runner: eslintRunner,
  },
```

becomes

```ts
  {
    name: 'eslint',
    source: 'loshu-sdlc',
    description: 'Run ESLint with the project ESLint config.',
    appliesTo: ESLINT_GLOBS,
    runner: eslintRunner,
  },
```

- [ ] **Step 5: Fix the stderr fallback from `??` to `||`**

Edit `commands/rules.ts:46`:

```ts
    const lines = (err.stdout ?? err.stderr ?? '')
```

becomes

```ts
    // Use || (not ??) so empty-string stdout falls through to stderr;
    // real eslint writes lint errors to stdout, but some configs route
    // them via stderr instead — nullish coalescing would silently drop
    // stderr-only output. v0.7.0 final-review Minor #3.
    const lines = (err.stdout || err.stderr || '')
```

- [ ] **Step 6: Add a test case for the stderr-fallback behavior**

In `packages/cli/tests/commands/rules.test.ts`, inside `describe('rules check eslint', ...)`, add a third test after the existing pass/fail tests:

```ts
it('falls back to stderr when stdout is empty on eslint failure', async () => {
  // v0.7.0 final-review Minor #3 regression: empty stdout must not
  // mask stderr output (nullish coalescing would silently drop it).
  vi.mocked(execa).mockRejectedValue({
    stdout: '',
    stderr: 'src/foo.ts\n  1:5  error  no-unused-vars  bar',
    exitCode: 1,
  } as never);
  const rc = await rules({ subcommand: 'check', name: 'eslint', path: tmp });
  expect(rc).toBe(1);
  // The captured output must surface the stderr message, not the
  // generic "eslint exited with code 1" fallback.
  let captured = '';
  const origLog = console.log;
  console.log = (m: string) => { captured += m; };
  try {
    await rules({ subcommand: 'check', name: 'eslint', path: tmp, json: true });
  } finally {
    console.log = origLog;
  }
  expect(captured).toContain('no-unused-vars');
});
```

- [ ] **Step 7: Run the test file — confirm new test passes**

Run: `npx pnpm@9.0.0 test -- packages/cli/tests/commands/rules.test.ts`
Expected: pass count increases by 1; all green.

- [ ] **Step 8: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean; total tests +1.

- [ ] **Step 9: Commit**

```bash
git add packages/cli/src/commands/rules.ts \
        packages/cli/tests/commands/rules.test.ts
git commit -m "refactor(rules): hoist ESLINT_GLOBS + fix stderr fallback in eslint runner

- ESLINT_GLOBS module constant referenced from both the runner and
  the rule entry's appliesTo — eliminates the inline-globs divergence
  (v0.7.0 final-review Minor #2).
- Stderr fallback uses || (not ??) so empty-string stdout falls
  through to stderr. Some eslint configs route output via stderr; the
  old nullish-coalescing silently dropped stderr-only output
  (v0.7.0 final-review Minor #3).

Adds a regression test for the stderr-fallback behavior."
```
