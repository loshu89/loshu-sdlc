# Test: Performance testing (Analytics page optimization)

## User story

As platform engineer, I want a repeatable performance test for the analytics page optimization so that we can prove the page renders within the 200 ms chart target and 800 ms TTI target under realistic load.

## Context

This is a performance-testing-focused plan. The analytics page optimization change needs a repeatable benchmark. We will use k6 for synthetic load, Lighthouse CI for client-side metrics, and a custom Playwright trace for TTI. The baseline numbers are recorded before any optimization work and tracked as a regression gate.

## Expected scope

- k6 script driving 50 concurrent users hitting the page with realistic queries.
- Lighthouse CI assertion on chart render time under 200 ms.
- TTI assertion under 800 ms with 50 widgets on the page.
- Regression gate in CI: PR fails if any metric regresses by more than 10%.

## Constraints

- Performance suite runs nightly and on PR against the staging stack.
- Test data factory produces a reproducible 50-widget page.
- Results stored in a perf dashboard with historical trending.

## Open questions

- Where to host the perf dashboard — Grafana, custom, or vendor?
- Synthetic data refresh cadence?
