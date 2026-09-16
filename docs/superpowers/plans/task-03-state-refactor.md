# Task 3: Refactor state assertions: real C1, real C2, rename, extend C4

**Goal:** Per the audit, realign `state.ts` with spec §4.3. Currently:
- `rule: 'C1'` does state-in-enum (which is spec A6 — duplicate work).
- `rule: 'C2'` does cross-stage guard (which is spec C3 — wrong label).
- `rule: 'C4'` only checks regex format, not artifact existence (spec C4 is "parent_ids artifacts exist").

Changes:
1. **Rename current `C2` → `C3`** (cross-stage guard IS spec C3).
2. **Add new `C1`**: state transition in DAG. Build a transition table from spec §3 (state-machine) — for now use a conservative table that's a superset of valid moves; the test should validate the obvious cases.
3. **Add new `C2`**: schema validate pass. Run AJV against the artifact's schema (read from `packages/plugin/schemas/`). Stage maps to schema file.
4. **Extend `C4`** (parent_ids): keep regex format check, ADD existence check (parent_id refers to a real artifact in some cycle's stages).

## State machine (for C1 DAG transition)

Per spec §3-state-machine-git.md (read it to confirm), legal transitions include:
- `pending → draft` (via /sdlc-plan)
- `draft → accepted` (via stage transition)
- `draft → iterating` (revision loop)
- `iterating → accepted`
- `accepted → blocked` (manual)
- `accepted → rejected`
- `rejected → draft` (re-edit after rejection)
- `blocked → draft` (resolve blocker)
- `archived` (terminal, no transitions out)

Conservative table (in code):

```ts
const TRANSITIONS: Record<StageState, StageState[]> = {
  pending: ['draft', 'archived'],
  draft: ['accepted', 'iterating', 'blocked', 'rejected', 'archived'],
  iterating: ['accepted', 'blocked', 'rejected', 'archived'],
  accepted: ['blocked', 'rejected', 'archived'],
  blocked: ['draft', 'archived'],
  rejected: ['draft', 'archived'],
  archived: [], // terminal
};
```

For `C1`: assert that for each artifact, there's an `origin` state recorded in frontmatter (or in cycle.json stages) and that the current state is reachable from it. If only current state is present (no prior), allow all. If prior is present, must be in TRANSITIONS[prior].

Simpler approach (recommended for first cut): C1 is satisfied if the current state is one of the legal values AND, if the cycle.json has a previous state recorded for this artifact, it's a legal predecessor. Use stage state's `prev_state` field on the cycle entry, if present.

## Schema mapping (for C2 schema validate)

| Stage | Schema file |
|---|---|
| plan | `intent.schema.json` |
| design | `spec.schema.json` |
| build | `plan.schema.json` |
| test | `claude-md.schema.json` |
| deploy | `review.schema.json` |
| maintain | `bands.schema.json` |

Schema files live at `packages/plugin/schemas/`. The CLI package needs to find them — copy-plugin puts them at `packages/cli/plugin/schemas/`. Reuse the lookup pattern from `packages/cli/src/commands/validate.ts` (read it first).

## Files to change

### `packages/cli/src/lib/accept/assertions/state.ts`

Read the current file. Then rewrite to add:
- TRANSITIONS table at top
- Rename `C2` rule to `C3` (cross-stage guard logic unchanged)
- Add new `C1` (DAG transition)
- Add new `C2` (schema validate via AJV)
- Extend `C4` to check parent_ids artifact existence via cycle.json

### `packages/cli/tests/lib/accept/assertions/state.test.ts`

Read existing tests. Update them to use new labels:
- Tests labeled `C2` (cross-stage) → `C3`
- Add tests for new `C1` (DAG transition — valid transition passes, invalid fails)
- Add tests for new `C2` (schema validate — valid passes, invalid fails)
- Update `C4` test to also verify artifact existence (positive: parent in cycle.json; negative: parent missing)

Use the same mkdtemp/writeFile/readFile/rm pattern. For the schema test, you'll need to write a valid frontmatter (validate should pass) and an invalid one (validate should fail). Look at how `tests/commands/validate.test.ts` constructs fixtures.

### Spec lookup utility

For C2 schema validate, you'll need a helper to find the schema file. Either:
- Inline lookup like `validate.ts` does (try multiple candidate paths)
- Or import a shared resolver

The CLI package already has plugin-schemas copied to `packages/cli/plugin/schemas/` via the build step. Use this same lookup.

## Verification

1. `pnpm test` — all tests pass. State tests: C1 (≥2), C2 (≥2), C3 (renamed, ≥2), C4 (extended, ≥2). Total ≥8 state tests.
2. `pnpm lint` clean.
3. `pnpm typecheck` clean.

## TDD discipline

1. Write failing tests for new C1, C2 (in their new labels).
2. Rename existing C2 tests to C3 in the test file.
3. Extend C4 test to cover the existence check.
4. Run tests — observe failures.
5. Implement new C1, C2 (DAG transition + schema validate), rename existing C2 → C3 in state.ts, extend C4.
6. Re-run — observe green.

## Commit

```
refactor(accept): realign state assertions with spec

- Rename rule C2 (cross-stage guard) → C3 (matches spec §4.3).
- Add new C1 (state transition in DAG) — checks the artifact's
  current state is reachable from the previous state recorded
  in cycle.json (or any state if no prior recorded).
- Add new C2 (schema validate pass) — runs AJV against the stage's
  schema in packages/plugin/schemas/. Stage→schema mapping matches
  the validate command's mapping.
- Extend C4 (parent_ids well-formed → parent_ids artifacts exist):
  keep the regex format check; additionally, for each parent_id,
  look up cycle.json stages to verify some cycle has an artifact
  matching that id. Fails if any parent_id is unknown.

Tests:
- Existing C2 tests relabeled to C3.
- New tests for C1 (valid transition pass / invalid transition fail).
- New tests for C2 (valid artifact passes / invalid fails).
- C4 tests extended to cover the existence check.

Depends on Task 1 (Artifact.rootPath).
```

