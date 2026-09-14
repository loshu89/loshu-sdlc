# Maintain: 1σ normal (no action)

## User story

As on-call engineer, I want a routine maintain-stage evaluation confirming that all tracked metrics are within the 1σ band so that we can close the maintain cycle and stay on the planned roadmap.

## Context

This is a 1σ normal evaluation. The bands.yaml evaluation runs every 5 minutes. All tracked metrics — error_rate, p95_latency_ms, deploy_frequency — are inside their respective 1σ bands. No action is required beyond logging the evaluation. The maintain cycle closes cleanly.

## Expected scope

- Evaluate bands.yaml against the last evaluation window.
- Confirm all metrics are inside 1σ.
- Log the evaluation result to the maintain log.
- No new intent.md produced.

## Constraints

- Evaluation must complete within 1 second.
- Log line must include metric name, current value, and band.

## Open questions

- Should we expose the maintain log to non-engineering stakeholders?
- How long do we retain historical evaluation logs?
