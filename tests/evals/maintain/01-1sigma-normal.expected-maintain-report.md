---
title: Maintain cycle — 1σ normal evaluation
status: accepted
cycle: 42
date: 2026-09-14
bandsPath: bands.yaml
evaluationWindow: 1h
trigger: scheduled
metrics:
  - name: error_rate
    baseline: 0.01
    current: 0.008
    band: 1sigma
    action: log
  - name: p95_latency_ms
    baseline: 200
    current: 195
    band: 1sigma
    action: log
incidents: []
followups: []
---

# Maintain: 1σ normal (no action)

## User story

As on-call engineer, I want a routine maintain-stage evaluation confirming that all tracked metrics are within the 1σ band so that we can close the maintain cycle and stay on the planned roadmap.

## Context

This is a 1σ normal evaluation. The bands.yaml evaluation runs every 5 minutes. All tracked metrics — error_rate, p95_latency_ms, deploy_frequency — are inside their respective 1σ bands. No action is required beyond logging the evaluation. The maintain cycle closes cleanly.

## expected scope

- evaluate bands.yaml against the last evaluation window.
- confirm all metrics are inside 1σ.
- log the evaluation result to the maintain log.
- no new intent.md produced.

## Constraints

- evaluation must complete within 1 second.
- log line must include metric name, current value, and band.

## Open questions

- Should we expose the maintain log to non-engineering stakeholders?
- how long do we retain historical evaluation logs?
