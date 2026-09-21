# Task 5: Add test-coverage gaps (B1, B2, B3, B4)

**Goal:** Add 4 small tests that fill the deferred coverage gaps from the inventory:
- **B1**: ERB-stripping not test-covered (intentional — sibling assertion modules also don't cover it). Add a small test that frontmatter containing `<%= foo %>` is parsed correctly by the shared helper (no auto-strip, but content is preserved through YAML).
- **B2**: `currentCliVersion()` default path not directly tested (covered transitively via `tests/bin/version.test.ts`). Add a unit test for `currentCliVersion()` itself.
- **B3**: `closed-loop.test.ts` Test 3 asserts only `rc === 0`, doesn't verify stub invocation count. Add a stub-call-counter assertion.
- **B4**: `commands/state.ts` `transitionCommand` doesn't have a test for non-loshu deps preservation. Add a test that verifies upgrade preserves non-loshu deps in package.json.

**Spec:** Inventory B1-B4 (`docs/internal/parked-minors-v0.6.4-to-v0.9.0.md`).

**Files:**
- Modify (test only): `packages/cli/tests/lib/accept/frontmatter.test.ts` (B1)
- Create (test only): `packages/cli/tests/lib/cli-version.test.ts` (B2)
- Modify: `tests/integration/closed-loop.test.ts` (B3)
- Modify: `packages/cli/tests/commands/upgrade.test.ts` (B4)

**Interfaces:**
- Consumes: existing test infrastructure.
- Produces: 4 new test cases (each may add 5-30 lines).

---

- [ ] **Step 1: Add B1 (ERB-stripping test)**

In `packages/cli/tests/lib/accept/frontmatter.test.ts`, add:

```ts
it('preserves ERB-style tags within frontmatter content (no auto-strip)', async () => {
  // Per inventory B.1: shared helper does NOT strip <%= ... %> tags.
  // The sibling assertion modules also don't strip, so this matches
  // the convention. ERB template rendering is the caller's
  // responsibility (see create.ts which EJS-renders before files
  // land on disk).
  const filePath = join(tmp, 'erb.md');
  await writeFile(filePath, [
    '---',
    'id: plan-c01-test-0001-01HXYZERB',
    'title: <%= projectName %>',  // raw ERB tag
    '---',
    'body',
  ].join('\n'));
  const fm = await readFrontmatterFile(filePath);
  expect(fm).not.toBeNull();
  expect(fm!.title).toBe('<%= projectName %>');  // preserved verbatim
});
```

- [ ] **Step 2: Add B2 (currentCliVersion unit test)**

Create `packages/cli/tests/lib/cli-version.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readJsonSync } from 'fs-extra';
import { join } from 'node:path';
import { execa } from 'execa';

// The currentCliVersion helper lives in bin/loshu-sdlc.ts but isn't
// exported. For the unit test, verify the equivalent pattern by
// spawning the compiled CLI binary.
describe('CLI version discovery (inventory B.2)', () => {
  it('matches the package.json version field', async () => {
    const cliRoot = join(import.meta.dirname ?? '.', '../..');
    const pkg = readJsonSync(join(cliRoot, 'package.json')) as { version: string };
    const cliBin = join(cliRoot, 'dist', 'bin', 'loshu-sdlc.js');
    const result = await execa('node', [cliBin, '--version']);
    expect(result.stdout.trim()).toBe(`loshu-sdlc ${pkg.version}`);
  });
});
```

(Note: This duplicates `tests/bin/version.test.ts` content but is in the right test directory for the `lib/` subtree. If duplicate-test is undesirable, skip this — the existing `tests/bin/version.test.ts` covers it adequately.)

- [ ] **Step 3: Add B3 (stub-call-counter assertion)**

In `tests/integration/closed-loop.test.ts`, find the third test (no-breach case) and add a stub-call-counter:

```ts
// Inventory B.3: add a call counter to the bands-evaluate stub
// and assert maintain diagnose is NOT called when there's no 3sigma breach.
const stubCallLog: string[] = [];
// ... in the stub setup, append to stubCallLog on each invocation ...
// in the no-breach test assertion:
expect(stubCallLog.some((c) => c.includes('maintain diagnose'))).toBe(false);
```

This requires modifying the stub to track invocations. Adjust per the stub structure.

- [ ] **Step 4: Add B4 (non-loshu deps preservation test)**

In `packages/cli/tests/commands/upgrade.test.ts`, the existing tests cover loshu dep updates. Add:

```ts
it('preserves non-loshu dependencies, devDependencies, and scripts (B.4)', async () => {
  const pkg = {
    name: 'demo-app',
    dependencies: { lodash: '^4.17.0', '@loshu89/cli': '0.6.4', '@loshu89/plugin': '0.6.4', '@loshu89/templates': '0.6.4' },
    devDependencies: { vitest: '^1.6.0' },
    scripts: { test: 'vitest run' },
  };
  await writeJson(join(tmp, 'package.json'), pkg);
  await upgrade({ path: tmp, to: '1.0.0' });
  const after = await readJson(join(tmp, 'package.json')) as typeof pkg;
  expect(after.dependencies!['lodash']).toBe('^4.17.0');  // unchanged
  expect(after.devDependencies!['vitest']).toBe('^1.6.0');  // unchanged
  expect(after.scripts!.test).toBe('vitest run');  // unchanged
  expect(after.dependencies!['@loshu89/cli']).toBe('1.0.0');  // updated
});
```

- [ ] **Step 5: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 234 → ≥238 (4 new tests added).

- [ ] **Step 6: Commit**

```bash
git add packages/cli/tests/lib/accept/frontmatter.test.ts \
        packages/cli/tests/lib/cli-version.test.ts \
        tests/integration/closed-loop.test.ts \
        packages/cli/tests/commands/upgrade.test.ts
git commit -m "test: fill parked-Minor coverage gaps B.1, B.2, B.3, B.4

B.1: ERB-stripping test (verifies shared helper does NOT auto-strip
<%= ... %> tags, matching sibling assertion modules' convention).

B.2: currentCliVersion() unit test (verifies CLI --version output
matches package.json field). (Note: duplicates tests/bin/version.test.ts
functionally — included for visibility, not strictly necessary.)

B.3: closed-loop.test.ts Test 3 stub-call-counter (verifies the
maintain diagnose stub is NOT invoked when no 3sigma breach exists,
defensive against future regressions that remove the magnitude
guard).

B.4: upgrade.test.ts non-loshu deps preservation test (verifies
that upgrade modifies only the 3 loshu-* deps and leaves other
deps, devDependencies, and scripts untouched).

Inventory ref: docs/internal/parked-minors-v0.6.4-to-v0.9.0.md
sections B.1-B.4. 4 new tests added."
```
