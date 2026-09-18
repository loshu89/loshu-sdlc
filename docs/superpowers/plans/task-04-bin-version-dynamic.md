# Task 4: Read CLI version in bin/loshu-sdlc.ts --version

**Goal:** `packages/cli/src/bin/loshu-sdlc.ts:90` hardcodes `'loshu-sdlc 0.1.0'` for the `--version` flag. The CLI is now on v0.7.0 (and the package's `version` field reflects that); the hardcoded literal would lie. Extract a `currentCliVersion()` helper using the same pattern as v0.7.0 Task 11's `upgrade.ts:36-52` and use it for `--version`.

**Source of truth:** v0.7.0 final whole-branch review Minor: "`bin/loshu-sdlc.ts:90` still hardcodes `'loshu-sdlc 0.1.0'`. Unrelated to v0.7.0 scope (pre-existing latent bug). The CHANGELOG entry doesn't claim this is fixed. Worth a v0.7.x follow-up."

**Files:**
- Modify: `packages/cli/src/bin/loshu-sdlc.ts` (add import, add helper, replace the hardcoded string)

**Interfaces:**
- Consumes: existing `dirname`, `join`, `fileURLToPath` from `node:path`/`node:url`.
- Produces: `currentCliVersion(): string` (mirrors `packages/cli/src/commands/upgrade.ts:36-52`).

- [ ] **Step 1: Read the current state of `bin/loshu-sdlc.ts`**

Inspect:
- Lines 1-10 (existing imports)
- Lines 85-95 (the `if (values.version)` block with the hardcoded literal)
- Verify `dirname`, `join`, `fileURLToPath` are NOT yet imported (if they are, skip the new imports)

- [ ] **Step 2: Add imports and the helper**

Add to the imports section:

```ts
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonSync } from 'fs-extra';
```

Add a module-scope helper above the `if (values.version)` block (mirrors `packages/cli/src/commands/upgrade.ts:36-52`):

```ts
// Read the CLI's own package.json to print a real version. Mirrors
// packages/cli/src/commands/upgrade.ts:36-52 (v0.7.0 Task 11). Resolves
// `import.meta.url` to the CLI module location and walks up until
// finding a package.json whose `name === '@loshu89/cli'`. Works for
// both the published tarball and the monorepo build layouts.
function currentCliVersion(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  for (let dir = here; dir !== dirname(dir); dir = dirname(dir)) {
    const candidate = join(dir, 'package.json');
    try {
      const pkg = readJsonSync(candidate) as { name?: string; version?: string };
      if (pkg.name === '@loshu89/cli') return pkg.version ?? '0.0.0';
    } catch {
      // not a package.json or unreadable; keep walking
    }
  }
  return '0.0.0';
}
```

- [ ] **Step 3: Replace the hardcoded literal**

Edit `bin/loshu-sdlc.ts:90`:

```ts
  console.log('loshu-sdlc 0.1.0');
```

becomes

```ts
  console.log(`loshu-sdlc ${currentCliVersion()}`);
```

- [ ] **Step 4: Add a regression test**

`bin/loshu-sdlc.ts` is exercised by spawning the compiled CLI. Create or extend a test that:
1. Builds the CLI (`npx pnpm@9.0.0 --filter @loshu89/cli build`).
2. Spawns `node packages/cli/dist/bin/loshu-sdlc.js --version` (or uses `execa`).
3. Asserts the stdout contains the CLI's current `version` (read from `packages/cli/package.json`).

Place this in `packages/cli/tests/bin/version.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { execa } from 'execa';
import { readJsonSync } from 'fs-extra';
import { join } from 'node:path';

describe('loshu-sdlc --version', () => {
  it('prints the CLI package.json version (not a hardcoded literal)', async () => {
    const cliRoot = join(import.meta.dirname, '..', '..');
    const pkg = readJsonSync(join(cliRoot, 'package.json')) as { version: string };
    const cliBin = join(cliRoot, 'dist', 'bin', 'loshu-sdlc.js');
    const result = await execa('node', [cliBin, '--version']);
    expect(result.stdout.trim()).toBe(`loshu-sdlc ${pkg.version}`);
  });
});
```

- [ ] **Step 5: Run the new test alone**

Run: `npx pnpm@9.0.0 test -- packages/cli/tests/bin/version.test.ts`
Expected: 1 passed.

- [ ] **Step 6: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean; test count +1.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/bin/loshu-sdlc.ts \
        packages/cli/tests/bin/version.test.ts
git commit -m "fix(bin): read CLI version from package.json (was hardcoded 0.1.0)

The CLI's --version flag was hardcoded to print 'loshu-sdlc 0.1.0'
even though the CLI is now at v0.7.0. Extracts currentCliVersion()
using the same package.json walk pattern as v0.7.0 Task 11's
upgrade default (commands/upgrade.ts:36-52).

Adds a regression test that spawns the compiled CLI and asserts
stdout matches the live package.json version."
```
