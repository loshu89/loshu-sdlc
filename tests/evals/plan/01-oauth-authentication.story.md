# Plan: OAuth authentication (happy path)

## User story

As a product owner, I want end users to sign in with Google and GitHub in addition to the existing email and password flow, so that enterprise customers who require SSO can adopt the platform without forcing their staff to maintain a separate set of credentials.

## Context

We currently authenticate users with email and password only. Several enterprise prospects have indicated that they will not adopt the platform until we support OAuth via Google and GitHub. The new flow must coexist with the existing email and password authentication — neither method replaces the other.

The work is well understood, the security model is conventional, and the affected systems are limited to the login UI, session middleware, and account service.

## Expected scope

- Add OAuth providers: Google and GitHub.
- Keep existing email and password authentication working.
- Existing password hashes must remain valid.
- Audit log entries must be emitted for every successful and failed OAuth login.

## Constraints

- GDPR-compliant session storage.
- SOC2 audit trail required for authentication events.
- Tokens must be revocable.

## Open questions

- Token rotation policy (refresh token TTL)?
- Account linking rules when a user signs up with OAuth using an email that already exists via password?
