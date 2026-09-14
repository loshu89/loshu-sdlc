# Deploy: Rollback scenario (Customer 360 view)

## User story

As release manager, I want a clean rollback procedure for the customer 360 view so that if the federated query layer misbehaves in production we can revert to the previous version within 5 minutes.

## Context

This is a rollback scenario. The customer 360 view shipped to 50% production and the federated query layer is producing slow responses, exceeding the 1.5 s p95 target. We are exercising the rollback procedure: identify the previous good build, redeploy it to 100% of production, verify metrics recover, and write up the post-mortem.

## Expected scope

- Identify the last known-good build of the customer 360 view.
- Redeploy to 100% production via the standard rollback command.
- Verify p95 page load recovers to under 1.5 s within 5 minutes.
- Write post-mortem with root cause and follow-up actions.

## Constraints

- Rollback window of 5 minutes or less.
- No data loss — federated query layer is read-only against upstreams.
- Post-mortem filed within 48 hours.

## Open questions

- Should the federated query layer have a circuit breaker per upstream?
- Per-source timeout budget — uniform or per upstream?
