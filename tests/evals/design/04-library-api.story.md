# Design: Library/API design (Feature flag client SDK)

## User story

As an application developer, I want a typed TypeScript client SDK for our feature flag service, so that my code can read flag values with full IntelliSense and compile-time safety.

## Context

This is a library/API design exercise. We are producing the public surface of a feature flag client SDK that other internal teams will consume. The SDK wraps the existing REST endpoint and provides typed accessors per flag. The library must be tree-shakable, support both React and Node consumers, and ship ESM and CJS bundles.

## Expected scope

- Public TS client with typed flag accessors.
- Bootstrap (warm) and live (streaming) evaluation modes.
- React hook `useFlag`.
- ESM and CJS bundles, tree-shakable.
- Published to our internal artifact registry.

## Constraints

- Backward-compatible public API across minor versions.
- Bundle size under 30 kB gzipped for the core entry.
- No transitive runtime dependencies beyond a single tiny fetch wrapper.

## Open questions

- Streaming transport — SSE or WebSocket?
- Local cache TTL default?
