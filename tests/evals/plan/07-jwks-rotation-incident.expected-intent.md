---
title: Fix JWKS rotation bug
status: draft
cycle: 2
author: loshu-sdlc/maintain (incident INC-2401)
origin: maintain/3σ-bands.yaml:auth_error_rate
problem: "JWKS rotation logic publishes a new key after expiring the old key, creating a window where valid bearer tokens are rejected. The auth_error_rate metric breached the 3σ threshold three times in the last 24 hours."
proposedOutcome: "JWKS rotation publishes the new key before expiring the old one, with an overlap window. Existing tokens continue to work throughout rotation. Automated end-to-end tests assert no tokens are rejected during a simulated rotation."
affectedUsersAndSystems:
  - "Auth service"
  - "JWKS endpoint"
  - "API gateway"
  - "All bearer-token consumers"
  - "Observability stack"
constraints:
  - "No more than 30 seconds of overlap window to limit exposure"
  - "Existing tokens must continue to work throughout the rotation"
  - "Hotfix must be deployable without a database migration"
openQuestions:
  - "Should we overlap two or three keys during normal operation?"
  - "How is the rotation cadence configured — runtime, file, env var?"
---

# Intent: Fix JWKS rotation bug

## User story

As on-call engineer, I want to fix the JWKS rotation bug that triggered a 3σ incident on the auth_error_rate metric. The bands.yaml evaluation flagged three consecutive breaches of the 3σ threshold for auth_error_rate over the last 24 hours, indicating a systematic problem with key rotation rather than transient failure.

## Context

This is an incident-driven intent, auto-generated from `maintain/3σ-bands.yaml:auth_error_rate`. The auth service publishes its signing keys through a JWKS endpoint, but the rotation logic fails to publish the new key before the previous key expires. During the rotation window, valid bearer tokens are rejected, producing a spike in 401 responses. The 3σ threshold for auth_error_rate is 0.05; observed peak was 0.18.

## Expected scope

- Fix the rotation order: publish new key, then expire old key, with overlap window.
- Add automated end-to-end test that asserts no tokens are rejected during a simulated rotation.
- Add a metric for rotation overlap duration.
- Update runbook with the new procedure.

## Constraints

- No more than 30 seconds of overlap window to limit exposure.
- Existing tokens must continue to work throughout the rotation.
- Hotfix must be deployable without a database migration.

## Open questions

- Should we overlap two or three keys during normal operation.
- How is the rotation cadence configured — runtime, file, env var.
