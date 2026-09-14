# Design: UI-only feature (Settings page redesign)

## User story

As end user, I want the settings page reorganized into a sidebar navigation with a content panel, so that I can find privacy, notifications, billing, and integrations sections quickly without scrolling through a single long form.

## Context

This is a UI-only feature. The backend already exposes the settings endpoints; we are reorganizing the presentation layer. The current settings page is a single long form. The new layout will use a sidebar navigation on the left and a content panel on the right. The sidebar items are: Profile, Privacy, Notifications, Billing, Integrations, Danger zone.

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
