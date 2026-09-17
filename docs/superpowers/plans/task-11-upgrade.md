# Task 11: Upgrade default version + tests

**Goal:** Read the CLI's own version from `packages/cli/package.json` (resolved via `fileURLToPath(import.meta.url)`) instead of the current hardcoded `'0.1.0'` default. Add tests.

**Spec:** v0.7.0-design §4.

**Files:**
- Modify: `packages/cli/src/commands/upgrade.ts` (one line).
- Create: `packages/cli/tests/commands/upgrade.test.ts`

- [ ] **Step 1: Read `upgrade.ts` line 47 (the hardcoded default)**

```ts
const to = args.to ?? '0.1.0';
```

- [ ] **Step 2: Replace the hardcoded default with a dynamic read**

Add an import near the top:
```ts
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readJsonSync } from 'fs-extra';
```

Add a helper at module scope (above the `upgrade` function):
```ts
function currentCliVersion(): string {
  // Resolve the CLI's own package.json from the module URL.
  // Works in both published (node_modules/@loshu89/cli/...) and
  // monorepo (packages/cli/...) layouts.
  const here = dirname(fileURLToPath(import.meta.url));
  // Walk up to find package.json (handles dist/ vs src/ build layouts).
  for (let dir = here; dir !== dirname(dir); dir = dirname(dir)) {
    const candidate = join(dir, 'package.json');
    try {
      const pkg = readJsonSync(candidate) as { name?: string; version?: string };
      if (pkg.name === '@loshu89/cli') return pkg.version ?? '0.0.0';
    } catch {
      // not a package.json or unreadable; keep walking
    }
  }
  return '0.0.0';  // last-ditch fallback
}
```

Replace the hardcoded default:
```ts
const to = args.to ?? currentCliVersion();
```

- [ ] **Step 3: Create `tests/commands/upgrade.test.ts`**

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtemp, writeFile, writeJson, readFile, rm } from 'fs-extra';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { upgrade } from '../../src/commands/upgrade.js';

describe('loshu-sdlc upgrade', () => {
  let tmp: string;

  beforeEach(async () => {
    tmp = await mkdtemp(join(tmpdir(), 'loshu-upgrade-'));
  });

  afterEach(async () => {
    await rm(tmp, { recursive: true, force: true });
  });

  it('uses --to when provided', async () => {
    const pkg = { name: 'demo-app', dependencies: { '@loshu89/plugin': '0.5.0', '@loshu89/cli': '0.5.0', '@loshu89/templates': '0.5.0' } };
    await writeJson(join(tmp, 'package.json'), pkg);
    const rc = await upgrade({ path: tmp, to: '9.9.9', dryRun: true });
    expect(rc).toBe(0);
    // dry-run didn't change anything
    const after = await readFile(join(tmp, 'package.json'), 'utf8');
    expect(after).toContain('0.5.0');
  });

  it('dry-run reports plan but does not write', async () => {
    const pkg = { name: 'demo-app', dependencies: { '@loshu89/plugin': '0.5.0', '@loshu89/cli': '0.5.0', '@loshu89/templates': '0.5.0' } };
    await writeJson(join(tmp, 'package.json'), pkg);
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };
    try {
      await upgrade({ path: tmp, to: '1.0.0', dryRun: true });
    } finally {
      console.log = origLog;
    }
    expect(captured).toContain('Upgrade plan');
    expect(captured).toContain('1.0.0');
    // Verify no write
    const after = JSON.parse(await readFile(join(tmp, 'package.json'), 'utf8'));
    expect(after.dependencies['@loshu89/cli']).toBe('0.5.0');
  });

  it('live upgrade writes the new versions', async () => {
    const pkg = { name: 'demo-app', dependencies: { '@loshu89/plugin': '0.5.0', '@loshu89/cli': '0.5.0', '@loshu89/templates': '0.5.0' } };
    await writeJson(join(tmp, 'package.json'), pkg);
    const rc = await upgrade({ path: tmp, to: '1.0.0' });
    expect(rc).toBe(0);
    const after = JSON.parse(await readFile(join(tmp, 'package.json'), 'utf8'));
    expect(after.dependencies['@loshu89/cli']).toBe('1.0.0');
    expect(after.dependencies['@loshu89/plugin']).toBe('1.0.0');
    expect(after.dependencies['@loshu89/templates']).toBe('1.0.0');
  });

  it('exits 2 when package.json is missing', async () => {
    const rc = await upgrade({ path: tmp, to: '1.0.0' });
    expect(rc).toBe(2);
  });

  it('reports "Already up to date" when all deps match --to', async () => {
    const pkg = { name: 'demo-app', dependencies: { '@loshu89/plugin': '1.0.0', '@loshu89/cli': '1.0.0', '@loshu89/templates': '1.0.0' } };
    await writeJson(join(tmp, 'package.json'), pkg);
    let captured = '';
    const origLog = console.log;
    console.log = (msg: string) => { captured += msg; };
    try {
      await upgrade({ path: tmp, to: '1.0.0' });
    } finally {
      console.log = origLog;
    }
    expect(captured).toContain('Already up to date');
  });
});
```

- [ ] **Step 4: Run the test file**

Run: `npx pnpm@9.0.0 test -- tests/commands/upgrade.test.ts`
Expected: 5 passed.

- [ ] **Step 5: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/upgrade.ts \
        packages/cli/tests/commands/upgrade.test.ts
git commit -m "fix(upgrade): read CLI version from package.json (not hardcoded 0.1.0)

The default 'to' for 'loshu-sdlc upgrade' was hardcoded to '0.1.0',
which would have downgraded users of any post-v0.1.0 release.
Now reads the CLI's own package.json (resolved via
fileURLToPath(import.meta.url)) and uses that as the default
when --to is not provided.

Resolves to the CLI package by walking up from the current
module URL until finding a package.json with name ===
'@loshu89/cli'. Works for both the monorepo layout (src/
build) and the published tarball layout (dist/build/...).

Adds 5 unit tests: --to override, dry-run, live upgrade,
missing package.json, 'Already up to date'."
```