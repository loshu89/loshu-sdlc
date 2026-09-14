---
description: Show current cycle state across all six stages
argument-hint: ""
---

# /sdlc-status — Cross-stage dashboard

Display the current cycle state by invoking the `state` subcommand:

```
loshu-sdlc state show .
```

The output replaces the placeholders below.

## Output format

```
loshu-sdlc state — cycle <N> (<title>)
┌──────────┬────────────┬───────────┬────────────┬────────────┐
│ Stage    │ Artifact   │ State     │ Updated    │ Allowed →  │
├──────────┼────────────┼───────────┼────────────┼────────────┤
│ plan     │ intent.md  │ <state>   │ <date>     │ <targets>  │
│ design   │ spec.md    │ <state>   │ <date>     │ <targets>  │
│ build    │ plan.md    │ <state>   │ <date>     │ <targets>  │
│ test     │ REVIEW.md  │ <state>   │ <date>     │ <targets>  │
│ deploy   │ REVIEW.md  │ <state>   │ <date>     │ <targets>  │
│ maintain │ bands.yaml │ <state>   │ <date>     │ <targets>  │
└──────────┴────────────┴───────────┴────────────┴────────────┘
```

## Notes

- The state column is one of: `draft`, `accepted`, `iterating`,
  `blocked`, `rejected`, `archived`, or `pending` (file present but no
  state declared) / `missing` (no file).
- The `Allowed →` column lists the states reachable from the current
  one via the artifact state-machine DAG. See
  `packages/plugin/state-machines/artifact.json`.
- For machine-readable output, run `loshu-sdlc state show . --json`.

## Behavior

1. Invoke `loshu-sdlc state show .` (or the equivalent in the user's
   project root if `.` is not appropriate).
2. Render the table verbatim into the response.
3. If any stage is `pending` or `missing`, surface that as a hint to
   run the corresponding `/sdlc-<stage>` slash command.
4. If any stage is `blocked` or `rejected`, explain the implication
   (downstream stages cannot advance until the blocker is resolved).