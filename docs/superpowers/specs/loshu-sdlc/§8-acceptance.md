# §8 Acceptance Criteria

<!-- Testing layers, coverage targets, release gating. These are the pass/fail criteria that determine "done." -->

How we know loshu-sdlc is done. Four testing layers, three coverage targets, and a release-gating checklist that combines them all.

## Testing layers

1. **Unit (vitest, ≥90% CLI coverage, 100% schemas/hooks)** — schema validators, hook scripts, CLI commands, bands evaluator, attribution checks.
2. **Integration (vitest + exec)** — scaffolder, `--existing`, doctor, validate, lint, upgrade.
3. **Eval suite (custom harness)** — ~30 golden-file stories covering Plan, Design, Build, Test, Deploy, Maintain. Loose mode (cosine ≥0.85) on PR; strict mode on main.
4. **Smoke (nightly + tagged releases)** — full 6-stage flow on `examples/example-app/` with mocked LLM responses.

## Coverage targets

- `packages/cli/src/lib/`: ≥90%
- `packages/plugin/schemas/`: 100%
- `packages/plugin/hooks/`: 100%
- PR coverage delta threshold: ≥-2pp

## Release gating

A version can be released only if: all unit + integration tests pass, eval suite (strict) passes, smoke tests pass on tagged commit, coverage delta ≥ -2pp, attribution check passes.

## Cross-references

- See also: [§1-goals.md](§1-goals.md) — each goal here maps to ≥1 acceptance criterion (auditable → attribution check; bootstrappable → integration tests for scaffolder)
- See also: [§9-nfrs.md](§9-nfrs.md) for the non-functional criteria (security SLA, support model) that complement these tests
- See also: [§5-data-flow.md](§5-data-flow.md) § 9 for the error categories these tests must cover
