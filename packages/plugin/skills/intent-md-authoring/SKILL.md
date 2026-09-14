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
