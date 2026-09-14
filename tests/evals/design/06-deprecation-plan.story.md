# Design: Deprecation plan (REST v1 API sunset)

## User story

As platform owner, I want a documented deprecation and sunset plan for the v1 REST API so that partners have 12 months to migrate to v2 before v1 traffic is rejected.

## Context

This is a deprecation plan. The v2 REST API has been generally available for nine months and adoption has crossed 80% of active partners. We need a structured sunset of v1: an announcement, a deprecation header, a monitoring period, and a hard cutoff. Partners still on v1 at cutoff will receive a 410 Gone response with a pointer to migration docs.

## Expected scope

- Announce v1 sunset via partners email and a deprecation banner in the developer console.
- Add Deprecation and Sunset HTTP headers to all v1 responses.
- Track per-partner v1 traffic; send targeted migration reminders at month 9 and month 11.
- Cut over to 410 Gone at the end of month 12.

## Constraints

- 12-month deprecation window from announcement to cutoff.
- No surprise cutoffs: every partner on v1 must have at least three notifications.
- Migration guide and code samples must be available before announcement.

## Open questions

- Final cutoff date — anniversary of the v2 GA or calendar quarter end?
- What is the minimum acceptable partner adoption at month 9 to proceed?
