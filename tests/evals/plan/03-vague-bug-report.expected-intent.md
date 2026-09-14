---
title: Triage vague dashboard bug report
status: draft
cycle: 1
author: C. Park
problem: "A customer filed a vague bug report: the dashboard is broken sometimes. No reproduction steps, environment, browser, OS, region, screenshot, screencast, or session id provided."
proposedOutcome: "Clarify the vague dashboard bug report with the reporter and either reproduce and fix, defer with a tracking ticket, or close as non-reproducible."
affectedUsersAndSystems:
  - "Dashboard rendering pipeline"
  - "Reporter"
  - "Support team"
  - "Bug tracker"
constraints:
  - "Do not begin implementation until reproduction steps are confirmed"
  - "Stay within the existing dashboard rendering pipeline; no new dependency"
openQuestions:
  - "Which dashboard widget or panel is the reporter referring to?"
  - "Does the bug occur on a specific browser, OS, or region?"
  - "Is there a screenshot, screencast, or session id we can use?"
---

# Intent: Triage vague dashboard bug report

## User story

A customer filed a vague bug report: "The dashboard is broken sometimes." The reporter does not say when, does not say which browser, does not give a reproducible path, and does not attach logs. We need to capture the intent for investigating this report, deciding whether it is actually a bug, and either reproducing it or closing it as a non-issue.

## Context

This is a vague bug report — the user description lacks the typical signals we use to triage (reproduction steps, environment, expected vs actual). Before writing a fix, we need to drive the report through systematic debugging and clarify the description with the reporter. Possible interpretations include: a chart does not render in certain conditions, a layout shifts after interaction, a metric counter shows a wrong value, the dashboard hangs on cold load, or the dashboard is unreachable in some regions.

## Expected scope

- Triage the vague report with the reporter to clarify symptoms.
- Determine whether the bug is reproducible and which system is at fault.
- Capture any concrete reproduction steps.
- Decide whether to fix, defer, or close as non-reproducible.

## Constraints

- Do not begin implementation until reproduction steps are confirmed.
- Stay within the existing dashboard rendering pipeline; no new dependency.

## Open questions

- Which dashboard widget or panel is the reporter referring to.
- Does the bug occur on a specific browser, OS, or region.
- Is there a screenshot, screencast, or session id we can use.
