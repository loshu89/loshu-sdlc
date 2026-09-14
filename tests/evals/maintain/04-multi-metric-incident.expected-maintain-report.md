---
title: Maintain cycle — multi-metric incident evaluation
status: rejected
cycle: 45
date: 2026-09-14
bandsPath: bands.yaml
evaluationWindow: 1h
trigger: auto-incident
metrics:
  - name: error_rate
    baseline: 0.01
    sigma_3: 0.03
    current: 0.041
    band: 3sigma
    action: block_maintain_exit
  - name: p95_latency_ms
    baseline: 200
    sigma_3: 500
    current: 612
    band: 3sigma
    action: block_maintain_exit
incidents:
  - id: INC-2407
    metric: error_rate,p95_latency_ms
    severity: 3sigma-multi
    summary: "both metrics breached the 3σ band in the same evaluation window"
followups: []
---

# Maintain: Multi-metric incident

## User story

As on-call engineer, I want a multi-metric incident evaluation so that when error_rate and p95_latency_ms both breach the 3σ band in the same evaluation window, the maintain harness produces a single consolidated intent that captures both symptoms and their probable common cause.

## Context

This is a multi-metric incident evaluation. Within a single evaluation window, error_rate has crossed the 3σ band and p95_latency_ms has crossed the 3σ band. The two symptoms are likely related — both rose after the most recent deploy. The maintain harness should produce a single consolidated intent with both metrics cited, a common-cause hypothesis, and the upstream deploy referenced.

## expected scope

- detect the multi-metric 3σ breach in a single window.
- correlate the two metrics by deploy timestamp.
- produce a single consolidated intent with both symptoms and the common-cause hypothesis.
- block maintain-exit until the consolidated intent is accepted.

## Constraints

- a single window with two or more 3σ breaches produces one consolidated intent, not two.
- the consolidated intent must reference both upstream metric names.
- common-cause hypothesis must be evidence-backed, not speculative.

## Open questions

- How many metrics must breach 3σ in one window to count as multi-metric — two or three?
- what is the minimum correlation threshold before the harness assumes common cause?
