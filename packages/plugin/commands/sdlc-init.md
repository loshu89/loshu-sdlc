---
description: Run plan → design → build sequence in one command
argument-hint: [feature-or-topic]
---

# /sdlc-init — Sequential pipeline

Runs `/sdlc-plan` → `/sdlc-design` → `/sdlc-build` in sequence. Stops at the first stage whose gate fails.

## Workflow

1. Invoke `/sdlc-plan` (or its underlying logic) with the user's argument.
2. If Plan-exit passes, invoke `/sdlc-design`.
3. If Design-exit passes, invoke `/sdlc-build`.
4. If Build-exit passes, suggest `/sdlc-test`.

Each stage runs the full workflow for that stage (brainstorming, schema validation, etc.). See individual command files for details.
