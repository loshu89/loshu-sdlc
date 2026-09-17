# Task 3: Dedupe readFrontmatter

**Goal:** Extract the three near-identical `readFrontmatter` helpers in `identity.ts`, `state.ts`, and `versioning.ts` into a shared module `packages/cli/src/lib/accept/frontmatter.ts`.

**Spec:** v0.7.0-design §5.3 (carryover).

**Files:**
- Create: `packages/cli/src/lib/accept/frontmatter.ts`
- Modify: `packages/cli/src/lib/accept/assertions/identity.ts:9-20`, `state.ts:49-54`, `versioning.ts:12-17`
- Test: new `packages/cli/tests/lib/accept/frontmatter.test.ts`

**Interfaces:**
- Consumes: file path (absolute or relative to project root).
- Produces two variants:
  - `readFrontmatterFile(path: string): Promise<Record<string, unknown> | null>` — returns null on error.
  - `readFrontmatterFileOrEmpty(path: string): Promise<Record<string, unknown>>` — returns `{}` on error.

`identity.ts` and `versioning.ts` use the `null` variant. `state.ts` uses the empty variant.

- [ ] **Step 1: Create `lib/accept/frontmatter.ts`**

```ts
import { readFile } from 'node:fs/promises';
import { parse as parseYaml } from 'yaml';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

/**
 * Read and parse a markdown file's YAML frontmatter. Returns null on any
 * failure (file missing, unreadable, no frontmatter, parse error).
 * Used by the Layer 1/2 acceptance assertions.
 */
export async function readFrontmatterFile(
  path: string,
): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(path, 'utf-8');
    const m = FRONTMATTER_RE.exec(content);
    if (!m) return null;
    return parseYaml(m[1]!) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Same as readFrontmatterFile but returns {} on any failure instead of
 * null. Used by the Layer 2/3 assertions that want to fall through
 * to a "missing fields → fail with helpful message" rather than
 * short-circuit on a missing file.
 */
export async function readFrontmatterFileOrEmpty(
  path: string,
): Promise<Record<string, unknown>> {
  return (await readFrontmatterFile(path)) ?? {};
}
```

- [ ] **Step 2: Refactor `identity.ts` to use the shared helper**

In `packages/cli/src/lib/accept/assertions/identity.ts`:
- Delete the local `readFrontmatter` function (lines 9–20) and its `FRONTMATTER_RE` constant.
- Add import: `import { readFrontmatterFile as readFrontmatter } from '../frontmatter.js';`
  (Aliased so the local callsites don't need to change.)
- Verify the existing A1/A2/A4/A5/A6/A7/A8 assertions still use `readFrontmatter(a)` (or `readFrontmatter(a.filePath)`) and the alias covers both.

- [ ] **Step 3: Refactor `state.ts` to use the shared helper**

In `packages/cli/src/lib/accept/assertions/state.ts`:
- Delete the local `readFrontmatter` (lines ~49–54) and its `FRONTMATTER_RE` constant.
- Add import: `import { readFrontmatterFileOrEmpty as readFrontmatter } from '../frontmatter.js';`

- [ ] **Step 4: Refactor `versioning.ts` to use the shared helper**

In `packages/cli/src/lib/accept/assertions/versioning.ts`:
- Delete the local `readFrontmatter` (lines ~12–17) and its `FRONTMATTER_RE` constant.
- Add import: `import { readFrontmatterFile as readFrontmatter } from '../frontmatter.js';`

- [ ] **Step 5: Run full gauntlet — verify existing 201 tests still pass**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 201/201 still passing.

- [ ] **Step 6: Write a small unit test for the shared helper**

Create `packages/cli/tests/lib/accept/frontmatter.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readFrontmatterFile,
  readFrontmatterFileOrEmpty,
} from '../../../src/lib/accept/frontmatter.js';

describe('readFrontmatterFile', () => {
  let tmp: string;
  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-fm-'));
  });
  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('returns parsed frontmatter for valid markdown', async () => {
    const p = join(tmp, 'a.md');
    await writeFile(p, '---\nid: foo\nstate: draft\n---\nbody', 'utf-8');
    const fm = await readFrontmatterFile(p);
    expect(fm).toEqual({ id: 'foo', state: 'draft' });
  });

  it('returns null when no frontmatter fences', async () => {
    const p = join(tmp, 'a.md');
    await writeFile(p, 'just a body, no fences', 'utf-8');
    expect(await readFrontmatterFile(p)).toBeNull();
  });

  it('returns null when file missing', async () => {
    expect(await readFrontmatterFile(join(tmp, 'nope.md'))).toBeNull();
  });

  it('returns empty object for readFrontmatterFileOrEmpty on missing file', async () => {
    expect(await readFrontmatterFileOrEmpty(join(tmp, 'nope.md'))).toEqual({});
  });
});
```

- [ ] **Step 7: Run the new test file**

Run: `npx pnpm@9.0.0 test -- tests/lib/accept/frontmatter.test.ts`
Expected: 4 passed.

- [ ] **Step 8: Commit**

```bash
git add packages/cli/src/lib/accept/frontmatter.ts \
        packages/cli/src/lib/accept/assertions/identity.ts \
        packages/cli/src/lib/accept/assertions/state.ts \
        packages/cli/src/lib/accept/assertions/versioning.ts \
        packages/cli/tests/lib/accept/frontmatter.test.ts
git commit -m "refactor(accept): dedupe readFrontmatter into shared helper

Three near-identical readFrontmatter copies existed in
identity.ts, state.ts, and versioning.ts (each with its own
FRONTMATTER_RE constant and parseYaml call). Extracted to
lib/accept/frontmatter.ts exposing two variants:
  - readFrontmatterFile: returns null on any failure
  - readFrontmatterFileOrEmpty: returns {} on any failure

Existing call sites use the appropriate variant via an alias
import (no callsite changes needed beyond the imports).

Adds a 4-case unit test for the shared helper."
```