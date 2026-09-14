---
title: E2E-heavy test plan — in-app messaging
status: draft
spec: ../design/03-full-stack-feature.expected-spec.md
date: 2026-09-14
methodology: e2e
runner: playwright
discipline:
  - "full stack exercised via docker-compose"
  - "WebSocket subscription asserts realtime delivery"
  - "persistence asserted across page reload"
coverage:
  line: 80
  branch: 75
testLayers:
  - e2e-browser
  - e2e-api
  - e2e-realtime
verification:
  build: "pnpm build"
  test: "pnpm test"
  lint: "pnpm lint"
  typecheck: "pnpm typecheck"
---

# Test: E2E-heavy (In-app messaging)

## User story

As QA lead, I want comprehensive end-to-end coverage of the in-app messaging surface so that the full thread lifecycle is exercised through the browser, the API, and the WebSocket channel in one continuous test.

## Context

This is an E2E-heavy test plan. The in-app messaging feature is best validated end-to-end because the value is in the full path: open the app, send a message, observe realtime delivery in another tab, persist across reload. We will use Playwright to drive the browser, hit the REST API directly where useful, and subscribe to the WebSocket channel to assert realtime events.

## expected scope

- playwright suite covering full thread lifecycle.
- cross-tab realtime delivery assertions via WebSocket.
- persistence across page reload.
- attachments and push notifications deferred to v2.

## Constraints

- suite runs against a docker-compose'd stack: app, postgres, redis, kafka.
- total suite runtime under 5 minutes.
- one test per scenario, deterministic ordering via fixtures.

## Open questions

- Where to source test users — seed script or factory?
- cross-tab strategy: shared context or separate browser contexts?
