# Task 6: Rules runner infrastructure

**Goal:** Add a `runner` field to the `Rule` interface so individual rules can declare their real check implementation. The `rules check` subcommand dispatches to the runner if present; otherwise returns the existing stub "pass" report. This sets up Tasks 7 and 8 to wire in the 4 real rules.

**Spec:** v0.7.0-design §2 (Rules runner infrastructure setup).

**Files:**
- Modify: `packages/cli/src/commands/rules.ts`

**Interfaces:**
- Consumes: existing `Rule` interface (name, source, description, appliesTo).
- Produces: `Rule.runner?: (targetPath: string) => Promise<RuleResult>` — optional async function; when present, called by `rules check`. `RuleResult = { status: 'pass' | 'fail', errors: string[], filesScanned: string[] }`.

- [ ] **Step 1: Read current `rules.ts` to know the shape of `Rule` and `rules check`**

- [ ] **Step 2: Extend the `Rule` interface and add `RuleResult` type**

Replace the current `Rule` interface block (top of `rules.ts`) with:

```ts
export interface RuleResult {
  status: 'pass' | 'fail';
  errors: string[];        // first N error messages; surfaced in the report
  filesScanned: string[];  // paths examined (for human display)
}

export interface Rule {
  name: string;
  source: string;
  description: string;
  appliesTo: string[];
  // Optional runner: when present, `rules check <name>` invokes it
  // (returning a real check result). When absent, the borrowed-skill
  // stub path is preserved.
  runner?: (targetPath: string) => Promise<RuleResult>;
}
```

- [ ] **Step 3: Refactor the `check` block to dispatch to `rule.runner`**

In `packages/cli/src/commands/rules.ts`, the `if (args.subcommand === 'check')` block currently builds a report inline and returns `'pass'`. Refactor so that when `rule.runner` is defined, we call it and surface its result; otherwise we fall through to the existing stub.

Sketch:

```ts
if (args.subcommand === 'check') {
  const name = args.name;
  if (!name) {
    console.error('Usage: loshu-sdlc rules check <name> [path]');
    return 2;
  }
  const rule = RULES.find((r) => r.name === name);
  if (!rule) {
    console.error(`Unknown rule: ${name}`);
    console.error(`Run \`loshu-sdlc rules list\` for available rules.`);
    return 2;
  }

  const targetPath = resolve(args.path ?? '.');

  if (rule.runner) {
    let result: RuleResult;
    try {
      result = await rule.runner(targetPath);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (args.json) {
        console.log(JSON.stringify({ rule: rule.name, status: 'error', error: msg }));
      } else {
        console.error(`✗ ${rule.name}: runner threw — ${msg}`);
      }
      return 1;
    }
    if (args.json) {
      console.log(JSON.stringify({ rule: rule.name, source: rule.source, path: targetPath, ...result }, null, 2));
    } else {
      const mark = result.status === 'pass' ? '✔' : '✗';
      const color = result.status === 'pass' ? chalk.green : chalk.red;
      console.log(color(`${mark} ${rule.name} [${rule.source}] — ${result.status}`));
      if (result.errors.length > 0) {
        for (const err of result.errors.slice(0, 5)) {
          console.log(chalk.dim(`    ${err}`));
        }
      }
    }
    return result.status === 'pass' ? 0 : 1;
  }

  // Borrowed-skill stub: preserved exactly as today (with the file-walk
  // loop for backward compatibility with anyone scripting around the
  // stub's output shape).
  const files: string[] = [];
  for (const glob of rule.appliesTo) {
    const relative = glob.replace(/\*[^/]*\//g, '').replace(/\*\*[^/]*\//g, '');
    const candidate = join(targetPath, relative);
    try {
      const st = await stat(candidate);
      if (st.isDirectory()) {
        const inner = await fsExtra.readdir(candidate).catch(() => []);
        files.push(...inner.map((f) => join(relative, f)));
      } else {
        files.push(relative);
      }
    } catch {
      files.push(relative);
    }
  }
  const report = {
    rule: rule.name,
    source: rule.source,
    path: targetPath,
    filesScanned: files,
    status: 'pass' as const,
    timestamp: new Date().toISOString(),
  };
  if (args.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(chalk.green(`✔ ${rule.name} [${rule.source}] — pass (borrowed)`));
    console.log(chalk.dim(`  Scanned ${files.length} path(s) under ${targetPath}`));
  }
  return 0;
}
```

- [ ] **Step 4: Run existing rules tests — verify the stub path still works**

Run: `npx pnpm@9.0.0 test -- tests/commands/rules.test.ts`
Expected: existing tests still pass (none of them call a rule with a runner yet).

- [ ] **Step 5: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: 201/201 still passing.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/commands/rules.ts
git commit -m "refactor(rules): add runner field to Rule; dispatch real impls when present

Adds Rule.runner?: (targetPath: string) => Promise<RuleResult>
so individual rules can declare a real check implementation.
The 'rules check' subcommand now dispatches to rule.runner when
defined, surfaces its pass/fail + errors, and exits non-zero on
fail. When absent, the borrowed-skill stub path is preserved
verbatim (file walk + 'pass (borrowed)' output).

No behavior change for existing callers; Tasks 7 + 8 wire in
the 4 real rules (eslint + 3 md-schema validators)."
```