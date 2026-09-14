# Deploy: Hotfix (JWKS rotation)

## User story

As on-call engineer, I want the JWKS rotation fix deployed as an emergency hotfix so that we stop rejecting valid bearer tokens during rotation windows.

## Context

This is a hotfix deploy. The JWKS rotation bug is causing a customer-visible spike in 401 responses during key rotation. Severity is high: enterprise customers are seeing intermittent auth failures. The fix is contained to the auth service, has been validated by an automated end-to-end test that simulates a full rotation, and ships behind a feature flag for instant disable if needed.

## Expected scope

- Skip canary stages: promote directly to 100% on the auth service.
- Watch auth_error_rate metric for 60 minutes post-deploy.
- Feature flag remains available to disable the fix instantly.

## Constraints

- Hotfix window only; no other changes ride along.
- Rollback plan tested in staging prior to the hotfix.
- Maintainer on-call must ack the hotfix start.

## Open questions

- Do we want to overlap two or three keys during normal operation?
- How is the rotation cadence configured: runtime, file, env var?
