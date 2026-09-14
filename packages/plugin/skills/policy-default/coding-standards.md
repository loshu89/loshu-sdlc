---
provenance:
  source: ecc:coding-standards
  borrowed_at: 2026-09-11
  license: MIT (assumed; verify before release)
  full_catalog: install ecc for the complete coding-standards reference
---

# Default coding standards

These are language-agnostic baselines. Each language has additional rules.

## Universal

- Functions ≤50 lines, ≤4 parameters
- Files ≤300 lines; split by responsibility
- No commented-out code; delete it
- No dead code; remove on sight
- Prefer immutability; mutate only when necessary
- Use meaningful names; no `temp`, `data`, `result`
- Comments explain *why*, not *what*

## Test coverage

- New code: ≥80% line coverage
- Bug fixes: regression test required
- Public APIs: 100% line coverage

## Error handling

- Fail loudly; don't swallow errors
- Errors include context for debugging
- Use typed errors (exceptions or Result types)

## Dependencies

- Pin major versions; allow minor/patch
- Audit dependencies before adding
- Prefer established libraries over novel ones
