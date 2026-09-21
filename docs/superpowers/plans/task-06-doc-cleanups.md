# Task 6: Doc cleanups — trailing newlines + captureLog dedupe (C1, C4)

**Goal:**
- **C1**: Add trailing newlines to 4 new files (missing POSIX EOF newlines).
- **C4**: Extract `captureLog` helper in `rules.test.ts` to file scope (currently duplicated across 3 describe blocks).

**Spec:** Inventory C1 + C4 (`docs/internal/parked-minors-v0.6.4-to-v0.9.0.md`).

**Files:**
- Modify: 4 new files (add `\n` at EOF)
- Modify: `packages/cli/tests/commands/rules.test.ts` (extract captureLog)

---

- [ ] **Step 1: List the 4 files needing trailing newlines**

Per inventory C1:
- `packages/cli/src/commands/bands-diagnose.ts`
- `packages/cli/src/commands/maintain.ts`
- `packages/cli/tests/commands/bands-diagnose.test.ts`
- `packages/cli/tests/commands/maintain.test.ts`

Verify with:
```bash
cd D:/workspace/3.my/SDLC
tail -c 3 packages/cli/src/commands/bands-diagnose.ts | xxd
tail -c 3 packages/cli/src/commands/maintain.ts | xxd
# Should show: ... followed by \n for files with trailing newline,
# or ... without \n for files missing it.
```

- [ ] **Step 2: Append `\n` to each file (no-op if already has trailing newline)**

For each file missing a trailing newline:
```bash
printf '\n' >> packages/cli/src/commands/bands-diagnose.ts
printf '\n' >> packages/cli/src/commands/maintain.ts
printf '\n' >> packages/cli/tests/commands/bands-diagnose.test.ts
printf '\n' >> packages/cli/tests/commands/maintain.test.ts
```

- [ ] **Step 3: Extract `captureLog` in `rules.test.ts`**

Read `packages/cli/tests/commands/rules.test.ts` and find the 3 duplicated `captureLog` definitions (per inventory C4). Extract a single helper to file scope:

```ts
// At file scope (top of the test file):
function captureLog(): { logs: string[]; errors: string[]; restore: () => void } {
  const logs: string[] = [];
  const errors: string[] = [];
  const origLog = console.log;
  const origError = console.error;
  console.log = (msg: string) => logs.push(msg);
  console.error = (msg: string) => errors.push(msg);
  return {
    logs,
    errors,
    restore: () => {
      console.log = origLog;
      console.error = origError;
    },
  };
}
```

Then delete the 3 in-place definitions and update the 3 callsites to use the file-scope helper.

- [ ] **Step 4: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 234/234 (no behavior change; only refactor + trailing newlines).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/bands-diagnose.ts \
        packages/cli/src/commands/maintain.ts \
        packages/cli/tests/commands/bands-diagnose.test.ts \
        packages/cli/tests/commands/maintain.test.ts \
        packages/cli/tests/commands/rules.test.ts
git commit -m "style: trailing newlines + captureLog dedupe in rules.test.ts (C1, C4)

C1: 4 new files (bands-diagnose.ts, maintain.ts, both test
files) were missing the trailing newline at EOF. POSIX
convention violation; trips no-trailing-newline if ever enabled.

C4: captureLog() was duplicated 3 times across describe blocks in
rules.test.ts. Extracted to file scope as a single helper.

Both are style-only; no behavior change.

Inventory ref: docs/internal/parked-minors-v0.6.4-to-v0.9.0.md
sections C.1 + C.4."
```
