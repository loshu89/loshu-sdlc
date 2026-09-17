# Task 7: Rules eslint implementation

**Goal:** Wire up the real `eslint` rule. The runner shells out to `npx eslint` via `execa`, captures stdout/stderr, and returns pass (exit 0) or fail (exit non-zero with the first 5 errors surfaced).

**Spec:** v0.7.0-design §2 (4 real rules).

**Files:**
- Modify: `packages/cli/src/commands/rules.ts:31-37` (the `eslint` rule entry in `RULES`).

- [ ] **Step 1: Add `execa` import to `rules.ts` (top of file)**

```ts
import { execa } from 'execa';
```

- [ ] **Step 2: Define the eslint runner at module scope (above the `RULES` array)**

```ts
const eslintRunner = async (targetPath: string): Promise<RuleResult> => {
  // Apply ESLint to the rule's appliesTo globs against the target.
  // We use npx eslint --no-install so we don't trigger install prompts.
  try {
    const result = await execa('npx', [
      '--no-install',
      'eslint',
      '--no-error-on-unmatched-pattern',
      ...['packages/*/src/**/*.ts', 'packages/*/src/**/*.tsx'],  // conservative
    ], { cwd: targetPath });
    return { status: 'pass', errors: [], filesScanned: [] };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; exitCode?: number };
    const lines = (err.stdout ?? err.stderr ?? '')
      .split('\n')
      .filter((l) => l.trim().length > 0)
      .slice(0, 5);
    return {
      status: 'fail',
      errors: lines.length > 0 ? lines : [`eslint exited with code ${err.exitCode ?? 'unknown'}`],
      filesScanned: [],
    };
  }
};
```

- [ ] **Step 3: Add the runner to the eslint rule entry**

Replace the current `eslint` rule entry in `RULES`:
```ts
{
  name: 'eslint',
  source: 'loshu-sdlc',
  description: 'Run ESLint with the project ESLint config.',
  appliesTo: ['packages/*/src/**/*.ts'],
  runner: eslintRunner,
},
```

- [ ] **Step 4: Run typecheck**

Run: `npx pnpm@9.0.0 typecheck`
Expected: clean.

- [ ] **Step 5: Run lint**

Run: `npx pnpm@9.0.0 lint`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/rules.ts
git commit -m "feat(rules): implement eslint runner

The 'eslint' rule now invokes 'npx --no-install eslint' against
the target project, returning:
  - pass (exit 0): empty errors list.
  - fail (non-zero): first 5 lines of stdout/stderr as the
    error surface.

Failures bubble through the runner's catch (Task 6) which logs
the errors and returns exit 1. The other 10 rules remain on
the borrowed-skill stub path (Tasks 7 + 8 wire the 3 md-schema
rules next; the rest stay stub per spec phasing)."
```