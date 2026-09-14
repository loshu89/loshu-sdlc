---
title: Webhooks v2 API
status: draft
intent: ../plan/02-caching-layer.expected-intent.md
date: 2026-09-14
architecture: "backend-only API. v2 webhooks API alongside existing v1 endpoint. HMAC-SHA256 signed payloads, exponential backoff retries (max 5 attempts), dead-letter queue for failures, and per-subscription event filters."
apiSurface:
  - method: POST
    path: /v2/webhooks/subscriptions
    description: "subscription management"
    auth: oauth
  - method: POST
    path: /v2/webhooks/events
    description: "outbound event dispatch"
    auth: oauth
dataModel: []
verificationCriteria:
  - "p99 dispatch latency under 500 ms"
  - "Exponential backoff retry schedule: 1m, 5m, 30m, 2h, 12h"
  - "Dead-letter after 5 failed attempts"
  - "HMAC-SHA256 signature header verifies"
---

# Design: Backend-only feature (Webhooks v2 API)

## User story

As an integration partner, I want a versioned webhooks API that supports retries with exponential backoff and signed payloads, so that my downstream systems receive reliable event delivery without polling.

## Context

This is a backend-only feature. There is no UI change. We are introducing a v2 webhooks API alongside the existing v1 endpoint. The v2 API adds: payload signing with HMAC-SHA256, exponential backoff retries (max 5 attempts), dead-letter queue for failures, and per-subscription event filters.

## Expected scope

- POST /v2/webhooks/subscriptions for subscription management.
- POST /v2/webhooks/events for outbound event dispatch.
- Exponential backoff retry: 1m, 5m, 30m, 2h, 12h.
- Dead-letter queue with manual replay endpoint.
- HMAC-SHA256 signature header.

## Constraints

- Backward compatible with v1 subscribers.
- no event payload shape changes for existing events.
- p99 dispatch latency under 500 ms.

## Open questions

- per-subscription vs global event filter configuration?
- replay endpoint authorization model?
