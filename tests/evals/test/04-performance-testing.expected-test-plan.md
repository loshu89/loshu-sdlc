---
title: Performance testing plan — analytics page optimization
status: draft
spec: ../design/03-full-stack-feature.expected-spec.md
date: 2026-09-14
methodology: performance
runner: k6 + lighthouse-ci + playwright-trace
discipline:
  - "baseline recorded before any optimization"
  - "regression gate fails PR if any metric regresses by more than 10%"
  - "nightly run against staging stack"
coverage:
  line: 80
  branch: 75
testLayers:
  - load
  - client-render
  - time-to-interactive
verification:
  build: "pnpm build"
  test: "pnpm test"
  lint: "pnpm lint"
  typecheck: "pnpm typecheck"
---

# Test: Performance testing (Analytics page optimization)

## User story

As platform engineer, I want a repeatable performance test for the analytics page optimization so that we can prove the page renders within the 200 ms chart target and 800 ms TTI target under realistic load.

## Context

This is a performance-testing-focused plan. The analytics page optimization change needs a repeatable benchmark. We will use k6 for synthetic load, Lighthouse CI for client-side metrics, and a custom Playwright trace for TTI. The baseline numbers are recorded before any optimization work and tracked as a regression gate.

## expected scope

- k6 script driving 50 concurrent users hitting the page with realistic queries.
- lighthouse CI assertion on chart render time under 200 ms.
- TTI assertion under 800 ms with 50 widgets on the page.
- regression gate in CI: PR fails if any metric regresses by more than 10%.

## Constraints

- performance suite runs nightly and on PR against the staging stack.
- test data factory produces a reproducible 50-widget page.
- results stored in a perf dashboard with historical trending.

## Open questions

- Where to host the perf dashboard — Grafana, custom, or vendor?
- synthetic data refresh cadence?
