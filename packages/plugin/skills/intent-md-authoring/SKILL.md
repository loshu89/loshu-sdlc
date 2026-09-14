---
name: intent-md-authoring
description: How to write a good intent.md. Auto-loaded by /sdlc-plan.
---

# Intent authoring

A good `intent.md` answers five questions:

1. **What is broken or missing?** (Problem)
2. **What is the ideal end state?** (Proposed outcome)
3. **Who and what does this affect?** (Affected users and systems)
4. **What hard limits exist?** (Constraints — security, compliance, performance, time)
5. **What is unresolved?** (Open questions — even if empty)

## Anti-patterns

- Don't include the *how* — that's spec.md and plan.md
- Don't list every technical detail — keep intent readable by non-engineers
- Don't skip open questions — empty list is fine, but signal you've considered them

## Field guidance

- `title`: short, declarative ("OAuth authentication", not "Add OAuth")
- `problem`: 1-3 sentences; concrete
- `proposedOutcome`: 1-3 sentences; user-visible
- `affectedUsersAndSystems`: bullet list; each item specific
- `constraints`: bullet list; each item enforceable
- `openQuestions`: bullet list; mark as `[resolved]` or `[open]`

## State management

Every artifact carries a `state` field in its YAML frontmatter that
flows through a formal DAG defined in
`packages/plugin/state-machines/artifact.json`. Hooks (`plan-exit`,
`design-exit`, etc.) read this field and either allow re-validation
or transition the artifact on success.

### States

| State | Meaning |
|---|---|
| `draft` | Initial state; author is still editing |
| `accepted` | Validated; previous stage can proceed |
| `iterating` | Was accepted, now being revised |
| `blocked` | Cannot proceed; depends on something external |
| `rejected` | Rejected; not proceeding down this path |
| `archived` | Superseded by a newer cycle's artifact |

### Transitions (Plan / intent.md)

```
draft     → accepted   (validate passes)
draft     → rejected   (validation fails irrecoverably)
draft     → blocked    (depends on external decision)
accepted  → iterating  (revision needed)
accepted  → blocked    (downstream constraint changes)
accepted  → archived   (superseded)
iterating → accepted   (revision passes validation)
iterating → rejected
blocked   → draft      (blocker resolved)
blocked   → rejected
rejected  → draft      (resurrected)
archived  → draft      (un-archived)
```

### Example frontmatter

```yaml
---
title: OAuth authentication
state: draft          # ← updated by /sdlc-plan and plan-exit hook
cycle: 1
problem: "..."
proposedOutcome: "..."
affectedUsersAndSystems: [...]
constraints: [...]
openQuestions: []
---
```

`/sdlc-plan` writes `state: draft`. After validation succeeds, the
`plan-exit` hook transitions it to `accepted`. If a revision is
needed, the author changes it to `iterating`; once re-validated, it
returns to `accepted`.

### Cross-stage rule

`/sdlc-design` will refuse to advance if `state` of `intent.md` is not
`accepted`. This is the DAG: you cannot move to design until plan is
accepted.