# Test: BDD-heavy (Settings page redesign)

## User story

As product owner, I want the settings page behavior expressed in plain-language BDD scenarios so that any stakeholder can read the acceptance criteria and verify the feature works as described.

## Context

This is a BDD-heavy test plan. The settings page redesign is driven by Given-When-Then scenarios written in Gherkin. The scenarios are the single source of truth for what "done" means. They are reviewed by product, design, and accessibility before any implementation, and they run as automated acceptance tests against the running app.

## Expected scope

- Gherkin feature file with scenarios per sidebar section.
- Step definitions wired to a Playwright runner.
- Scenarios for happy paths, error paths, and a11y expectations.
- CI runs the full BDD suite on every PR.

## Constraints

- One scenario per acceptance criterion, no compound scenarios.
- Scenarios must be readable by a non-engineer.
- WCAG 2.1 AA expectations encoded as a11y steps.

## Open questions

- Where to host the feature files — repo or separate docs repo?
- Tag convention for slow scenarios?
