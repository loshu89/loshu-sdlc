---
title: Maintain cycle — 2σ warning evaluation
status: accepted
cycle: 43
date: 2026-09-14
bandsPath: bands.yaml
evaluationWindow: 1h
trigger: scheduled
metrics:
  - name: error_rate
    baseline: 0.01
    current: 0.012
    band: 1sigma
    action: log
  - name: p95_latency_ms
    baseline: 200
    sigma_2: 350
    current: 365
    band: 2sigma
    action: warn
incidents: []
followups:
  - id: FU-42-1
    summary: "investigate p95_latency_ms drift"
    owner: on-call
---

# Maintain: 2σ warning (investigate)

## User story

As on-call engineer, I want a 2σ warning evaluation flagged for investigation so that we can understand why p95_latency_ms is climbing toward the 2σ band and decide whether to take action.

## Context

This is a 2σ warning evaluation. The bands.yaml evaluation found that p95_latency_ms has crossed the 2σ band for two consecutive evaluation windows. The error_rate and deploy_frequency metrics are still inside their respective 1σ bands. The on-call engineer should investigate the latency drift, look for upstream causes, and decide whether to open an incident-driven intent.

## expected scope

- evaluate bands.yaml and flag the 2σ breach.
- investigate the latency drift by querying recent deploys and upstream latency.
- decide whether to open an incident-driven intent or close as transient.
- record the evaluation result and followup.

## Constraints

- investigation must start within 30 minutes of the warning.
- 2σ warnings are advisory only — they do not block maintain exit.

## Open questions

- Should 2σ warnings auto-page or stay advisory?
- how many consecutive 2σ breaches trigger an auto-intent?
