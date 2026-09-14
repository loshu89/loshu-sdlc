---
title: Add caching layer
status: draft
cycle: 1
author: B. Singh
problem: "Catalog service is read-heavy; read replicas saturate during flash sales. Add a Redis caching layer with write-through semantics to offload read traffic."
proposedOutcome: "Redis-backed cache layer in front of catalog service read path. Write-through semantics, stampede protection, configurable TTL per resource type."
affectedUsersAndSystems:
  - "Product catalog service"
  - "Postgres primary"
  - "Redis cluster"
  - "Read replicas"
  - "Internal consumers of the catalog API"
constraints:
  - "Cache must be optional — service must still work if Redis is down (degraded mode reads from Postgres)"
  - "No changes to existing public API contract"
  - "P99 latency for cached reads under 5 ms"
openQuestions:
  - "Eviction policy: LRU vs LFU?"
  - "Per-tenant cache isolation or shared?"
---

# Intent: Add caching layer

## User story

As a platform engineer, I want to add a write-through Redis caching layer in front of the product catalog service so that read traffic for popular SKUs stops hammering Postgres during flash sales.

## Context

The product catalog service is read-heavy, and the existing read replicas are saturated during promotional events.

This is an edge case because the catalog service is the only place we have authoritative cache invalidation requirements, and the existing service has no cache primitive. We need to add cache stampede protection because flash sales trigger burst reads on a small set of SKUs. The current read path is direct Postgres access via the catalog service with no in-memory or distributed cache. Adding a Redis caching layer with write-through semantics will offload the read traffic. Edge cases include stale cache after writes, concurrent cache fills for the same key, and eviction during traffic spikes.

## Expected scope

- Add a Redis-backed cache layer in front of the catalog service read path.
- Write-through semantics: writes update Postgres and the cache atomically.
- Cache stampede protection via single-flight or request coalescing.
- Configurable TTL per resource type.

## Constraints

- Cache must be optional — service must still work if Redis is down (degraded mode reads from Postgres).
- No changes to existing public API contract.
- P99 latency for cached reads must be under 5 ms.

## Open questions

- Eviction policy: LRU vs LFU.
- Per-tenant cache isolation or shared.
