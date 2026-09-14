# Deploy: Standard green deploy (OAuth authentication)

## User story

As release manager, I want a routine green deploy of the OAuth authentication feature to production so that enterprise customers can begin signing in with Google and GitHub this week.

## Context

This is a standard green deploy. The OAuth authentication feature has passed all stage gates: build green, tests green, lint green, typecheck green, REVIEW.md sections all status pass. The deploy will follow our standard progressive rollout: 1% canary, 10% canary, 50% canary, 100% production, with a 30-minute soak at each stage. Rollback criteria are defined ahead of time.

## Expected scope

- Promote the OAuth build through canary stages: 1%, 10%, 50%, 100%.
- Soak 30 minutes at each stage.
- Watch auth_error_rate metric for the full duration.
- Mark REVIEW.md as accepted after a successful 100% rollout.

## Constraints

- Rollback if auth_error_rate exceeds 3σ during any stage.
- No deploy during peak hours (09:00–17:00 UTC).
- Maintainer on-call must ack the deploy start.

## Open questions

- Specific canary duration per stage — 30 minutes enough?
- Who is on-call this week?
