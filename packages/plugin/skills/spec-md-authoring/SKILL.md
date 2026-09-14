---
name: spec-md-authoring
description: How to write a good spec.md. Auto-loaded by /sdlc-design.
---

# Spec authoring

A good `spec.md` translates intent into design.

## Sections (per spec.schema.json)

- **Architecture**: system-level design (components, integration points, data flow)
- **UI**: palette, typography, a11y, breakpoints (required if frontend)
- **API surface**: endpoints, methods, auth (required if backend)
- **Data model**: schema changes (required if DB)
- **Verification criteria**: how we'll know this works (concrete, testable)
- **Compliance**: which policies apply (GDPR, SOC2, WCAG, etc.)

## Anti-patterns

- Don't repeat intent verbatim — distill to design choices
- Don't write implementation steps — that's plan.md
- Don't skip verification criteria — they drive /sdlc-test
