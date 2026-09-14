---
title: Security-critical deploy — PII encryption
status: accepted
spec: ../design/04-library-api.expected-spec.md
plan: ../build/03-library-packaging.expected-plan.md
date: 2026-09-14
bugs:
  status: pass
  findings:
    - "no blocking bugs found"
security:
  status: pass
  owasp: []
  findings:
    - "ciphertext size verified under 2x plaintext size"
    - "KMS operations rate-limited and audit-logged"
compliance:
  status: pass
  findings:
    - "SOC2 Type II compliant key management verified by auditor"
    - "GDPR Article 32 compliant encryption at rest confirmed"
---

# Deploy: Security-critical deploy (PII encryption)

## User story

As head of security, I want a security-critical deploy of the PII encryption feature so that we can pass the SOC2 Type II audit next quarter and meet GDPR Article 32 requirements.

## Context

This is a security-critical deploy. The PII encryption feature encrypts designated customer data fields at rest with envelope encryption and a managed KMS. The deploy must be coordinated with the security team, the SOC2 auditor, and the DBA on-call because existing plaintext rows will be migrated online. A rollback plan is required before the deploy begins.

## expected scope

- deploy the PII encryption migration in waves: 1%, 10%, 50%, 100% of rows.
- verify ciphertext storage stays within 2x plaintext.
- SOC2 auditor observes the deploy.
- rollback plan documented and rehearsed in staging.

## Constraints

- existing application code paths must continue to work throughout the migration.
- KMS operations must be rate-limited and audit-logged.
- rollback window of 30 minutes or less.

## Open questions

- rotation cadence for DEKs and CMK?
- migration strategy for existing plaintext rows: online or maintenance window?
