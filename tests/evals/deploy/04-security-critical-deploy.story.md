# Deploy: Security-critical deploy (PII encryption)

## User story

As head of security, I want a security-critical deploy of the PII encryption feature so that we can pass the SOC2 Type II audit next quarter and meet GDPR Article 32 requirements.

## Context

This is a security-critical deploy. The PII encryption feature encrypts designated customer data fields at rest with envelope encryption and a managed KMS. The deploy must be coordinated with the security team, the SOC2 auditor, and the DBA on-call because existing plaintext rows will be migrated online. A rollback plan is required before the deploy begins.

## Expected scope

- Deploy the PII encryption migration in waves: 1%, 10%, 50%, 100% of rows.
- Verify ciphertext storage stays within 2x plaintext.
- SOC2 auditor observes the deploy.
- Rollback plan documented and rehearsed in staging.

## Constraints

- Existing application code paths must continue to work throughout the migration.
- KMS operations must be rate-limited and audit-logged.
- Rollback window of 30 minutes or less.

## Open questions

- Rotation cadence for DEKs and CMK?
- Migration strategy for existing plaintext rows: online or maintenance window?
