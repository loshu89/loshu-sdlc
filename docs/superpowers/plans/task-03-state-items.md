# Task 3: Fix commands/state.ts items (A5, A6)

**Goal:** Two items in `commands/state.ts`:
- **A5**: cycle.json read has no try/catch (asymmetric with metrics.json). Add a defensive try/catch that returns a graceful empty state.
- **A6**: `splitFrontmatterAndBody` reads file twice (once in caller, once in helper). Refactor so the helper accepts pre-parsed content.

**Spec:** Inventory A5 + A6 (`docs/internal/parked-minors-v0.6.4-to-v0.9.0.md`).

**Files:**
- Modify: `packages/cli/src/commands/state.ts`
- Test: `packages/cli/tests/commands/state.test.ts` (verify both items)

**Interfaces:**
- Consumes: existing `splitFrontmatterAndBody(content)` (or whatever its current name).
- Produces: splitFrontmatterAndBody(content) takes pre-parsed content; cycle.json read is wrapped in try/catch.

---

- [ ] **Step 1: Read current state.ts**

Read the relevant section. Find:
- The cycle.json read line.
- The `splitFrontmatterAndBody` function (or its equivalent).
- Its single caller.

- [ ] **Step 2: Wrap cycle.json read in try/catch**

Find the cycle.json read (around `state.ts:138` per the inventory note). Wrap it:

```ts
let cycle: { current_cycle: number; cycles: Record<string, { id: number; title: string }> } | null = null;
try {
  const cycleRaw = await readFile(join(args.rootPath, '.loshu-sdlc/state/cycle.json'), 'utf-8');
  cycle = JSON.parse(cycleRaw);
} catch {
  cycle = null;
}
```

Then ensure all downstream uses of `cycle` handle the null case (default to cycleId = 1, title = '(unknown)') to match the pattern already used for the `bands diagnose` Task 1's "no breached metrics" fallback.

- [ ] **Step 3: Refactor `splitFrontmatterAndBody` to accept pre-parsed content**

Current signature (approximately):
```ts
function splitFrontmatterAndBody(filePath: string): { frontmatter: ...; body: string }
```

Refactor to:
```ts
function splitFrontmatterAndBody(content: string): { frontmatter: ...; body: string }
```

The caller then reads the file once and passes the content:
```ts
const content = await readFile(filePath, 'utf-8');
const { frontmatter, body } = splitFrontmatterAndBody(content);
```

This eliminates the double read.

- [ ] **Step 4: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 234/234 (no behavior change — just a defensive refactor).

- [ ] **Step 5: Add a small test for the cycle.json missing case**

In `packages/cli/tests/commands/state.test.ts`, add a test that runs `loshu-sdlc state <some-file>` in a tmpdir with NO `.loshu-sdlc/state/cycle.json` and verifies the command doesn't crash (returns a graceful default or a clear error message).

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/state.ts \
        packages/cli/tests/commands/state.test.ts
git commit -m "refactor(state): defensive cycle.json read + drop double-read in splitFrontmatterAndBody (A5, A6)

A5: cycle.json was read without try/catch — a missing or
corrupt file crashed the CLI hard. Now wrapped in try/catch;
cycle defaults to null and downstream uses fall back to
sensible defaults (cycleId=1, title='(unknown)').

A6: splitFrontmatterAndBody used to take a filePath and read
the file itself; the caller also read the file, causing two
disk reads per invocation. Refactored to take the already-read
content (one read).

Both are internal-only changes; no behavior change for valid
inputs. Adds 1 test for missing cycle.json.

Inventory ref: docs/internal/parked-minors-v0.6.4-to-v0.9.0.md
sections A.5 + A.6."
```
