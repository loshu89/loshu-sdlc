---
title: Unified customer 360 view
status: draft
cycle: 1
author: F. Mensah (product)
problem: "Account managers lack a single source of truth for every customer relationship. Profile data lives in CRM, support tickets in helpdesk, billing history in Stripe, and product usage events in the analytics warehouse."
proposedOutcome: "Unified customer 360 view in the internal admin tool pulls profile data from CRM, support tickets from helpdesk, billing history from Stripe, and product usage events from the analytics warehouse via a federated query layer."
affectedUsersAndSystems:
  - "Internal admin tool"
  - "CRM"
  - "Helpdesk"
  - "Stripe billing"
  - "Analytics warehouse"
  - "Account managers"
constraints:
  - "Each upstream team keeps ownership of their source data"
  - "No PII duplication outside the existing access-controlled store"
  - "P95 page load under 1.5 s"
openQuestions:
  - "Where does unified entity resolution live — identity service, CRM, or new microservice?"
  - "Which team owns the federated query layer long-term?"
---

# Intent: Unified customer 360 view

## User story

As VP of product, I want a unified customer 360 view that pulls profile data from CRM, support tickets from the helpdesk, billing history from Stripe, and product usage events from our analytics warehouse, so that account managers have a single source of truth for every customer relationship.

## Context

This is a multi-team feature spanning CRM, support, billing, and product analytics. Each upstream team owns a different system with its own data model, refresh cadence, and access controls. Coordination across product, engineering, data, security, and legal is required. We need a single ingestion contract and a federated query layer to assemble the 360 view without forcing every team to expose their data through a single warehouse.

## Expected scope

- A unified customer 360 page in the internal admin tool.
- Federated query layer that pulls from CRM, helpdesk, Stripe, and the analytics warehouse.
- Per-source refresh cadences (CRM near-real-time, helpdesk hourly, billing daily, product usage stream).
- Access control enforced per source via existing team RBAC.

## Constraints

- Each upstream team keeps ownership of their source data.
- No PII duplication outside the existing access-controlled store.
- P95 page load under 1.5 s.

## Open questions

- Where does the unified entity resolution live — identity service, CRM, or new microservice.
- Which team owns the federated query layer long-term.
