---
name: spec-md-authoring
description: How to write a good spec.md. Auto-loaded by /sdlc-design.
---

# Spec authoring

A good `spec.md` translates intent into design.

## Sections (per spec.schema.json)

- **Architecture**: system-level design (components, integration points, data flow)
- **UI**: palette, typography, a11y, breakpoints (required if frontend)
- **API surface**: endpoints, methods, auth (required if backend)
- **Data model**: schema changes (required if DB)
- **Verification criteria**: how we'll know this works (concrete, testable)
- **Compliance**: which policies apply (GDPR, SOC2, WCAG, etc.)

## Anti-patterns

- Don't repeat intent verbatim — distill to design choices
- Don't write implementation steps — that's plan.md
- Don't skip verification criteria — they drive /sdlc-test

## State management

Like every artifact, `spec.md` carries a `state` field that the
`design-exit` hook inspects. The DAG (see
`packages/plugin/state-machines/artifact.json`) is:

```
draft     → accepted   (validate passes)
draft     → rejected
draft     → blocked
accepted  → iterating  (revision)
accepted  → blocked
accepted  → archived
iterating → accepted
iterating → rejected
blocked   → draft
blocked   → rejected
rejected  → draft
archived  → draft
```

`/sdlc-design` writes `state: draft`. After schema validation, the
`design-exit` hook transitions to `accepted` — **but only if
`intent.md` is already in state `accepted`** (the cross-stage rule).
Re-revisions set `state: iterating` until re-validated.

For invariants, statuses `rejected` and `archived` always allow
re-validation without blocking — the hook surfaces the state to stderr
and exits 0.