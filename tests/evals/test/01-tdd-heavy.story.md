# Test: TDD-heavy (OAuth authentication)

## User story

As quality engineer, I want the OAuth authentication feature delivered with strict red-green-refactor TDD discipline so that every line of production code has a corresponding failing test that drove its creation.

## Context

This is a TDD-heavy test plan. The OAuth authentication feature will be implemented test-first. Every task in the corresponding plan.md is preceded by a failing test, the test is watched to fail for the right reason, the minimum production code is written to make it pass, and then the code is refactored while keeping the test green. We will enforce this discipline via superpowers:tdd and superpowers:verification-before-completion.

## Expected scope

- Failing tests for OAuth flow: callback, token exchange, session creation, account linking.
- Failing tests for failure modes: provider error, expired token, replay.
- Failing tests for audit log entries.
- Coverage target: 90% line, 85% branch.

## Constraints

- No production code may be merged without a preceding failing test.
- Coverage thresholds enforced in CI.
- Tests must run in under 60 s total.

## Open questions

- Use real OAuth providers in CI or stub the providers?
- Per-test isolation strategy: in-memory DB or transactional rollback?
