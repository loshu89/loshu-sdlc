# §9 Non-Functional Requirements

<!-- Versioning, distribution, support model, deprecation policy, security, roadmap. -->

Performance budgets, reliability targets, security constraints, and the operational footprint of loshu-sdlc as a published artifact.

## Versioning

Shared version across `@loshu-sdlc/plugin`, `@loshu-sdlc/cli`, `@loshu-sdlc/templates`. Semver. `0.x` is pre-stable (breaking changes between minors); `1.x+` is stable (breaking only at major).

## Distribution channels

- **npm:** `@loshu-sdlc/cli`, `@loshu-sdlc/templates`
- **Claude Code marketplace:** `@loshu-sdlc/plugin`
- **GitHub Releases:** source + tarballs

## Support model

| Version | Status | Security | Bug fixes | Features |
|---|---|---|---|---|
| Latest minor | Active | ✓ | ✓ | ✓ |
| Previous minor | Maintenance | ✓ | ✓ | ✗ |
| LTS major | LTS (18 months) | ✓ | critical only | ✗ |
| Older | EOL | ✗ | ✗ | ✗ |

## Deprecation policy

For `1.x+` breaking changes: announce in CHANGELOG, document migration, warn in CLI for 2 releases, remove at next major. For `0.x`: breaking changes allowed between minors.

## Security

- Vulnerability disclosure: `SECURITY.md` + GitHub Security Advisories
- Response SLA: 48h acknowledge, 14d critical fix, 30d high fix
- Dependabot + weekly review; critical CVEs patched within 7d
- npm provenance attestations; signed releases

## Roadmap

| Version | Target | Highlights |
|---|---|---|
| v0.1.0 | +3 months | All 6 stages; minimal + full templates; Tier-1 superpowers; borrowed UI baseline |
| v0.2.0 | +5 months | UI-ux-pro-max polish; eval suite 30+; example-app reference |
| v0.5.0 | +8 months | ECC integration; perf monitoring; multi-cycle viz |
| v1.0.0 | +12 months | Stable API; full docs site; pilot projects |

## Cross-references

- See also: [1-goals.md](1-goals.md) — universal applicability is the NFR constraint that keeps the plugin language-agnostic
- See also: [8-acceptance.md](8-acceptance.md) — coverage targets are the quantitative counterpart to these qualitative NFRs
- See also: [6-api-surface.md](6-api-surface.md) § Telemetry — no-telemetry-by-default is the privacy NFR
