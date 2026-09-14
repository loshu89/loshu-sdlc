---
title: Feature flag client SDK
status: draft
intent: ../plan/04-compliance-pii-encryption.expected-intent.md
date: 2026-09-14
architecture: "typed TypeScript client SDK for the feature flag service. Wraps the existing REST endpoint and provides typed accessors per flag. Tree-shakable, supports both React and Node consumers. Ships ESM and CJS bundles. Published to internal artifact registry."
apiSurface:
  - method: GET
    path: /sdk/flags
    description: "list available flags with metadata"
    auth: api-key
dataModel:
  - name: FlagDefinition
    fields:
      - "name (string)"
      - "type (boolean | string | number | json)"
verificationCriteria:
  - "bundle size under 30 kB gzipped for the core entry"
  - "tree-shaking verified with a sample app"
  - "ESM and CJS bundles both pass the smoke test"
  - "useFlag hook updates within 1 s of a flag change"
---

# Design: Library/API design (Feature flag client SDK)

## User story

As an application developer, I want a typed TypeScript client SDK for our feature flag service, so that my code can read flag values with full intellisense and compile-time safety.

## Context

This is a library/API design exercise. We are producing the public surface of a feature flag client SDK that other internal teams will consume. The SDK wraps the existing REST endpoint and provides typed accessors per flag. The library must be tree-shakable, support both React and Node consumers, and ship ESM and CJS bundles.

## Expected scope

- public TS client with typed flag accessors.
- bootstrap (warm) and live (streaming) evaluation modes.
- react hook useFlag.
- ESM and CJS bundles, tree-shakable.
- published to our internal artifact registry.

## Constraints

- backward-compatible public API across minor versions.
- bundle size under 30 kB gzipped for the core entry.
- no transitive runtime dependencies beyond a single tiny fetch wrapper.

## Open questions

- streaming transport — SSE or webSocket?
- local cache TTL default?
