---
description: Run Maintain stage (bands.yaml evaluation + incident handling)
argument-hint: ""
---

# /sdlc-maintain — Maintain stage

You are running the **Maintain stage**. Evaluate `bands.yaml`, handle incidents, and close the loop by producing new `intent.md` if needed.

## Required skills

- `superpowers:using-superpowers`
- `superpowers:systematic-debugging` (Tier-1) — drives incident root-cause analysis

## Workflow

1. Read `bands.yaml`; evaluate current metrics.
2. If all 1σ: log only. Done.
3. If any 2σ: warn; suggest investigation. Done.
4. If any 3σ: **block maintain-exit**. Invoke `superpowers:systematic-debugging` for root-cause.
5. Wrap findings in a new `intent.md` (incident-driven).
6. Loop closes when PO accepts the new intent.md → next cycle starts at Plan.

## Exit gates

- If 3σ incident: new intent.md produced and accepted
- Otherwise: bands.yaml evaluated; status logged
