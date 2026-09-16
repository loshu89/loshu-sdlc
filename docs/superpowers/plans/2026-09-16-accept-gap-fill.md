# v0.6.4 Acceptance Gap Fill (L1+L2+L3)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Each task's full text lives in its own `task-NN-*.md` file in this directory — load only the task you are executing.

**Goal:** Close the spec-vs-implementation gap in the acceptance test framework per the audit. Five new assertions (A3, real C1 DAG transition, real C2 schema validate, V4 cross-cycle parent schema, extended C4 artifact existence) plus fill missing test coverage on assertions that exist but were untested (A7, A8, V3, B1, B2). Plus the foundational change: extend `Artifact` with `rootPath` so project-scope assertions can re-discover the cycle file.

**Architecture:** No new subsystems. Every task extends existing files in `packages/cli/src/lib/accept/` or adds test files in `packages/cli/tests/lib/accept/`. The only structural change is adding `rootPath: string` to the `Artifact` interface; this is a minor widening that doesn't break any existing call site (default to deriving from `process.cwd()` when not provided).

**Tech Stack:** Node 20+, TypeScript 5.4 strict, vitest 1.6, ajv 8 (already used by validate), bash hooks (POSIX + `set -euo pipefail`), pnpm 9 workspaces. Same as v0.6.3.

**Spec:** `docs/superpowers/specs/doc-mgmt/4-acceptance.md` (§4.3 table — the 22 assertions) and `docs/superpowers/specs/doc-mgmt/6-scope-acceptance.md` (§6.2 system-level acceptance). The audit identified the gap.

## Audit Summary (Source of this plan)

Spec promises 22 assertions (A1–A8, V1–V4, C1–C8, B1–B2). Implementation has 17 (B1, B2 added with no tests; A3, V4, C2, C5, C6, C7, C8 missing entirely; current C1 implementation is enum membership which duplicates spec A6 rather than checking DAG transitions; current C2 is labeled as cross-stage guard but spec C2 is schema validate; current C4 only checks regex format not artifact existence).

Scope decisions:
- **Implement:** A3, real C1 (DAG transition), real C2 (schema validate), V4, extended C4 (artifact existence check). Plus tests for A7, A8, V3, B1, B2.
- **Defer:** C5/C6/C7/C8 — git-layer assertions requiring platform API integration; spec phasing notes v0.7.0 = "platform completeness" so this is correctly deferred.
- **Don't relabel existing C1/C2/C4:** the existing labels are internal to this codebase. A migration would break existing tests; not in scope. Note in CHANGELOG.

## Global Constraints

- Node ≥ 20.0.0 must work (CI matrix runs Node 20).
- pnpm invoked via `npx pnpm@9.0.0 <cmd>` in sandboxes without global pnpm.
- TypeScript strict: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` — optional fields need `| undefined`, regex match groups need `!` or `?? fallback`.
- `packages/cli` is `"type": "module"` — ESM imports only; CJS deps (fs-extra, ajv-formats) need default-import interop: `import fsExtra from 'fs-extra'; const { readFile } = fsExtra;`
- Conventional Commits (`feat:` / `fix:` / `test:` / `docs:` / `chore:` / `refactor:`)
- Test framework: vitest only; test files live at `packages/cli/tests/**`
- Do NOT touch `docs/superpowers/specs/**` content
- All work on `main`; one commit per task unless the task says otherwise
- Never paste tokens/secrets into any file, commit, or report
- Acceptance assertion tests live at `packages/cli/tests/lib/accept/assertions/<rule-file>.test.ts`
- Each new assertion MUST have a unit test in the matching `.test.ts` file before the implementation is considered complete
- Use the existing vitest tmpdir/mkdtemp/rm pattern from `state.test.ts` for fixtures
- AJV is already instantiated via `import Ajv from 'ajv'`; reuse the existing import pattern (see how `commands/validate.ts` does it)

## Task Index

| # | Task | Files | Depends on | Status |
|---|------|-------|-----------|--------|
| 1 | [Extend Artifact with rootPath](task-01-extend-artifact.md) | `packages/cli/src/lib/accept/types.ts`, `packages/cli/src/lib/accept/discover.ts`, `packages/cli/src/lib/accept/runner.ts` | — | ☐ |
| 2 | [A3 — id global uniqueness](task-02-a3-uniqueness.md) | `packages/cli/src/lib/accept/assertions/identity.ts`, `packages/cli/tests/lib/accept/assertions/identity.test.ts` | 1 | ☐ |
| 3 | [Refactor state assertions: real C1, real C2, rename, extend C4](task-03-state-refactor.md) | `packages/cli/src/lib/accept/assertions/state.ts`, `packages/cli/tests/lib/accept/assertions/state.test.ts` | 1 | ☐ |
| 4 | [V4 — cross-cycle parent schema consistency](task-04-v4-cross-cycle.md) | `packages/cli/src/lib/accept/assertions/versioning.ts`, `packages/cli/tests/lib/accept/assertions/versioning.test.ts` | 1 | ☐ |
| 5 | [Fill missing test coverage: A7, A8, V3, B1, B2](task-05-test-coverage.md) | `packages/cli/tests/lib/accept/assertions/identity.test.ts`, `packages/cli/tests/lib/accept/assertions/versioning.test.ts`, `packages/cli/tests/lib/accept/assertions/bands.test.ts` (new) | — | ☐ |
| 6 | [CHANGELOG entry for v0.6.4](task-06-changelog.md) | `CHANGELOG.md` | 1-5 | ☐ |
| 7 | [Release v0.6.4](task-07-release.md) | (release.mjs) | 6 | ☐ |

**Parallelism:** Tasks 2, 3, 4 all depend on Task 1 (Artifact.rootPath). Task 5 is independent (just adding tests to existing assertions). Tasks 6-7 are sequential post-completion.

Recommended order: 1 → (2, 3, 4 sequential because they all touch runner-evaluated code paths) → 5 → 6 → 7.

## Verification (final gate — Task 7 runs this)

```bash
npx pnpm@9.0.0 typecheck
npx pnpm@9.0.0 test          # includes new acceptance tests; 0 skips
npx pnpm@9.0.0 build
npx pnpm@9.0.0 test:eval:strict
npx pnpm@9.0.0 lint          # 0 errors
```

Plus: every new assertion has at least one positive and one negative test case. The runner.ts integration test in `packages/cli/tests/lib/accept/runner.test.ts` should be extended to verify all 22 spec rules are reachable (existing runner tests may need a small update).

## Self-Review Checklist (done by plan author)

- [x] Every audit gap mapped to a task (L1 tests → 5; L2 missing impl → 4; L3 → 1)
- [x] Every task names exact file paths
- [x] Interfaces produced by task N match what task N+1 consumes (Artifact.rootPath introduced in Task 1, consumed by Tasks 2, 3, 4)
- [x] No task depends on a later task
- [x] Commit messages follow Conventional Commits

## Out of Scope (deferred to v0.7.0+)

- C5 (git.branch exists) — requires git CLI integration
- C6 (PR exists in platform API) — requires platform.getPR() call
- C7 (cycle all accepted → PR open) — requires checking cycleEntry.pr
- C8 (PR CI all success) — requires platform API checks integration
- Performance benchmark suite (items 24-27 in spec §6.2.2)
- Security benchmark suite (items 28-30 in spec §6.2.3)
- Compatibility matrix (items 31-33 in spec §6.2.4)
- Relabeling existing C1/C2/C4 to match spec (would break existing tests; defer)

## Cross-References

- `docs/superpowers/specs/doc-mgmt/4-acceptance.md` — 22 assertions table
- `docs/superpowers/specs/doc-mgmt/6-scope-acceptance.md` — system-level criteria
- `.superpowers/sdd/plan/progress.md` — v0.6.1 SDD ledger (reference for the pattern this plan follows)
