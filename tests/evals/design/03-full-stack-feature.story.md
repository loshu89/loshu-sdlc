# Design: Full-stack feature (In-app messaging)

## User story

As a customer, I want to send messages to support from inside the application and receive replies in the same surface, so that I do not have to switch to email and lose context when reporting issues.

## Context

This is a full-stack feature spanning UI and backend. We are building a messaging surface inside the application shell with a thread list, message pane, composer, and realtime delivery. The backend persists messages, broadcasts over websocket, and ties into the existing ticket system. The frontend renders the thread list, message pane, composer, and unread badge.

## Expected scope

- Thread list view, message pane view, composer component.
- REST endpoints for thread CRUD and message history.
- WebSocket channel for realtime delivery.
- Unread count badge in the app header.

## Constraints

- Realtime delivery p95 under 300 ms.
- Messages persisted with at-least-once semantics.
- WCAG 2.1 AA for the messaging surface.

## Open questions

- Should attachments be supported in v1?
- Push notification integration scope?
