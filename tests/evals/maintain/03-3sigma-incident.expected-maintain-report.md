---
title: Maintain cycle — 3σ incident evaluation
status: rejected
cycle: 44
date: 2026-09-14
bandsPath: bands.yaml
evaluationWindow: 24h
trigger: auto-incident
metrics:
  - name: error_rate
    baseline: 0.01
    current: 0.018
    band: 1sigma
    action: log
  - name: auth_error_rate
    baseline: 0.01
    sigma_3: 0.05
    current: 0.18
    band: 3sigma
    action: block_maintain_exit
incidents:
  - id: INC-2401
    metric: auth_error_rate
    severity: 3sigma
    summary: "auth_error_rate crossed the 3σ threshold three times in 24 hours"
followups: []
---

# Maintain: 3σ incident (auto-intent)

## User story

As on-call engineer, I want a 3σ incident evaluation to block maintain-exit and produce an auto-generated intent.md so that the JWKS rotation bug becomes the next cycle's work without manual triage delay.

## Context

This is a 3σ incident evaluation. The auth_error_rate metric has crossed the 3σ band three times in the last 24 hours. The bands.yaml policy is `on_3sigma: block_maintain_exit`, so maintain-exit is blocked. The maintain harness invokes superpowers:systematic-debugging and wraps the findings in a new intent.md with `origin: maintain/3σ-bands.yaml:auth_error_rate`. The new intent starts the next cycle at Plan.

## expected scope

- block maintain-exit on the 3σ breach.
- invoke superpowers:systematic-debugging for root-cause analysis.
- produce a new intent.md with the incident origin marker.
- close the current maintain cycle once the new intent is accepted.

## Constraints

- block maintain exit on any 3σ breach — no override.
- new intent.md must reference the upstream metric name.
- maintain cycle closure waits for the new intent to be accepted.

## Open questions

- Should multiple concurrent 3σ breaches produce separate intents or one consolidated intent?
- how long should the auto-intent remain in draft before escalation?
