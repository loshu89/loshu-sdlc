# Task 1: Fix plan-exit dead emit_event

**Plan:** [plan.md](plan.md) — read its Global Constraints first; they apply here.
**Debt:** D1 — the `emit_event` block in `plan-exit.sh` sits AFTER the final `exit 0` (lines 151-157), so `events.jsonl` is never written. The v0.6.0 "auditable event log" promise is currently false.

## Files

- Modify: `packages/plugin/hooks/plan-exit.sh` (lines ~144-157)
- Verify: `packages/plugin/hooks/lib/event-emit.sh` (read-only; fix only if smoke test shows it's broken)
- Test: manual bash smoke test (no vitest for this task — it's shell code)

## Interfaces

- **Consumes:** `emit_event <event_type> <cycle_id> <stage> <artifact_id>` from `lib/event-emit.sh` (sourced at top of plan-exit.sh, already present at lines 9-13). Writes one JSON line to `$ROOT/.loshu-sdlc/state/events.jsonl`. Requires `$ROOT` to be set (it is, line 15).
- **Produces:** a working `events.jsonl` write path that Tasks 2 and 7 replicate/verify. The event JSON shape (from event-emit.sh): `{event_id, ts, schema_version:"1.0.0", event, cycle_id, stage, artifact_id, actor:{type:"hook",id}, git:{branch,pr_number}}`.

## Steps

- [ ] **Step 1: Read the current dead-code block**

```bash
cd "D:/workspace/3.my/SDLC"
sed -n '144,158p' packages/plugin/hooks/plan-exit.sh
```

Confirm the structure: `fi` / `exit 0` / then the `# Emit DAG event` block (unreachable).

- [ ] **Step 2: Move the emit block BEFORE `exit 0`**

Edit `packages/plugin/hooks/plan-exit.sh`. Replace the tail (lines ~144-157):

```bash
else
  # Pending / other state — schema is valid but we did not transition.
  log_event "plan-exit" "noop" "$INTENT"
fi

exit 0

# Emit DAG event on successful validation
if [ -f "$SCRIPT_DIR/lib/event-emit.sh" ]; then
  CYCLE_ID=$(grep -E '^cycle_id:' "$INTENT" 2>/dev/null | awk '{print $2}' | head -1)
  if [ -z "${CYCLE_ID:-}" ]; then CYCLE_ID=0; fi
  ARTIFACT_ID=$(grep -E '^id:' "$INTENT" 2>/dev/null | awk '{print $2}' | head -1)
  emit_event "validate" "$CYCLE_ID" "plan" "${ARTIFACT_ID:-unknown}"
fi
```

with (emit block moved above the exit):

```bash
else
  # Pending / other state — schema is valid but we did not transition.
  log_event "plan-exit" "noop" "$INTENT"
fi

# Emit DAG event on successful validation (must run BEFORE exit 0)
if [ -f "$SCRIPT_DIR/lib/event-emit.sh" ]; then
  CYCLE_ID=$(grep -E '^cycle_id:' "$INTENT" 2>/dev/null | awk '{print $2}' | head -1)
  if [ -z "${CYCLE_ID:-}" ]; then CYCLE_ID=0; fi
  ARTIFACT_ID=$(grep -E '^id:' "$INTENT" 2>/dev/null | awk '{print $2}' | head -1)
  emit_event "validate" "$CYCLE_ID" "plan" "${ARTIFACT_ID:-unknown}"
fi

exit 0
```

- [ ] **Step 3: Syntax check both scripts**

```bash
bash -n packages/plugin/hooks/plan-exit.sh
bash -n packages/plugin/hooks/lib/event-emit.sh
```

Expected: no output (clean parse). If event-emit.sh fails to parse, fix it before continuing (it was written by a subagent in v0.6.0 and never smoke-tested).

- [ ] **Step 4: Smoke test — run the hook against a fixture and verify events.jsonl**

```bash
cd "D:/workspace/3.my/SDLC"
TMP=$(mktemp -d)
cat > "$TMP/intent.md" <<'EOF'
---
id: plan-c01-smoke-0000-01J00000000000000000000000
schema_version: 0.5.0
cycle_id: 1
stage: plan
state: draft
created_by: human:smoke
created_at: 2026-09-16T10:00:00Z
title: smoke test
problem: none
proposedOutcome: none
affectedUsersAndSystems:
  - none
openQuestions: []
---
# Smoke
EOF
# Stub the CLI so the hook's npx calls don't need a real install:
mkdir -p "$TMP/node_modules/.bin"
cat > "$TMP/node_modules/.bin/loshu-sdlc" <<'EOF'
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$TMP/node_modules/.bin/loshu-sdlc"
bash packages/plugin/hooks/plan-exit.sh "$TMP" || echo "hook exited $?"
echo "--- events.jsonl ---"
cat "$TMP/.loshu-sdlc/state/events.jsonl" 2>/dev/null || echo "MISSING — emit still broken"
rm -rf "$TMP"
```

Expected: `events.jsonl` exists and contains one JSON line with `"event":"validate"` and `"stage":"plan"`. If the line is missing, debug `lib/event-emit.sh` (check the heredoc/JSON construction) and fix it in this same task.

Note: with the stub CLI exiting 0 for everything, the hook may take the "transition accepted" path — either path must end with an events.jsonl line. If the stub causes `state` transition attempts to misbehave, that's fine for this smoke test; the assertion is **events.jsonl gets a line**.

- [ ] **Step 5: Validate the emitted line is parseable JSON**

```bash
# Re-run step 4's fixture, then:
node -e "const l=require('fs').readFileSync(process.argv[1],'utf8').trim().split('\n').pop(); const j=JSON.parse(l); console.log('OK', j.event, j.stage)" "$TMP/.loshu-sdlc/state/events.jsonl"
```

Expected: `OK validate plan`. (Run this before the `rm -rf` in step 4, or re-create the fixture.)

- [ ] **Step 6: Commit**

```bash
git add packages/plugin/hooks/plan-exit.sh packages/plugin/hooks/lib/event-emit.sh
git commit -m "fix(hooks): move plan-exit emit_event before exit 0 (was unreachable dead code)"
```

(Include event-emit.sh only if you had to fix it.)

## Known gotchas

- `emit_event` chmods events.jsonl to 0444 after writing — a second run must chmod 0644 first (the function already handles this; don't "fix" it by removing the chmod).
- Windows: run all bash via Git Bash (`bash` on PATH). `mktemp -d` works there.
- `set -euo pipefail` is active — any unguarded failing command kills the hook. Keep `|| echo` / `2>/dev/null || true` guards on grep pipelines (grep exits 1 on no match).

## Report contract

Write report to the SDD workspace `task-01-report.md`; reply with only:

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- Commits created (short SHA + subject)
- One-line smoke-test summary (did events.jsonl get its line?)
- Concerns (if any)
- Report file path
