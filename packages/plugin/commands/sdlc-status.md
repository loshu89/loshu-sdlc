---
description: Show current cycle state across all six stages
argument-hint: ""
---

# /sdlc-status — Cross-stage dashboard

Display the current cycle state by invoking the `cycle` subcommand. The
output replaces the placeholders below.

## Step 1 — Cycle snapshot

```
loshu-sdlc cycle status .
```

```
loshu-sdlc cycle status — current: <N>
* cycle <N>: <title>
  created: <iso-ts>
  stage    state       updated              artifact     sha
  plan     <state>     <iso-ts>             intent.md    <sha>
  design   <state>     <iso-ts>             spec.md      <sha>
  build    <state>     <iso-ts>             plan.md      <sha>
  test     <state>     <iso-ts>             REVIEW.md    <sha>
  deploy   <state>     <iso-ts>             REVIEW.md    <sha>
  maintain <state>     <iso-ts>             bands.yaml   <sha>
```

## Step 2 — Recent gate events

```
loshu-sdlc cycle log . --tail 10
```

```
<iso-ts>  cycle=<N> gate=<name> stage=<stage> <result> artifact=<file> sha=<sha>
  - <error message>      (only when result=block or reject)
```

## Step 3 — Combined output table

Render both sections together. If a project has more than one cycle in
its history, list them in reverse chronological order (newest first).

## Output format

```
loshu-sdlc cycle status — current: <N>
* cycle <N>: <title>
┌──────────┬────────────┬───────────┬──────────────┬────────────┬──────────┐
│ Stage    │ Artifact   │ State     │ Updated      │ Sha        │ Result   │
├──────────┼────────────┼───────────┼──────────────┼────────────┼──────────┤
│ plan     │ intent.md  │ <state>   │ <iso-ts>     │ <sha>      │ <evt>    │
│ design   │ spec.md    │ <state>   │ <iso-ts>     │ <sha>      │ <evt>    │
│ build    │ plan.md    │ <state>   │ <iso-ts>     │ <sha>      │ <evt>    │
│ test     │ REVIEW.md  │ <state>   │ <iso-ts>     │ <sha>      │ <evt>    │
│ deploy   │ REVIEW.md  │ <state>   │ <iso-ts>     │ <sha>      │ <evt>    │
│ maintain │ bands.yaml │ <state>   │ <iso-ts>     │ <sha>      │ <evt>    │
└──────────┴────────────┴───────────┴──────────────┴────────────┴──────────┘

Recent gates:
  <iso-ts>  <gate>  <stage>  <result>  <artifact>
  <iso-ts>  <gate>  <stage>  <result>  <artifact>
  ...
```

The `<evt>` column is the most recent gate result for that stage (one
of `accept`, `block`, `reject`, `noop`, or `—` if no events yet).

## Notes

- The state column is one of: `draft`, `accepted`, `iterating`,
  `blocked`, `rejected`, `archived`, or `pending` (file present but no
  state declared) / `missing` (no file).
- For machine-readable output, run:
  - `loshu-sdlc cycle status . --json` — full cycle.json dump
  - `loshu-sdlc cycle log . --json` — full gates.jsonl dump

## Behavior

1. Invoke `loshu-sdlc cycle status .` (or equivalent in the user's
   project root).
2. Invoke `loshu-sdlc cycle log . --tail 10` to pull recent gate
   events.
3. Cross-reference the events by `(stage, result)` to fill the
   `<evt>` column for each row.
4. Render the combined table verbatim into the response.
5. If any stage is `pending` or `missing`, surface that as a hint to
   run the corresponding `/sdlc-<stage>` slash command.
6. If any stage is `blocked` or `rejected`, explain the implication
   (downstream stages cannot advance until the blocker is resolved).
