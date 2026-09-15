---
provenance:
  source: ecc:security-reviewer
  upstream: https://github.com/affaan-m/everything-claude-code
  borrowed_at: 2026-09-11
  verified: 2026-09-15
  license: MIT (Copyright (c) 2026 Affaan Mustafa)
  full_catalog: install ecc for the complete security-review reference
---

# Default security baseline (OWASP Top 10 + extras)

## A01 — Broken Access Control

- Default deny
- Verify authorization on every request
- No client-side enforcement of access control

## A02 — Cryptographic Failures

- TLS 1.2+ only
- No sensitive data in URLs or logs
- Use vetted libraries (don't roll your own crypto)

## A03 — Injection

- Parameterized queries (no string concatenation)
- Output encoding for HTML/JS/SQL
- Validate input at the edge

## A04 — Insecure Design

- Threat model for new features
- Least privilege by default
- Defense in depth

## A05 — Security Misconfiguration

- No default credentials
- Disable unused features
- Security headers on all responses

## A06 — Vulnerable Components

- Dependabot / npm audit / equivalent
- Patch within 7 days for critical CVEs

## A07 — Authentication Failures

- Rate limit authentication endpoints
- MFA for high-value accounts
- Session timeout: ≤24h idle, ≤7d absolute

## A08 — Software & Data Integrity

- Verify signatures on dependencies
- Signed releases
- Audit CI/CD pipeline

## A09 — Logging & Monitoring

- Log authentication events
- Log access control failures
- Alert on anomalies

## A10 — SSRF

- Validate outbound URLs
- Block internal network ranges

## Secrets

- No secrets in code, logs, or commit messages
- Use secret manager (e.g., AWS Secrets Manager, Vault)
- Rotate credentials regularly
