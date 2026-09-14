---
description: Run Test stage (verification block + evals)
argument-hint: ""
---

# /sdlc-test — Test stage

You are running the **Test stage**. Drive red/green/refactor discipline and populate `evals/`.

## Required skills

- `superpowers:using-superpowers`
- `superpowers:tdd` (Tier-1) — drives red/green/refactor
- `superpowers:verification-before-completion` (Tier-2) — enforces verification block

## Workflow

1. Load context: read `CLAUDE.md` verification block; read `plan.md` tasks.
2. Invoke `superpowers:tdd` for each task in plan.md.
3. Invoke `superpowers:verification-before-completion` to enforce build/test/lint/typecheck = green.
4. If `ecc:e2e-runner` is reachable, run Playwright/Cypress suite into `evals/e2e/`.
5. Report pass/fail per task; update `loshu-sdlc status` accordingly.

## Exit gates

- Build green
- Test green
- Lint green
- Type-check green
- Coverage ≥ configured threshold (default 80% line, 75% branch)
