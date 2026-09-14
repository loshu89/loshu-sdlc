---
title: Hotfix deploy — JWKS rotation
status: accepted
spec: ../design/02-backend-only-feature.expected-spec.md
plan: ../build/02-brownfield-existing-code.expected-plan.md
date: 2026-09-14
bugs:
  status: pass
  findings:
    - "no blocking bugs found"
security:
  status: pass
  owasp: []
  findings:
    - "rotation overlap window correctly bounded"
compliance:
  status: pass
  findings:
    - "SOC2 audit trail required and emitted"
---

# Deploy: Hotfix (JWKS rotation)

## User story

As on-call engineer, I want the JWKS rotation fix deployed as an emergency hotfix so that we stop rejecting valid bearer tokens during rotation windows.

## Context

This is a hotfix deploy. The JWKS rotation bug is causing a customer-visible spike in 401 responses during key rotation. Severity is high: enterprise customers are seeing intermittent auth failures. The fix is contained to the auth service, has been validated by an automated end-to-end test that simulates a full rotation, and ships behind a feature flag for instant disable if needed.

## expected scope

- skip canary stages: promote directly to 100% on the auth service.
- watch auth_error_rate metric for 60 minutes post-deploy.
- feature flag remains available to disable the fix instantly.

## Constraints

- hotfix window only; no other changes ride along.
- rollback plan tested in staging prior to the hotfix.
- maintainer on-call must ack the hotfix start.

## Open questions

- Do we want to overlap two or three keys during normal operation?
- How is the rotation cadence configured: runtime, file, env var?
