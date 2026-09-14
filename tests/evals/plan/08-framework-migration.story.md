# Plan: Migration to new framework (deprecation)

## User story

As engineering lead, I want to migrate the customer-facing dashboard from Next.js 13 to Next.js 15 over the course of two quarters, so that we can drop our workaround for the parallel routes bug and adopt React Server Components end to end. Next.js 13 reaches end of support in Q2 next year and we want to be off it well before then.

## Context

This is a deprecation-driven migration. Next.js 13 is approaching end of support, and the parallel routes bug forces us to ship a custom workaround. Next.js 15 fixes the parallel routes bug and unlocks React Server Components end to end. The migration must be incremental: we cannot freeze feature work for two quarters. We will use the Next.js codemod for app-router upgrades, run both routers side by side during the transition, and retire the pages-router routes one folder at a time.

## Expected scope

- Incremental Next.js 13 to Next.js 15 migration, app-router first.
- Codemod-driven upgrade with manual review per route group.
- Dual-router support during transition.
- Retire pages-router routes folder by folder.

## Constraints

- No freeze on feature work; both routers ship features during migration.
- Existing tests must continue to pass throughout.
- Roll-forward only — no rollback to Next.js 13 once a route group is on 15.

## Open questions

- Which route groups migrate first?
- Do we keep a small Next.js 13 escape hatch for the last quarter?
