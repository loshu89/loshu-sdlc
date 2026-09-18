# Task 3: Dedupe frontmatter reader in commands/state.ts

**Goal:** `packages/cli/src/commands/state.ts` (the CLI command, NOT the acceptance assertion module) has its own local `readFileSync + parseYaml + FRONTMATTER_RE` implementation of the frontmatter reader. v0.7.0 Task 3 deduped the three ACCEPTANCE assertion files (`identity.ts`, `accept/state.ts`, `versioning.ts`) into `lib/accept/frontmatter.ts` but explicitly noted "the CLI command `commands/state.ts` is out of scope". This task closes that deferred Minor.

**Source of truth:** v0.7.0 final whole-branch review Minor: "`packages/cli/src/commands/state.ts` has its own local `readFrontmatter`. Lines 68, 112, 123 — not part of v0.7.0 scope (Task 3 only deduped the three assertion modules: identity.ts, state.ts (accept), versioning.ts). This fourth copy is in commands/state.ts (the CLI command, not the accept assertion). The pattern matches the same shape and would have benefited from the dedup, but was explicitly out of scope."

**Files:**
- Modify: `packages/cli/src/commands/state.ts` (delete local helper, import from shared)

**Interfaces:**
- Consumes: `readFrontmatterFile(path: string): Promise<Record<string, unknown> | null>` from `lib/accept/frontmatter.js` (v0.7.0 Task 3).
- Produces: same observable behavior for the `state` CLI command — no public API change.

- [ ] **Step 1: Read the current state of `commands/state.ts` lines 1-15 (imports) and lines 65-75 (the local `readFrontmatter`)**

Verify the local helper exists and is used at lines 68, 112, 123.

- [ ] **Step 2: Delete the local frontmatter-reading code in `commands/state.ts`**

Remove:
- The `readFileSync` import (only if it's only used by the local reader)
- The `parseYaml` import (only if unused elsewhere in this file)
- The `FRONTMATTER_RE` constant (if defined locally)
- The local `readFrontmatter` function

Add the import at the top:

```ts
import { readFrontmatterFile as readFrontmatter } from '../lib/accept/frontmatter.js';
```

- [ ] **Step 3: Verify all three callsites (68, 112, 123) still work**

The shared helper has signature `Promise<Record<string, unknown> | null>`. The local reader was probably `Promise<Record<string, unknown>>` (returning `{}` on error). Verify each callsite handles the `null` case — if any callsite does `fm?.field` (optional chaining) it works; if it does `fm.field` directly it might break. Adjust callsites as needed (add `?.` or `?? {}` defensively).

- [ ] **Step 4: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean; no behavior change (existing `commands/state.ts` tests, if any, still pass).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/state.ts
git commit -m "refactor(state): use shared frontmatter helper in commands/state.ts

Completes the dedupe that v0.7.0 Task 3 started for the three
acceptance assertion files (identity.ts, accept/state.ts,
versioning.ts). The CLI command at commands/state.ts had its
own local readFileSync+parseYaml+FRONTMATTER_RE copy that was
explicitly out of scope at the time (v0.7.0 final-review
Minor). Now uses the shared readFrontmatterFile helper.

No behavior change — both helpers parse the same FRONTMATTER_RE
shape. Callsite safety: the shared helper returns null on failure
instead of {}, so any callsite that previously did fm.field directly
needs to switch to fm?.field or guard the null."
```
