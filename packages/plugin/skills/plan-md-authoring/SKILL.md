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
