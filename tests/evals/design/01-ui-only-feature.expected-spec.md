---
title: Settings page redesign
status: draft
intent: ../plan/01-oauth-authentication.expected-intent.md
date: 2026-09-14
architecture: "UI-only feature. Backend already exposes the settings endpoints. Single-page settings UI with sidebar navigation on the left and content panel on the right. Existing backend endpoints are reused without modification."
ui:
  palette: "neutral slate, accent indigo"
  typography: "Inter at 14/16/20/24 px scale"
  a11y: "WCAG 2.1 AA, full keyboard navigation, ARIA landmarks"
  breakpoints: "sidebar collapses below 768 px to top nav"
verificationCriteria:
  - "All sections reachable via deep links"
  - "Sidebar navigation passes keyboard-only walkthrough"
  - "Light and dark themes render with no contrast violations"
  - "Existing keyboard shortcuts continue to work"
---

# Design: UI-only feature (Settings page redesign)

## User story

As end user, I want the settings page reorganized into a sidebar navigation with a content panel, so that I can find privacy, notifications, billing, and integrations sections quickly without scrolling through a single long form.

## Context

This is a UI-only feature. The backend already exposes the settings endpoints; we are reorganizing the presentation layer. The current settings page is a single long form. The new layout will use a sidebar navigation on the left and a content panel on the right. The sidebar items are: profile, Privacy, Notifications, Billing, Integrations, Danger zone.

## Expected scope

- Sidebar navigation for the settings page.
- Content panel rendering each section.
- Preserve existing keyboard shortcuts.
- All sections remain reachable via deep links.

## Constraints

- WCAG 2.1 AA compliance.
- Light and dark theme parity.
- No new backend dependencies.

## Open questions

- Should the sidebar collapse on mobile or move to a top nav?
- Persist sidebar collapsed state per-user or per-device?
