---
name: review-md-authoring
description: How to populate REVIEW.md. Auto-loaded by /sdlc-deploy.
---

# Review authoring

A good `REVIEW.md` has three sections, each with `status: pass` or `status: fail`:

- **Bugs**: from `ecc:code-reviewer` (or loshu-sdlc native fallback)
- **Security**: from `ecc:security-reviewer` (OWASP-grounded)
- **Compliance**: from policy-default/ checks

## Status semantics

- `pass`: section is clean or has only minor findings (acceptable to ship)
- `fail`: section has critical/high findings (must fix before deploy)

## Deploy gate

If any section is `fail`, deploy is BLOCKED. The build-exit hook refuses.
