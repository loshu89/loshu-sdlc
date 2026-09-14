---
title: PII encryption at rest
status: draft
cycle: 1
author: D. Liu (security)
problem: "PII fields in the customer database are stored in plaintext. SOC2 Type II and GDPR data-protection requirements demand envelope encryption with managed KMS, transparent to existing application code paths."
proposedOutcome: "Envelope encryption protects designated PII columns (name, email, phone, ssn) at rest, with per-row data encryption keys wrapped by a customer master key in the managed KMS. Read and write paths remain transparent to existing application code."
affectedUsersAndSystems:
  - "Customer database"
  - "Application read/write paths"
  - "Managed KMS"
  - "Audit log"
  - "SOC2 audit team"
constraints:
  - "SOC2 Type II compliant key management"
  - "GDPR Article 32 compliant encryption at rest"
  - "KMS operations must be rate-limited and audit-logged"
  - "Ciphertext storage must not exceed 2x plaintext storage"
openQuestions:
  - "Rotation cadence for DEKs and CMK?"
  - "Migration strategy for existing plaintext rows — online or maintenance window?"
---

# Intent: PII encryption at rest

## User story

As head of security, I want personally identifiable information (PII) fields in our customer database to be encrypted at rest with envelope encryption using a managed KMS, so that we can pass SOC2 Type II audit and meet GDPR data-protection requirements. The encryption must be transparent to existing application code paths.

## Context

This is a compliance-driven, security-sensitive feature. SOC2 Type II and GDPR require that PII be encrypted at rest with strong key management. Our current customer database stores PII fields in plaintext columns. We will adopt envelope encryption: each row uses a data encryption key (DEK) wrapped by a customer master key (CMK) held in the managed KMS. The application code must continue to work without code changes for read paths.

## Expected scope

- Envelope encryption for designated PII columns: name, email, phone, ssn.
- DEK per row wrapped by a CMK in the managed KMS.
- Transparent read/write through a Prisma middleware or equivalent.
- Audit log entries for every KMS operation.

## Constraints

- SOC2 Type II compliant key management.
- GDPR Article 32 compliant encryption at rest.
- KMS operations must be rate-limited and audit-logged.
- Ciphertext storage must not exceed 2x plaintext storage.

## Open questions

- Rotation cadence for DEKs and CMK.
- Migration strategy for existing plaintext rows — online or maintenance window.
