---
title: In-app messaging
status: draft
intent: ../plan/03-vague-bug-report.expected-intent.md
date: 2026-09-14
architecture: "full-stack feature spanning UI and backend. Messaging surface inside the application shell with thread list, message pane, composer, and realtime delivery. Backend persists messages, broadcasts over websocket, ties into the existing ticket system. Frontend renders thread list, message pane, composer, and unread badge."
ui:
  palette: "existing brand palette"
  typography: "existing 14/16/20/24 px scale"
  a11y: "WCAG 2.1 AA, keyboard navigation, ARIA live regions"
  breakpoints: "thread list collapses below 768 px to a top selector"
apiSurface:
  - method: GET
    path: /api/messaging/threads
    description: "list threads"
    auth: session
verificationCriteria:
  - "realtime delivery p95 under 300 ms"
  - "messages persisted with at-least-once semantics"
  - "unread badge updates within 1 s of a new message"
---

# Design: Full-stack feature (In-app messaging)

## User story

As a customer, I want to send messages to support from inside the application and receive replies in the same surface, so that I do not have to switch to email and lose context when reporting issues.

## Context

This is a full-stack feature spanning UI and backend. We are building a messaging surface inside the application shell with a thread list, message pane, composer, and realtime delivery. The backend persists messages, broadcasts over websocket, and ties into the existing ticket system. The frontend renders the thread list, message pane, composer, and unread badge.

## Expected scope

- thread list view, message pane view, composer component.
- REST endpoints for thread CRUD and message history.
- webSocket channel for realtime delivery.
- unread count badge in the app header.

## Constraints

- realtime delivery p95 under 300 ms.
- messages persisted with at-least-once semantics.
- WCAG 2.1 AA for the messaging surface.

## Open questions

- Should attachments be supported in v1?
- push notification integration scope?
