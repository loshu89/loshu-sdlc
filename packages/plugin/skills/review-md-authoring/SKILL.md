---
name: review-md-authoring
description: How to populate REVIEW.md. Auto-loaded by /sdlc-deploy.
---

# Review authoring

A good `REVIEW.md` has three sections, each with `status: pass` or `status: fail`:

- **Bugs**: from `ecc:code-reviewer` (or loshu-sdlc native fallback)
- **Security**: from `ecc:security-reviewer` (OWASP-grounded)
- **Compliance**: from policy-default/ checks

## Status semantics

- `pass`: section is clean or has only minor findings (acceptable to ship)
- `fail`: section has critical/high findings (must fix before deploy)

## Deploy gate

If any section is `fail`, deploy is BLOCKED. The build-exit hook refuses.

## State management

`REVIEW.md` participates in the artifact state machine defined in
`packages/plugin/state-machines/artifact.json`. The same 12-edge DAG
applies; transitions are driven by the `deploy-exit` hook:

- `draft` / `iterating` → validates against the schema and transitions
  to `accepted` **iff** `plan.md` is already in state `accepted`.
- `rejected` / `archived` → allow re-validation; the hook does not
  block on these.
- `blocked` → refuses to advance; resolve the blocker first.

The legacy per-section `Status: pass | fail` field is separate from
the DAG `state` field. Both must be satisfied for deploy: every
section must be `pass`, AND the file-level `state` must be `accepted`.