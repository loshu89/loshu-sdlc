# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.4.x   | Yes (latest)       |
| 0.3.x   | Critical fixes     |
| <0.3    | No                 |

## Reporting a Vulnerability

**Do not file a public GitHub issue for security vulnerabilities.**

Email **security@loshu89.dev** (or DM the maintainer if you can't email) with:
- Description of the vulnerability
- Reproduction steps
- Affected version(s)

We aim to acknowledge within 48 hours and provide a fix within 14 days for critical issues.

## Security Posture

- All packages published to GitHub Packages (npmjs.com publishing disabled)
- PAT for CI publish is rotated every 30 days
- No telemetry collection; `loshu-sdlc telemetry enable` is a no-op stub
- Hooks only run POSIX shell scripts; no untrusted JS execution
- See `docs/internal/publish-saga.md` for past incidents
