# Task 8: Rules schema runners (3 rules)

**Goal:** Wire up the 3 md-schema rules (`intent-md-schema`, `spec-md-schema`, `plan-md-schema`) to use the existing `validateArtifact` from `lib/validate.ts`.

**Spec:** v0.7.0-design §2 (4 real rules).

**Files:**
- Modify: `packages/cli/src/commands/rules.ts` (3 rule entries in `RULES`).

- [ ] **Step 1: Add `validateArtifact` import**

```ts
import { validateArtifact } from '../lib/validate.js';
```

- [ ] **Step 2: Define a single shared schema runner factory at module scope**

```ts
function makeSchemaRunner(schemaName: string) {
  return async (targetPath: string): Promise<RuleResult> => {
    // `appliesTo` for these rules is a single literal path like
    // '.loshu-sdlc/intent.md' — pick the basename and look it up.
    const fileName = targetPath.split(/[\\/]/).pop() ?? '';
    // We don't know the schema-file pair up front; iterate candidate files
    // matching the rule's appliesTo (literal paths).
    // For the v0.7.0 scope, the targetPath IS the file to validate when
    // it looks like a markdown file; otherwise fall back to listing.
    let file = targetPath;
    if (!fileName.endsWith('.md')) {
      return { status: 'pass', errors: [], filesScanned: [] };
    }
    try {
      const result = await validateArtifact(schemaName, file);
      if (result.valid) {
        return { status: 'pass', errors: [], filesScanned: [file] };
      }
      return {
        status: 'fail',
        errors: result.errors.slice(0, 5),
        filesScanned: [file],
      };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return {
        status: 'fail',
        errors: [`${schemaName} validate threw: ${msg}`],
        filesScanned: [file],
      };
    }
  };
}
```

- [ ] **Step 3: Update the 3 rule entries to wire the factory**

```ts
{
  name: 'intent-md-schema',
  source: 'loshu-sdlc',
  description: 'Validate intent.md against the intent JSON schema.',
  appliesTo: ['.loshu-sdlc/intent.md'],
  runner: makeSchemaRunner('intent'),
},
{
  name: 'spec-md-schema',
  source: 'loshu-sdlc',
  description: 'Validate spec.md against the spec JSON schema.',
  appliesTo: ['.loshu-sdlc/spec.md'],
  runner: makeSchemaRunner('spec'),
},
{
  name: 'plan-md-schema',
  source: 'loshu-sdlc',
  description: 'Validate plan.md against the plan JSON schema.',
  appliesTo: ['.loshu-sdlc/plan.md'],
  runner: makeSchemaRunner('plan'),
},
```

- [ ] **Step 4: Run full gauntlet**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 201/201 still passing (no behavior change for existing tests because existing rules tests don't invoke the new runners).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/commands/rules.ts
git commit -m "feat(rules): wire 3 md-schema runners (intent, spec, plan)

Each schema runner delegates to validateArtifact from
lib/validate.ts (single source of truth for AJV setup +
schema resolution). On invalid, the first 5 validation errors
are surfaced in the report; on valid, the rule passes.

Failure modes handled:
  - validateArtifact throws → fail with the thrown message.
  - Non-markdown target → pass (nothing to validate, no false
    negatives for non-md targets).
  - File missing → propagates from validateArtifact's error."
```