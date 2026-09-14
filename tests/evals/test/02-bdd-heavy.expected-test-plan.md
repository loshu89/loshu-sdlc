---
title: BDD-heavy test plan — settings page redesign
status: draft
spec: ../design/01-ui-only-feature.expected-spec.md
date: 2026-09-14
methodology: bdd
runner: cucumber-js + playwright
discipline:
  - "scenarios authored before implementation"
  - "product, design, accessibility review on every scenario"
  - "scenarios run as automated acceptance tests on every PR"
coverage:
  line: 80
  branch: 75
testLayers:
  - acceptance
  - accessibility
  - visual-regression
verification:
  build: "pnpm build"
  test: "pnpm test"
  lint: "pnpm lint"
  typecheck: "pnpm typecheck"
---

# Test: BDD-heavy (Settings page redesign)

## User story

As product owner, I want the settings page behavior expressed in plain-language BDD scenarios so that any stakeholder can read the acceptance criteria and verify the feature works as described.

## Context

This is a BDD-heavy test plan. The settings page redesign is driven by Given-When-Then scenarios written in Gherkin. The scenarios are the single source of truth for what "done" means. They are reviewed by product, design, and accessibility before any implementation, and they run as automated acceptance tests against the running app.

## expected scope

- Gherkin feature file with scenarios per sidebar section.
- step definitions wired to a playwright runner.
- scenarios for happy paths, error paths, and a11y expectations.
- CI runs the full BDD suite on every PR.

## Constraints

- one scenario per acceptance criterion, no compound scenarios.
- scenarios must be readable by a non-engineer.
- WCAG 2.1 AA expectations encoded as a11y steps.

## Open questions

- Where to host the feature files — repo or separate docs repo?
- tag convention for slow scenarios?
