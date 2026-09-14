# Design: Microservice design (Notification router)

## User story

As a platform engineer, I want a dedicated notification router microservice that fans out events to email, SMS, push, and webhook channels based on per-user preferences, so that business services can fire events without knowing the delivery mechanics.

## Context

This is a microservice design exercise. We are designing a new dedicated service that owns notification routing logic. Business services publish events to a topic; the router subscribes, looks up per-user preferences, and dispatches to the configured channels. Channels include email, SMS, push, and webhook. The router must be idempotent and survive transient downstream failures.

## Expected scope

- Subscribe to a Kafka topic.
- Look up per-user notification preferences.
- Fan out to email, SMS, push, and webhook channels.
- Idempotency keys to dedupe replays.
- Per-channel retry with dead-letter.

## Constraints

- At-least-once delivery with idempotency keys.
- Per-channel rate limiting.
- Per-user preference lookup under 20 ms p95.

## Open questions

- Where do per-user preferences live — separate service or Postgres?
- Push channel provider — APNs, FCM, both?
