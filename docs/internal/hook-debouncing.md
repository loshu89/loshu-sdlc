# Hook Debouncing (v0.5.0)

**Status:** Landed in v0.5.0
**Scope:** `packages/plugin/hooks/lib/debounce.sh` and the five
`*-exit.sh` stage hooks.

## Why

The `PostToolUse` hook in `packages/plugin/hooks/hooks.json` fires on every
`Write` or `Edit`. During `/sdlc-plan` brainstorming Claude may rewrite
`intent.md` 20 times in a minute. Each invocation runs:

1. `bash .claude/hooks/plan-exit.sh .`
2. `npx loshu-sdlc validate intent ... --strict` (Ajv validation)
3. `loshu-sdlc state plan ... --transition accepted` (DAG transition)
4. `loshu-sdlc cycle set plan accepted ...` (cycle state update)
5. `loshu-sdlc cycle append-event ...` (gate event append)

That's ~5 npx invocations × 20 rewrites = 100 subprocess spawns during a
single brainstorming session, most of which produce identical results to
the previous run. The hook is correct but wasteful and visually noisy
("Plan-exit: ... " repeating in the transcript).

## How

A "settle period" of 2 seconds. After the last write to an artifact, wait
2 seconds before running the gate. If another write happens during the
settle period, the timer resets. Once 2 seconds pass without a new write,
the gate runs once — on the final, settled version of the artifact.

This trades wall-clock latency for noise reduction: the gate now fires
~2 seconds after the user stops editing, not on every keystroke. For a
single `Edit` the change is invisible; for rapid-fire authoring it's the
difference between 20 runs and 1.

## Mechanism

```
.loshu-sdlc/state/.debounce/
  intent.md.lastwrite       # epoch seconds of last gate_should_run call
  spec.md.lastwrite
  plan.md.lastwrite
  REVIEW.md.lastwrite
  bands.yaml.lastwrite
```

Each artifact has its own marker file. On every call `gate_should_run`:

1. Reads the marker (epoch of last call); defaults to `0` if absent.
2. Computes `diff = now - last`.
3. Writes `now` back to the marker — this resets the timer.
4. Returns `0` (run gate) if `diff >= settle_seconds`, else `1` (skip).

The marker write always happens, so a burst of writes within the settle
window causes only the final call (after 2s of quiet) to fire the gate.

Slashes in artifact names are flattened to underscores so `nested/intent.md`
becomes `nested_intent.md.lastwrite` — one marker file per artifact, no
directory nesting required.

## Tuning

Default settle period: **2 seconds**.

Two override knobs:

- Per-call (from a hook): pass a third arg to `gate_should_run`, e.g.
  `gate_should_run "$ROOT" "intent.md" 5` for a 5-second settle.
- Environment variable (overrides the default but not explicit args):
  `LOSHU_SDLC_DEBOUNCE_SECONDS=N` before invoking the hook.

To disable debouncing entirely, set the settle period to `0`:

```bash
LOSHU_SDLC_DEBOUNCE_SECONDS=0 bash .claude/hooks/plan-exit.sh .
```

## Files

- `packages/plugin/hooks/lib/debounce.sh` — the POSIX-sh library.
- `packages/plugin/hooks/plan-exit.sh` — sources lib, gates on `intent.md`.
- `packages/plugin/hooks/design-exit.sh` — gates on `spec.md`.
- `packages/plugin/hooks/build-exit.sh` — gates on `plan.md`.
- `packages/plugin/hooks/deploy-exit.sh` — gates on `REVIEW.md`.
- `packages/plugin/hooks/maintain-exit.sh` — gates on `bands.yaml`.
- `packages/plugin/hooks/tests/debounce.test.sh` — 13 unit + integration tests.

Each exit hook looks up the library at three paths (in order):

1. `$ROOT/.claude/plugins/loshu-sdlc/packages/plugin/hooks/lib/debounce.sh`
   (development / direct-checkout layout)
2. `$ROOT/node_modules/@loshu89/plugin/hooks/lib/debounce.sh`
   (npm-install layout, matches the schema fallback already used by the
   existing hooks)
3. `$ROOT/.claude/hooks/lib/debounce.sh`
   (legacy alternate location)

If none of these resolves, the hook proceeds without debouncing — same
behavior as before v0.5.0. This makes the change backwards-compatible
for any user who has the plugin installed in an unexpected layout.

## Verification

`bash packages/plugin/hooks/tests/debounce.test.sh` — runs 13 assertions
covering: first call runs, second call within settle skips, post-settle
runs, per-artifact independence, slash-flattening, settle=0 fires every
time, env var override, and a hook-snippet integration check.

`pnpm test:hooks` — same script, run via pnpm filter.

## Why per-artifact and not per-hook

A single "settle" timer per session would be wrong: the user might be
editing `intent.md` and `REVIEW.md` simultaneously during a 3σ
incident-response cycle. Independent timers let each artifact settle on
its own schedule.
