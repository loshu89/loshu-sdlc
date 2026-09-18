# Task 5: Split captureConsole into logs/errors/warns arrays

**Goal:** `captureConsole()` in `packages/cli/tests/commands/git.test.ts:36-54` captures `console.log` into `logs` and `console.error` AND `console.warn` both into `errors`. Production code emits `git sync: --execute is set; …` via `console.warn`, which currently lands in `errors` — semantically wrong. Split into three separate arrays so future tests asserting "no warnings" or "no errors" don't surprise.

**Source of truth:** v0.7.0 final whole-branch review Minor: "`captureConsole` in `git.test.ts` captures `console.warn` into the `errors` array. Line 44: `console.warn = (msg: string) => errors.push(msg)`. The production code emits `git sync: --execute is set; …` via `console.warn`, so a test asserting 'no errors' would fail unexpectedly. Currently no test asserts the absence of errors, so this is fine — but if a future test does, the semantics will surprise. Task 5 reviewer parked it."

**Files:**
- Modify: `packages/cli/tests/commands/git.test.ts` (`captureConsole` signature + every callsite that destructures it)

**Interfaces:**
- Consumes: `console.log`, `console.error`, `console.warn` from Node.
- Produces: `{ logs: string[]; errors: string[]; warns: string[]; restore: () => void }`.

- [ ] **Step 1: Read the current `captureConsole` at `tests/commands/git.test.ts:36-54` and every callsite that destructures it**

Find all callsites via `grep -n "captureConsole\|errors:\|logs:" packages/cli/tests/commands/git.test.ts`. For each callsite, note which fields it destructures (likely just `errors`).

- [ ] **Step 2: Replace the `captureConsole` definition**

Edit the function so that `console.warn` lands in a new `warns` array:

```ts
function captureConsole(): { logs: string[]; errors: string[]; warns: string[]; restore: () => void } {
  const logs: string[] = [];
  const errors: string[] = [];
  const warns: string[] = [];
  const origLog = console.log;
  const origError = console.error;
  const origWarn = console.warn;
  console.log = (msg: string) => logs.push(msg);
  console.error = (msg: string) => errors.push(msg);
  console.warn = (msg: string) => warns.push(msg);
  return {
    logs,
    errors,
    warns,
    restore: () => {
      console.log = origLog;
      console.error = origError;
      console.warn = origWarn;
    },
  };
}
```

- [ ] **Step 3: Update each callsite to destructure `warns` (even if unused) for symmetry**

For every callsite of `captureConsole()`, update the destructure to include `warns`:

```ts
const { logs, errors, warns, restore } = captureConsole();
```

If any callsite currently only destructures `{ errors }` or `{ logs }`, add the missing fields. `warns` may not be used by the test body — that's fine; it's available for future assertions.

- [ ] **Step 4: Run the test file**

Run: `npx pnpm@9.0.0 test -- packages/cli/tests/commands/git.test.ts`
Expected: all tests pass; behavior unchanged (no test currently asserts warns).

- [ ] **Step 5: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean; no test count change.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/tests/commands/git.test.ts
git commit -m "test(git): split captureConsole into logs/errors/warns arrays

Production code (commands/git.ts:139) emits 'git sync: --execute
is set; …' via console.warn. The previous captureConsole captured
console.warn into the errors array, which would surprise any
future test asserting 'no errors' (v0.7.0 final-review Minor).

No test currently asserts warns — change is forward-looking only.
All existing tests continue to pass."
```
