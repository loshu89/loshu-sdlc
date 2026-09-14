# Maintain: 3σ incident (auto-intent)

## User story

As on-call engineer, I want a 3σ incident evaluation to block maintain-exit and produce an auto-generated intent.md so that the JWKS rotation bug becomes the next cycle's work without manual triage delay.

## Context

This is a 3σ incident evaluation. The auth_error_rate metric has crossed the 3σ band three times in the last 24 hours. The bands.yaml policy is `on_3sigma: block_maintain_exit`, so maintain-exit is blocked. The maintain harness invokes superpowers:systematic-debugging and wraps the findings in a new intent.md with `origin: maintain/3σ-bands.yaml:auth_error_rate`. The new intent starts the next cycle at Plan.

## Expected scope

- Block maintain-exit on the 3σ breach.
- Invoke superpowers:systematic-debugging for root-cause analysis.
- Produce a new intent.md with the incident origin marker.
- Close the current maintain cycle once the new intent is accepted.

## Constraints

- Block maintain exit on any 3σ breach — no override.
- New intent.md must reference the upstream metric name.
- Maintain cycle closure waits for the new intent to be accepted.

## Open questions

- Should multiple concurrent 3σ breaches produce separate intents or one consolidated intent?
- How long should the auto-intent remain in draft before escalation?
