# v0.6.1 Tech-Debt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Each task's full text lives in its own `task-NN-*.md` file — load only the task you are executing.

**Goal:** Make loshu-sdlc's existing promises real — fix the dead event emitter, wire all stage hooks, make migrations work on Node 20, restore the 5 skipped tests, give the 3σ closed loop a metrics producer, and ship CODEOWNERS/PR templates.

**Architecture:** No new subsystems. Every task repairs or completes something already in the codebase: bash hooks (`packages/plugin/hooks/`), the CLI (`packages/cli/src/`), templates (`packages/templates/`), and CI. The closed loop (Maintain stage) gets its first real data producer via `loshu-sdlc bands record`.

**Tech Stack:** Node 20+, TypeScript 5.4 strict, vitest, bash hooks (POSIX + `set -euo pipefail`), pnpm 9 workspaces.

**Spec:** `docs/superpowers/specs/doc-mgmt/spec.md` (v0.6.0 design — this plan repairs its implementation gaps) + the debt register in this file's appendix.

## Global Constraints

- Node ≥ 20.0.0 must work (CI matrix runs Node 20 — no feature may require Node 22+ at runtime without a compiled fallback)
- pnpm invoked via `npx pnpm@9.0.0 <cmd>` in sandboxes without global pnpm
- TypeScript strict: `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess` — optional fields need `| undefined`, regex match groups need `!` or `?? fallback`
- `packages/cli` is `"type": "module"` — ESM imports only; CJS deps (fs-extra, ajv-formats) need default-import interop: `import fsExtra from 'fs-extra'; const { readFile } = fsExtra;`
- Conventional Commits (`feat:` / `fix:` / `test:` / `docs:` / `chore:` / `ci:`)
- Bash hooks: `#!/usr/bin/env bash` + `set -euo pipefail`; exit 0 = allow, exit 2 = block (Claude Code convention)
- Test framework: vitest only; test files live at `packages/cli/tests/**`
- Do NOT touch `docs/superpowers/specs/**` content (historical record) except status lines if a task says so
- All work on `main`; one commit per task unless the task says otherwise
- Never paste tokens/secrets into any file, commit, or report

## Task Index

Progress is tracked here. Executor marks `- [x]` when their task is committed; controller verifies via review before checking the box.

| # | Task | Files | Depends on | Status |
|---|------|-------|-----------|--------|
| 1 | [Fix plan-exit dead emit_event](task-01-fix-plan-exit-emit.md) | `packages/plugin/hooks/plan-exit.sh` | — | ☐ |
| 2 | [Wire emit_event into remaining 4 hooks](task-02-wire-remaining-hooks.md) | `packages/plugin/hooks/{design,build,deploy,maintain}-exit.sh` | 1 | ☐ |
| 3 | [Compile migrations to .js (Node 20 fix)](task-03-migrations-js-build.md) | `scripts/compile-migrations.mjs`, `packages/cli/src/lib/migrate-load.ts`, `packages/cli/package.json` | — | ☐ |
| 4 | [Restore 5 skipped tests + fix templates](task-04-restore-skipped-tests.md) | `packages/cli/tests/{lib/validate,commands/state}.test.ts`, `packages/templates/**`, `packages/cli/src/commands/create.ts` | 3 | ☐ |
| 5 | [`bands record` — metrics producer](task-05-bands-record.md) | `packages/cli/src/commands/bands.ts`, `packages/cli/src/bin/loshu-sdlc.ts`, tests | — | ☐ |
| 6 | [CODEOWNERS + PR/issue templates](task-06-codeowners-templates.md) | `packages/templates/full/**`, `.github/**` | — | ☐ |
| 7 | [Closed-loop E2E test + release v0.6.1](task-07-closed-loop-release.md) | `tests/integration/closed-loop.test.ts`, `CHANGELOG.md`, versions | 1-6 | ☐ |

**Parallelism:** Tasks 1→2 are sequential (same hook family). Tasks 3→4 are sequential (4 needs 3's compiled migrations). Tasks 5 and 6 are independent of everything except the final release. Recommended order: 1, 2, 3, 5, 6 (parallel-safe), 4, 7.

## Task Dependencies (DAG)

```
1 → 2 ─────────────┐
3 → 4 ─────────────┤
5 ─────────────────┼→ 7 (release)
6 ─────────────────┘
```

## Verification (final gate — Task 7 runs this)

```bash
npx pnpm@9.0.0 typecheck
npx pnpm@9.0.0 test          # 0 skips, 0 excludes — everything runs
npx pnpm@9.0.0 build
npx pnpm@9.0.0 test:eval:strict
npx pnpm@9.0.0 lint
```

Plus the closed-loop E2E: hook fires → events.jsonl written → 3σ metric recorded → maintain-exit forks incident cycle.

## Self-Review Checklist (done by plan author)

- [x] Every debt item D1-D6, D9 from the register maps to a task (D1→T1, D2→T2, D3→T3, D4→T4, D5→T5, D6/D9→T6; D7 git-sync deferred to v0.7.0, D8 stubs deferred, D10-D13 accepted)
- [x] Every task names exact file paths
- [x] Interfaces produced by task N match what task N+1 consumes (`emit_event` signature T1→T2; compiled `.js` migrations T3→T4; `.sdlc/metrics.json` format T5→T7)
- [x] No task depends on a later task
- [x] Commit messages follow Conventional Commits

## Appendix: Debt Register (source of this plan)

| ID | Debt | Disposition |
|---|---|---|
| D1 | plan-exit `emit_event` block sits after `exit 0` — never runs | **Task 1** |
| D2 | design/build/deploy/maintain-exit have no emit_event wiring | **Task 2** |
| D3 | migrate-load imports `.ts` (Node 22+); engines says ≥20; silent empty result on Node 20 | **Task 3** |
| D4 | 5 legacy tests skipped via `.skip` rename + `--exclude` (validate ×3, state ×2); root cause: templates lack required Identity fields | **Task 4** |
| D5 | `.sdlc/metrics.json` has no producer → 3σ loop never fires | **Task 5** |
| D6 | CODEOWNERS parser exists but no CODEOWNERS file anywhere | **Task 6** |
| D9 | No PR/issue templates (repo + scaffolded projects) | **Task 6** |
| D7 | `git sync` is a print-only stub | Deferred → v0.7.0 |
| D8 | `rules check` / `logs` / `upgrade` are stubs | Deferred → v0.7.0+ |
| D10 | appendEvent O(n) rewrite | Accepted (scale is fine) |
| D11 | hooks grep-parse cycle.json | Accepted (fast; documented coupling) |
| D12 | CLI lint rules relaxed (any etc.) | Deferred → v1.0.0 |
| D13 | Occasional test timeout on Windows | Accepted (timeout raised to 10s) |
