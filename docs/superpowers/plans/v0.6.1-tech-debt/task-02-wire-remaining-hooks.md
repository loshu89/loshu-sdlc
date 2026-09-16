# Task 2: Wire emit_event into remaining 4 hooks

**Plan:** [plan.md](plan.md) — read its Global Constraints first; they apply here.
**Debt:** D2 — only plan-exit.sh emits DAG events (after Task 1 fixes it). design-exit, build-exit, deploy-exit, maintain-exit write gates.jsonl (via `log_event`) but never write events.jsonl. Stage transitions are unauditable for 4 of 5 stages.

## Files

- Modify: `packages/plugin/hooks/design-exit.sh`
- Modify: `packages/plugin/hooks/build-exit.sh`
- Modify: `packages/plugin/hooks/deploy-exit.sh`
- Modify: `packages/plugin/hooks/maintain-exit.sh`
- Reference (read-only): `packages/plugin/hooks/plan-exit.sh` (the fixed pattern from Task 1), `packages/plugin/hooks/lib/event-emit.sh`

## Interfaces

- **Consumes:** `emit_event <event_type> <cycle_id> <stage> <artifact_id>` from `lib/event-emit.sh` — same function Task 1 verified. Requires `$ROOT` and `$SCRIPT_DIR` shell variables set before the call.
- **Produces:** every stage hook appends to `.loshu-sdlc/state/events.jsonl` on successful validation. Task 7's closed-loop E2E asserts ≥2 event lines (plan + maintain) exist after a full loop.

## Pattern to apply (identical in all 4 files)

**A. Top of file** — after `set -euo pipefail`, add (if not already present):

```bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Source event emitter
if [ -f "$SCRIPT_DIR/lib/event-emit.sh" ]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/lib/event-emit.sh"
fi
```

Note: maintain-exit.sh currently lacks `SCRIPT_DIR` — add it. design/build/deploy-exit.sh: check first, add only what's missing.

**B. Success path** — immediately BEFORE the final `exit 0` of the script, add the emit block with the correct stage name and artifact variable:

| Hook | stage | artifact file variable | frontmatter fields to grep |
|---|---|---|---|
| design-exit.sh | `design` | `$SPEC` | `cycle_id:`, `id:` from `$SPEC` |
| build-exit.sh | `build` | `$PLAN` | `cycle_id:`, `id:` from `$PLAN` |
| deploy-exit.sh | `deploy` | `$REVIEW` | `cycle_id:`, `id:` from `$REVIEW` |
| maintain-exit.sh | `maintain` | `$BANDS` | `cycle_id:` from `$BANDS` (bands.yaml has no `id:` — use `$CURRENT_CYCLE` and artifact_id `bands-<cycle>`; see step for maintain below) |

Template (adjust variable names per table):

```bash
# Emit DAG event on successful validation (must run BEFORE exit 0)
if [ -f "$SCRIPT_DIR/lib/event-emit.sh" ]; then
  CYCLE_ID=$(grep -E '^cycle_id:' "$SPEC" 2>/dev/null | awk '{print $2}' | head -1)
  if [ -z "${CYCLE_ID:-}" ]; then CYCLE_ID="${CURRENT_CYCLE:-0}"; fi
  ARTIFACT_ID=$(grep -E '^id:' "$SPEC" 2>/dev/null | awk '{print $2}' | head -1)
  emit_event "validate" "$CYCLE_ID" "design" "${ARTIFACT_ID:-unknown}"
fi

exit 0
```

**maintain-exit.sh special case:** bands.yaml is YAML-frontmatter-less in current templates (plain YAML with `version:`/`metrics:`), and v0.6.0's schema added Identity fields to bands too — but templates may not have them yet (Task 4 fixes templates). Use fallbacks:

```bash
# Emit DAG event on successful validation (must run BEFORE exit 0)
if [ -f "$SCRIPT_DIR/lib/event-emit.sh" ]; then
  CYCLE_ID=$(grep -E '^cycle_id:' "$BANDS" 2>/dev/null | awk '{print $2}' | head -1)
  if [ -z "${CYCLE_ID:-}" ]; then CYCLE_ID="$CURRENT_CYCLE"; fi
  ARTIFACT_ID=$(grep -E '^id:' "$BANDS" 2>/dev/null | awk '{print $2}' | head -1)
  emit_event "validate" "$CYCLE_ID" "maintain" "${ARTIFACT_ID:-bands-c$CYCLE_ID}"
fi

exit 0
```

Place this after the bands→accepted transition block (currently ends at line ~149) and before the final `exit 0` (line ~151). If a 3σ incident forked a new cycle earlier in the script, ALSO emit an `incident` event right after the `cycle new` call (line ~133 area):

```bash
  if [ -f "$SCRIPT_DIR/lib/event-emit.sh" ]; then
    emit_event "incident" "$CURRENT_CYCLE" "maintain" "bands-3sigma:${TRIPPED_METRIC:-unknown}"
  fi
```

## Steps

- [ ] **Step 1: Read all 4 hooks; note each one's final `exit 0` line number and success-path structure**

```bash
cd "D:/workspace/3.my/SDLC"
grep -n "exit 0" packages/plugin/hooks/design-exit.sh packages/plugin/hooks/build-exit.sh packages/plugin/hooks/deploy-exit.sh packages/plugin/hooks/maintain-exit.sh
```

Beware: several scripts have MULTIPLE `exit 0` statements (early-outs for missing artifacts / rejected-archived states). The emit block goes before the FINAL one only (the success path). Early-outs (`artifact not found`, `rejected|archived` revision-allowed) should NOT emit `validate` events.

- [ ] **Step 2: Apply pattern A + B to design-exit.sh**
- [ ] **Step 3: Apply pattern A + B to build-exit.sh**
- [ ] **Step 4: Apply pattern A + B to deploy-exit.sh**
- [ ] **Step 5: Apply pattern A + B (+ incident emit) to maintain-exit.sh**
- [ ] **Step 6: Syntax check all 4**

```bash
for h in design build deploy maintain; do bash -n "packages/plugin/hooks/$h-exit.sh" && echo "$h OK"; done
```

Expected: 4 × OK.

- [ ] **Step 7: Smoke test one hook (design-exit) with the Task-1 fixture pattern**

```bash
cd "D:/workspace/3.my/SDLC"
TMP=$(mktemp -d)
cat > "$TMP/intent.md" <<'EOF'
---
id: plan-c01-smoke-0000-01J00000000000000000000000
schema_version: 0.5.0
cycle_id: 1
stage: plan
state: accepted
created_by: human:smoke
created_at: 2026-09-16T10:00:00Z
---
EOF
cat > "$TMP/spec.md" <<'EOF'
---
id: design-c01-smoke-0000-01J00000000000000000000001
schema_version: 0.5.0
cycle_id: 1
stage: design
state: draft
created_by: human:smoke
created_at: 2026-09-16T10:00:00Z
title: smoke
intent: intent.md
architecture: none
verificationCriteria:
  - none
---
EOF
mkdir -p "$TMP/node_modules/.bin"
printf '#!/usr/bin/env bash\nexit 0\n' > "$TMP/node_modules/.bin/loshu-sdlc"
chmod +x "$TMP/node_modules/.bin/loshu-sdlc"
bash packages/plugin/hooks/design-exit.sh "$TMP" || echo "hook exited $?"
cat "$TMP/.loshu-sdlc/state/events.jsonl"
rm -rf "$TMP"
```

Expected: events.jsonl contains a line with `"stage":"design"`. (The stub CLI makes `validate`/`state` calls succeed; if the hook's cross-stage check greps intent.md for `state: accepted` — the fixture provides it.)

- [ ] **Step 8: Commit**

```bash
git add packages/plugin/hooks/design-exit.sh packages/plugin/hooks/build-exit.sh packages/plugin/hooks/deploy-exit.sh packages/plugin/hooks/maintain-exit.sh
git commit -m "feat(hooks): wire emit_event into design/build/deploy/maintain exit gates"
```

## Known gotchas

- `set -euo pipefail` + `grep` no-match = exit 1 kills the script. Every grep pipeline in the emit block needs `2>/dev/null` and the `if [ -z ... ]` fallback shown. Do not omit.
- maintain-exit.sh already has a `log_event` function (gates.jsonl) — do NOT confuse it with `emit_event` (events.jsonl). Both coexist: log_event = gate result audit; emit_event = DAG transition audit.
- deploy-exit's artifact variable may be named `$REVIEW` — verify by reading the file first; adapt the template.
- Don't reformat or "clean up" unrelated parts of the hooks — minimal diffs only.

## Report contract

Write report to the SDD workspace `task-02-report.md`; reply with only:

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- Commits created (short SHA + subject)
- One-line smoke-test summary
- Concerns (if any)
- Report file path
