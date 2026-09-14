---
name: bands-yaml-design
description: How to design bands.yaml. Auto-loaded by /sdlc-maintain.
---

# Bands authoring

A good `bands.yaml` defines statistical thresholds for production metrics.

## Structure (per bands.schema.json)

```yaml
metrics:
  - name: <metric_name>
    baseline: <1σ value>
    sigma_1: <1σ ceiling>
    sigma_2: <2σ ceiling>
    sigma_3: <3σ ceiling>
    unit: <unit>
    window: <evaluation window, e.g., 1h>

evaluation:
  interval: <how often to evaluate>
  on_3sigma: block_maintain_exit
  on_2sigma: warn
  on_1sigma: log
```

## Tier semantics

- **1σ (normal)**: metric within normal range; log only
- **2σ (warning)**: metric elevated; warn; suggest investigation
- **3σ (incident)**: metric tripped; block maintain-exit; require new intent.md

## Choosing thresholds

- Use historical baseline from past 30 days of production data
- 1σ = mean + 1 std dev
- 2σ = mean + 2 std dev
- 3σ = mean + 3 std dev
- For latency: p95 or p99, not mean
- For error rates: ratio (0.0 - 1.0)
