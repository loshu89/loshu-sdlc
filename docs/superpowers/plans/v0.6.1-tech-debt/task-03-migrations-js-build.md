# Task 3: Compile migrations to .js (Node 20 fix)

**Plan:** [plan.md](plan.md) — read its Global Constraints first; they apply here.
**Debt:** D3 — `packages/cli/src/lib/migrate-load.ts` imports migration `.ts` files directly, which only works on Node 22+ (native type stripping). `engines` declares `>=20` and CI runs Node 20 → on Node 20 both the `.ts` and (nonexistent) `.js` imports fail and `loadTransforms` **silently returns `{}`** → `loshu-sdlc migrate` produces un-migrated output with no error. Silent data corruption.

## Files

- Create: `scripts/compile-migrations.mjs`
- Modify: `packages/cli/src/lib/migrate-load.ts` (import order + loud warning)
- Modify: `packages/cli/package.json` (build script chain)
- Test: `packages/cli/tests/lib/migrate-load.test.ts` (new)

## Interfaces

- **Consumes:** existing `scripts/copy-plugin.mjs` pattern (runs after `tsc`, copies `packages/plugin/` → `packages/cli/plugin/`). Existing `TransformFn = (artifact: any) => any` from `./migrate.js`.
- **Produces:**
  - Compiled `.js` files at `packages/cli/plugin/migrations/*.js` (shipped in the npm tarball via `files: ["plugin/"]`)
  - `loadTransforms(artifactType: string): Promise<Record<string, TransformFn>>` — now tries `.js` FIRST, then `.ts`, and emits `console.warn` when a transform file exists but fails to load. Task 4's restored migrate tests rely on transforms actually loading in the vitest (Node 20) environment.

## Steps

- [x] **Step 1: Write the failing test**

```typescript
// packages/cli/tests/lib/migrate-load.test.ts
import { describe, it, expect } from 'vitest';
import { loadTransforms } from '../../src/lib/migrate-load.js';

describe('loadTransforms', () => {
  it('loads intent transforms (js or ts) in the test environment', async () => {
    const transforms = await loadTransforms('intent');
    // The repo ships intent-0.1.0-to-0.2.0 and intent-0.2.0-to-0.5.0.
    // After the build compiles .js, or on Node 22+ via .ts, at least the
    // 0.2.0->0.5.0 key must be present.
    expect(Object.keys(transforms)).toContain('0.2.0->0.5.0');
    expect(typeof transforms['0.2.0->0.5.0']).toBe('function');
  });

  it('returns empty object for unknown artifact type', async () => {
    const transforms = await loadTransforms('nonexistent-type');
    expect(transforms).toEqual({});
  });
});
```

- [x] **Step 2: Run test to verify it fails on this Node version**

```bash
cd "D:/workspace/3.my/SDLC"
node --version   # record it
npx pnpm@9.0.0 --filter @loshu89/cli test -- tests/lib/migrate-load.test.ts
```

Expected on Node 20: FAIL (`transforms` is `{}` — key missing). On Node 22+: may PASS already (direct `.ts` import works) — that's fine, the test still guards the contract; note the Node version in your report.

- [x] **Step 3: Create the compile script**

```javascript
// scripts/compile-migrations.mjs
// Compiles packages/plugin/migrations/*.ts to .js IN PLACE inside the
// bundled copy (packages/cli/plugin/migrations/), so the published CLI
// works on Node 20 (no native type stripping).
// Runs after copy-plugin.mjs in the build chain.
import { execFileSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const bundledMigrations = join(root, 'packages', 'cli', 'plugin', 'migrations');

if (!existsSync(bundledMigrations)) {
  console.error(`compile-migrations: ${bundledMigrations} not found — run copy-plugin first`);
  process.exit(1);
}

const tsFiles = readdirSync(bundledMigrations).filter((f) => f.endsWith('.ts'));
if (tsFiles.length === 0) {
  console.log('compile-migrations: no .ts files to compile');
  process.exit(0);
}

const tscBin = join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsc.cmd' : 'tsc');
execFileSync(
  tscBin,
  [
    ...tsFiles.map((f) => join(bundledMigrations, f)),
    '--module', 'nodenext',
    '--target', 'es2022',
    '--moduleResolution', 'nodenext',
    '--outDir', bundledMigrations,
    '--skipLibCheck',
  ],
  { stdio: 'inherit' },
);
console.log(`compile-migrations: compiled ${tsFiles.length} file(s) to ${bundledMigrations}`);
```

- [x] **Step 4: Chain it into the build**

In `packages/cli/package.json`, change:

```json
"build": "tsc && pnpm run copy-plugin",
```

to:

```json
"build": "tsc && pnpm run copy-plugin && pnpm run compile-migrations",
"compile-migrations": "node ../../scripts/compile-migrations.mjs",
```

- [x] **Step 5: Fix the loader — .js first, .ts fallback, loud warning**

Replace the import-attempt block in `packages/cli/src/lib/migrate-load.ts` (currently lines ~24-35):

```typescript
    const filePath = join(MIGRATIONS_DIR, f);
    const jsPath = filePath.replace(/\.ts$/, '.js');
    let mod: any = null;
    // Prefer compiled .js (works on all supported Node versions);
    // fall back to .ts (dev repo on Node >=22.6 with type stripping).
    try {
      mod = await import(pathToFileURL(jsPath).href);
    } catch {
      try {
        mod = await import(pathToFileURL(filePath).href);
      } catch {
        console.warn(
          `migrate: failed to load transform "${f}" — run \`pnpm build\` to compile migrations, ` +
            `or use Node >=22.6. Migrations for "${artifactType}" will be INCOMPLETE.`,
        );
        continue;
      }
    }
```

Also: the dev-repo `MIGRATIONS_DIR` (`packages/plugin/migrations`) contains only `.ts` files, and readdir filters `f.endsWith('.ts')`. Keep that filter — but ALSO pick up sibling `.js` files so the bundled dir (which has both) doesn't double-count. Dedupe by transform key:

```typescript
  for (const f of files) {
    const isTs = f.endsWith('.ts');
    const isJs = f.endsWith('.js');
    if (!f.startsWith(`${artifactType}-`) || (!isTs && !isJs)) continue;
    const base = isTs ? f.slice(artifactType.length + 1, -3) : f.slice(artifactType.length + 1, -3);
    const key = base.replace(/-to-/, '->');
    if (transforms[key]) continue; // already loaded (.ts iterated first or .js — first wins)
    // ... import logic above, using filePath = join(MIGRATIONS_DIR, f)
```

(Adapt variable names to the existing code; the CONTRACT is: keys are `{from}->{to}`, each key loaded at most once, `.js` preferred when both exist.)

- [x] **Step 6: Build + run the test**

```bash
cd "D:/workspace/3.my/SDLC"
npx pnpm@9.0.0 --filter @loshu89/cli build
npx pnpm@9.0.0 --filter @loshu89/cli test -- tests/lib/migrate-load.test.ts tests/commands/migrate.test.ts
```

Expected: build prints `compile-migrations: compiled 2 file(s)`; both test files PASS (migrate.test.ts exercises the full CLI path).

- [x] **Step 7: Verify compiled output is in the bundle and gitignored**

```bash
ls packages/cli/plugin/migrations/
git check-ignore packages/cli/plugin/ && echo "bundle ignored (correct)"
```

Expected: `.ts` AND `.js` files listed; bundle is gitignored (copy-plugin output is not committed — verified in v0.6.0).

- [x] **Step 8: E2E migrate on Node — confirm no silent failure**

```bash
TMP=$(mktemp -d)
printf -- '---\ntitle: t\nschema_version: 0.1.0\n---\nbody\n' > "$TMP/intent.md"
node packages/cli/dist/bin/loshu-sdlc.js migrate "$TMP/intent.md"
grep -E "schema_version|state" "$TMP/intent.md"
rm -rf "$TMP"
```

Expected: `schema_version: 0.5.0` and `state: iterating` in the output file. If the warn message appears instead, the loader fix is wrong — debug before committing.

- [x] **Step 9: Commit**

```bash
git add scripts/compile-migrations.mjs packages/cli/src/lib/migrate-load.ts packages/cli/package.json packages/cli/tests/lib/migrate-load.test.ts
git commit -m "fix(cli): compile plugin migrations to .js so migrate works on Node 20 (was silent no-op)"
```

## Known gotchas

- `tsc` compiling loose `.ts` files that `export function transform(artifact: any)` will emit `any`-typed JS — fine, no strict checks needed for migrations (they're data shapers). `--skipLibCheck` avoids unrelated type resolution failures.
- On Windows, `node_modules/.bin/tsc` is `tsc.cmd` — the script handles this via `process.platform`.
- The bundled `packages/cli/plugin/` is REGENERATED on every build (copy-plugin removes and recopies) — compiled `.js` there is ephemeral, which is correct: the npm tarball captures it at publish time.
- Do NOT commit `packages/cli/plugin/**` (gitignored already).

## Report contract

Write report to the SDD workspace `task-03-report.md`; reply with only:

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- Commits created (short SHA + subject)
- One-line test summary (include the Node version you ran on)
- Concerns (if any)
- Report file path
