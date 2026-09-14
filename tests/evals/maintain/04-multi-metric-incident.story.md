# Maintain: Multi-metric incident

## User story

As on-call engineer, I want a multi-metric incident evaluation so that when error_rate and p95_latency_ms both breach the 3σ band in the same evaluation window, the maintain harness produces a single consolidated intent that captures both symptoms and their probable common cause.

## Context

This is a multi-metric incident evaluation. Within a single evaluation window, error_rate has crossed the 3σ band and p95_latency_ms has crossed the 3σ band. The two symptoms are likely related — both rose after the most recent deploy. The maintain harness should produce a single consolidated intent with both metrics cited, a common-cause hypothesis, and the upstream deploy referenced.

## Expected scope

- Detect the multi-metric 3σ breach in a single window.
- Correlate the two metrics by deploy timestamp.
- Produce a single consolidated intent with both symptoms and the common-cause hypothesis.
- Block maintain-exit until the consolidated intent is accepted.

## Constraints

- A single window with two or more 3σ breaches produces one consolidated intent, not two.
- The consolidated intent must reference both upstream metric names.
- Common-cause hypothesis must be evidence-backed, not speculative.

## Open questions

- How many metrics must breach 3σ in one window to count as multi-metric — two or three?
- What is the minimum correlation threshold before the harness assumes common cause?
