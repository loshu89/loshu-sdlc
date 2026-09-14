---
description: Show current cycle state across all six stages
argument-hint: ""
---

# /sdlc-status — Cross-stage dashboard

Display the current cycle state by reading `.loshu-sdlc/state/status.json` (or, if missing, by inferring from artifact files).

## Output format

```
loshu-sdlc v0.1.0 — current state

Cycle: <N> (<title>)
┌─────────┬──────────┬───────────┬────────────┬────────────┐
│ Stage   │ Artifact │ Status    │ Updated    │ Next gate  │
├─────────┼──────────┼───────────┼────────────┼────────────┤
│ Plan    │ intent.md│ <status>  │ <date>     │ —          │
│ Design  │ spec.md  │ <status>  │ <date>     │ —          │
│ Build   │ plan.md  │ <status>  │ <date>     │ —          │
│ Test    │ —        │ <status>  │ <date>     │ —          │
│ Deploy  │ REVIEW.md│ <status>  │ <date>     │ —          │
│ Maintain│ bands.yaml│ <status> │ <date>     │ —          │
└─────────┴──────────┴───────────┴────────────┴────────────┘

External deps:
  Tier-1: <X>/5 ✓   Tier-2: <Y>/6 ✓   Tier-3: <Z>/17
```

For data, also expose this via `loshu-sdlc status` CLI command (mirrors this view).
