# Maintain: 2σ warning (investigate)

## User story

As on-call engineer, I want a 2σ warning evaluation flagged for investigation so that we can understand why p95_latency_ms is climbing toward the 2σ band and decide whether to take action.

## Context

This is a 2σ warning evaluation. The bands.yaml evaluation found that p95_latency_ms has crossed the 2σ band for two consecutive evaluation windows. The error_rate and deploy_frequency metrics are still inside their respective 1σ bands. The on-call engineer should investigate the latency drift, look for upstream causes, and decide whether to open an incident-driven intent.

## Expected scope

- Evaluate bands.yaml and flag the 2σ breach.
- Investigate the latency drift by querying recent deploys and upstream latency.
- Decide whether to open an incident-driven intent or close as transient.
- Record the evaluation result and followup.

## Constraints

- Investigation must start within 30 minutes of the warning.
- 2σ warnings are advisory only — they do not block maintain exit.

## Open questions

- Should 2σ warnings auto-page or stay advisory?
- How many consecutive 2σ breaches trigger an auto-intent?
