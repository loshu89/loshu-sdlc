---
name: plan-md-authoring
description: How to write a good plan.md. Auto-loaded by /sdlc-build.
---

# Plan authoring

A good `plan.md` breaks a spec into executable tasks.

## Sections (per plan.schema.json)

- **tasks**: array of { id, title, estimate, files, dependsOn }
- **verification**: { build, test, lint, typecheck } commands

## Task granularity

- Each task should be 2-4 hours of work
- Each task should have a clear deliverable
- Tasks should be ordered by dependency (use dependsOn)
- Aim for 5-15 tasks per plan

## Anti-patterns

- Don't list sub-steps within a task — that's for the implementer
- Don't include rationale — link to spec.md instead
- Don't skip verification commands — they drive /sdlc-test gates

## State management

`plan.md` participates in the artifact state machine defined in
`packages/plugin/state-machines/artifact.json`. The `build-exit`
hook reads `state:` from the frontmatter:

- `draft` / `iterating` → validates against schema, then transitions
  to `accepted` (provided `spec.md` is already in state `accepted`).
- `rejected` / `archived` → allows re-validation; surface the state to
  stderr so authors can choose to resurrect.
- `blocked` → refuses to advance; resolve the blocker first.
- `accepted` → already validated; no re-run needed.

### Example frontmatter

```yaml
---
title: Plan for OAuth auth
state: draft
spec: spec.md
tasks:
  - id: t1
    title: Wire OAuth provider
    estimate: 4h
verification:
  build: pnpm build
  test: pnpm test
  lint: pnpm lint
  typecheck: pnpm typecheck
---
```