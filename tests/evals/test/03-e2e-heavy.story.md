# Test: E2E-heavy (In-app messaging)

## User story

As QA lead, I want comprehensive end-to-end coverage of the in-app messaging surface so that the full thread lifecycle is exercised through the browser, the API, and the WebSocket channel in one continuous test.

## Context

This is an E2E-heavy test plan. The in-app messaging feature is best validated end-to-end because the value is in the full path: open the app, send a message, observe realtime delivery in another tab, persist across reload. We will use Playwright to drive the browser, hit the REST API directly where useful, and subscribe to the WebSocket channel to assert realtime events.

## Expected scope

- Playwright suite covering full thread lifecycle.
- Cross-tab realtime delivery assertions via WebSocket.
- Persistence across page reload.
- Attachments and push notifications deferred to v2.

## Constraints

- Suite runs against a docker-compose'd stack: app, postgres, redis, kafka.
- Total suite runtime under 5 minutes.
- One test per scenario, deterministic ordering via fixtures.

## Open questions

- Where to source test users — seed script or factory?
- Cross-tab strategy: shared context or separate browser contexts?
