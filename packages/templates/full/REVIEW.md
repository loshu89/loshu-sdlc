---
id: <%= reviewId %>
schema_version: 0.5.0
cycle_id: 1
stage: deploy
state: draft
created_by: <%= createdBy %>
created_at: <%= today %>
title: <%= projectName %>
bugs:
  status: pending
security:
  status: pending
compliance:
  status: pending
---

# Review: <First feature>

## Bugs

Status: pending
Findings: [populated by /sdlc-deploy via ecc:code-reviewer]

## Security

Status: pending
Findings: [populated by /sdlc-deploy via ecc:security-reviewer]

## Compliance

Status: pending
Findings: [populated by /sdlc-deploy via policy-default/]
