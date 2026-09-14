---
title: Rollback scenario — customer 360 view
status: rejected
spec: ../design/03-full-stack-feature.expected-spec.md
plan: ../build/02-brownfield-existing-code.expected-plan.md
date: 2026-09-14
bugs:
  status: fail
  findings:
    - "federated query layer exceeds 1.5 s p95 target at 50% production"
security:
  status: pass
  owasp: []
  findings:
    - "no security regressions observed"
compliance:
  status: pass
  findings:
    - "no PII duplication outside the access-controlled store"
---

# Deploy: Rollback scenario (Customer 360 view)

## User story

As release manager, I want a clean rollback procedure for the customer 360 view so that if the federated query layer misbehaves in production we can revert to the previous version within 5 minutes.

## Context

This is a rollback scenario. The customer 360 view shipped to 50% production and the federated query layer is producing slow responses, exceeding the 1.5 s p95 target. We are exercising the rollback procedure: identify the previous good build, redeploy it to 100% of production, verify metrics recover, and write up the post-mortem.

## expected scope

- identify the last known-good build of the customer 360 view.
- redeploy to 100% production via the standard rollback command.
- verify p95 page load recovers to under 1.5 s within 5 minutes.
- write post-mortem with root cause and follow-up actions.

## Constraints

- rollback window of 5 minutes or less.
- no data loss — federated query layer is read-only against upstreams.
- post-mortem filed within 48 hours.

## Open questions

- Should the federated query layer have a circuit breaker per upstream?
- per-source timeout budget — uniform or per upstream?
