---
title: Standard green deploy — OAuth authentication
status: accepted
spec: ../design/01-ui-only-feature.expected-spec.md
plan: ../build/01-greenfield-project.expected-plan.md
date: 2026-09-14
bugs:
  status: pass
  findings:
    - "no blocking bugs found"
security:
  status: pass
  owasp: []
  findings:
    - "all auth checks passed"
compliance:
  status: pass
  findings:
    - "GDPR-compliant session storage verified"
    - "SOC2 audit trail required and emitted"
---

# Deploy: Standard green deploy (OAuth authentication)

## User story

As release manager, I want a routine green deploy of the OAuth authentication feature to production so that enterprise customers can begin signing in with Google and GitHub this week.

## Context

This is a standard green deploy. The OAuth authentication feature has passed all stage gates: build green, tests green, lint green, typecheck green, REVIEW.md sections all status pass. The deploy will follow our standard progressive rollout: 1% canary, 10% canary, 50% canary, 100% production, with a 30-minute soak at each stage. Rollback criteria are defined ahead of time.

## expected scope

- promote the OAuth build through canary stages: 1%, 10%, 50%, 100%.
- soak 30 minutes at each stage.
- watch auth_error_rate metric for the full duration.
- mark REVIEW.md as accepted after a successful 100% rollout.

## Constraints

- rollback if auth_error_rate exceeds 3σ during any stage.
- no deploy during peak hours (09:00–17:00 UTC).
- maintainer on-call must ack the deploy start.

## Open questions

- Specific canary duration per stage — 30 minutes enough?
- who is on-call this week?
