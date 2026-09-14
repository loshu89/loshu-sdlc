---
title: Notification router microservice
status: draft
intent: ../plan/05-performance-optimization.expected-intent.md
date: 2026-09-14
architecture: "dedicated notification router microservice. Subscribes to a Kafka topic of business events, looks up per-user notification preferences, and fans out to email, SMS, push, and webhook channels. Idempotent using idempotency keys, retries per channel with schedule 30s, 2m, 10m, dead-letters on terminal failure."
apiSurface:
  - method: POST
    path: /internal/notify
    description: "enqueue a notification request"
    auth: api-key
  - method: GET
    path: /healthz
    description: "liveness probe"
    auth: none
dataModel:
  - name: notification preference
    fields:
      - "user_id (fk, pk)"
      - "channel (enum: email, sms, push, webhook)"
      - "enabled (bool)"
verificationCriteria:
  - "at-least-once delivery with idempotency keys verified by replay test"
  - "per-user preference lookup p95 under 20 ms"
  - "per-channel rate limiter enforces limits under burst"
---

# Design: Microservice design (Notification router)

## User story

As a platform engineer, I want a dedicated notification router microservice that fans out events to email, SMS, push, and webhook channels based on per-user preferences, so that business services can fire events without knowing the delivery mechanics.

## Context

This is a microservice design exercise. We are designing a new dedicated service that owns notification routing logic. Business services publish events to a topic; the router subscribes, looks up per-user preferences, and dispatches to the configured channels. Channels include email, SMS, push, and webhook. The router must be idempotent and survive transient downstream failures.

## Expected scope

- subscribe to a Kafka topic.
- look up per-user notification preferences.
- fan out to email, SMS, push, and webhook channels.
- idempotency keys to dedupe replays.
- per-channel retry with dead-letter.

## Constraints

- at-least-once delivery with idempotency keys.
- per-channel rate limiting.
- per-user preference lookup under 20 ms p95.

## Open questions

- Where do per-user preferences live — separate service or Postgres?
- push channel provider — APNs, FCM, both?
