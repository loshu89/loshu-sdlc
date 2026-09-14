---
title: TDD-heavy test plan — OAuth authentication
status: draft
spec: ../design/01-ui-only-feature.expected-spec.md
date: 2026-09-14
methodology: tdd
discipline:
  - "red-green-refactor enforced per task"
  - "superpowers:tdd invoked before each implementation step"
  - "superpowers:verification-before-completion enforced before merge"
coverage:
  line: 90
  branch: 85
testLayers:
  - unit
  - integration
  - contract
verification:
  build: "pnpm build"
  test: "pnpm test"
  lint: "pnpm lint"
  typecheck: "pnpm typecheck"
---

# Test: TDD-heavy (OAuth authentication)

## User story

As quality engineer, I want the OAuth authentication feature delivered with strict red-green-refactor TDD discipline so that every line of production code has a corresponding failing test that drove its creation.

## Context

This is a TDD-heavy test plan. The OAuth authentication feature will be implemented test-first. Every task in the corresponding plan.md is preceded by a failing test, the test is watched to fail for the right reason, the minimum production code is written to make it pass, and then the code is refactored while keeping the test green. We will enforce this discipline via superpowers:tdd and superpowers:verification-before-completion.

## Expected scope

- failing tests for OAuth flow: callback, token exchange, session creation, account linking.
- failing tests for failure modes: provider error, expired token, replay.
- failing tests for audit log entries.
- coverage target: 90% line, 85% branch.

## Constraints

- no production code may be merged without a preceding failing test.
- coverage thresholds enforced in CI.
- tests must run in under 60 s total.

## Open questions

- use real OAuth providers in CI or stub the providers?
- per-test isolation strategy: in-memory DB or transactional rollback?
