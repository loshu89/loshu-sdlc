---
title: REST v1 API sunset plan
status: draft
intent: ../plan/08-framework-migration.expected-intent.md
date: 2026-09-14
architecture: "structured sunset of the v1 REST API over 12 months. Four phases: announce, deprecate, remind, cut. Announce publishes migration guide, emails partners, displays deprecation banner. Deprecate adds Deprecation and Sunset HTTP headers, starts per-partner tracking. Remind sends targeted reminders at month 9 and month 11. Cut returns 410 Gone with migration pointer."
verificationCriteria:
  - "all v1 responses include Deprecation and Sunset headers during deprecation"
  - "per-partner v1 traffic dashboard published internally"
  - "migration reminders sent at month 9 and month 11 to every partner still on v1"
  - "every v1 request returns 410 Gone with migration pointer after cutoff"
---

# Design: Deprecation plan (REST v1 API sunset)

## User story

As platform owner, I want a documented deprecation and sunset plan for the v1 REST API so that partners have 12 months to migrate to v2 before v1 traffic is rejected.

## Context

This is a deprecation plan. The v2 REST API has been generally available for nine months and adoption has crossed 80% of active partners. We need a structured sunset of v1: an announcement, a deprecation header, a monitoring period, and a hard cutoff. Partners still on v1 at cutoff will receive a 410 Gone response with a pointer to migration docs.

## Expected scope

- announce v1 sunset via partners email and a deprecation banner in the developer console.
- add Deprecation and Sunset HTTP headers to all v1 responses.
- track per-partner v1 traffic; send targeted migration reminders at month 9 and month 11.
- cut over to 410 Gone at the end of month 12.

## Constraints

- 12-month deprecation window from announcement to cutoff.
- no surprise cutoffs: every partner on v1 must have at least three notifications.
- migration guide and code samples must be available before announcement.

## Open questions

- Final cutoff date — anniversary of the v2 GA or calendar quarter end?
- what is the minimum acceptable partner adoption at month 9 to proceed?
