# Plan: Performance optimization (perf-sensitive)

## User story

As a user of the analytics page, I want charts to render within 200 ms even when the page contains more than 50 widgets, so that the page feels responsive and analysts do not abandon slow dashboards. Today the analytics page renders slowly because every chart runs an expensive aggregation against the warehouse on mount.

## Context

This is a performance-sensitive change. The current analytics page mounts all widgets synchronously, each issuing a full aggregation query. The bottleneck is the synchronous aggregation path. We will introduce pre-aggregation tables, server-side rendering of widget shells, and progressive hydration of chart bodies. The change is perf-sensitive because regressions would degrade the user experience immediately and visibly across the whole analytics surface.

## Expected scope

- Pre-aggregation tables refreshed every 5 minutes for top-N widgets.
- Server-side rendering of widget shells.
- Progressive hydration of chart bodies.
- P95 time-to-interactive under 800 ms with 50 widgets on the page.

## Constraints

- No regression on existing chart accuracy.
- Pre-aggregation must not exceed 50 GB of warehouse storage.
- All changes must be feature-flag gated so we can roll back instantly.

## Open questions

- Which aggregation library to use for pre-aggregation — Cube, dbt, or bespoke SQL?
- Refresh cadence per metric or uniform 5 minutes?
