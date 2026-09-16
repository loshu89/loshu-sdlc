#!/usr/bin/env bash
# Deploy-exit gate: validates REVIEW.md + respects DAG state machine
# Plus: blocks if any section status: fail
# Plus: persists state transitions to .loshu-sdlc/state/cycle.json
# Plus: appends gate events to .loshu-sdlc/state/gates.jsonl
# plan.md must be accepted before deploy can advance.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Source event emitter
if [ -f "$SCRIPT_DIR/lib/event-emit.sh" ]; then
  # shellcheck source=/dev/null
  source "$SCRIPT_DIR/lib/event-emit.sh"
fi

ROOT="${1:-.}"

# Resolve compiled CLI bin (bypasses npx, which is broken on Windows +
# Git Bash — the .cmd shim ignores local node_modules/.bin lookup).
# find-cli.sh returns 127 with stderr message if no candidate matches;
# in that case CLI_BIN stays empty and the subsequent `node "$CLI_BIN" …`
# calls no-op via `|| true`, matching the previous npx degradation behavior.
CLI_BIN="$(bash "$SCRIPT_DIR/lib/find-cli.sh" "$ROOT" 2>/dev/null || true)"
REVIEW="$ROOT/REVIEW.md"
PLAN="$ROOT/plan.md"
STATE_DIR="$ROOT/.loshu-sdlc/state"
CYCLE_FILE="$STATE_DIR/cycle.json"

mkdir -p "$STATE_DIR"

# Load debounce library; skip this gate run if we're still inside the
# settle period for REVIEW.md (rapid-fire writes during drafting).
DEBOUNCE_LIB="$ROOT/.claude/plugins/loshu-sdlc/packages/plugin/hooks/lib/debounce.sh"
if [ ! -f "$DEBOUNCE_LIB" ]; then
  DEBOUNCE_LIB="$ROOT/node_modules/@loshu89/plugin/hooks/lib/debounce.sh"
fi
if [ ! -f "$DEBOUNCE_LIB" ]; then
  DEBOUNCE_LIB="$ROOT/.claude/hooks/lib/debounce.sh"
fi
if [ -f "$DEBOUNCE_LIB" ]; then
  # shellcheck source=/dev/null
  source "$DEBOUNCE_LIB"
  if ! gate_should_run "$ROOT" "REVIEW.md" 2; then
    exit 0
  fi
fi

CURRENT_CYCLE=0
if [ -f "$CYCLE_FILE" ]; then
  CURRENT_CYCLE=$(grep -oE '"current_cycle":[[:space:]]*[0-9]+' "$CYCLE_FILE" | grep -oE '[0-9]+' | head -1 || echo 0)
fi

log_event() {
  local gate="$1"
  local result="$2"
  local artifact="${3:-}"
  node "$CLI_BIN" cycle append-event \
    --gate "$gate" --stage deploy --result "$result" \
    --cycle "$CURRENT_CYCLE" ${artifact:+--artifact "$artifact"} \
    >/dev/null 2>&1 || true
}

if [ ! -f "$REVIEW" ]; then
  log_event "deploy-exit" "noop" ""
  exit 0
fi

# Cross-stage: plan.md must be accepted
if [ ! -f "$PLAN" ]; then
  echo "Deploy-exit: plan.md not found; required before REVIEW.md" >&2
  log_event "deploy-exit" "block" "$REVIEW"
  exit 2
fi

PLAN_STATE=$(grep -E '^state:' "$PLAN" | head -1 | awk '{print $2}' || true)
if [ -z "$PLAN_STATE" ]; then
  PLAN_STATE=$(grep -E '^status:' "$PLAN" | head -1 | awk '{print $2}' || true)
fi
PLAN_STATE="${PLAN_STATE:-pending}"

if [ "$PLAN_STATE" = "rejected" ] || [ "$PLAN_STATE" = "archived" ]; then
  echo "Deploy-exit: plan.md is $PLAN_STATE; resolve upstream artifact first" >&2
  log_event "deploy-exit" "block" "$REVIEW"
  exit 2
fi

if [ "$PLAN_STATE" != "accepted" ]; then
  echo "Deploy-exit: plan.md is '$PLAN_STATE' (must be 'accepted')" >&2
  log_event "deploy-exit" "block" "$REVIEW"
  exit 2
fi

# Read REVIEW.md current state
REVIEW_STATE=$(grep -E '^state:' "$REVIEW" | head -1 | awk '{print $2}' || true)
if [ -z "$REVIEW_STATE" ]; then
  REVIEW_STATE=$(grep -E '^status:' "$REVIEW" | head -1 | awk '{print $2}' || true)
fi
REVIEW_STATE="${REVIEW_STATE:-pending}"

case "$REVIEW_STATE" in
  rejected|archived)
    echo "Deploy-exit: REVIEW.md is $REVIEW_STATE, allowing revision" >&2
    log_event "deploy-exit" "noop" "$REVIEW"
    ;;
esac

# Validate schema
if ! node "$CLI_BIN" validate review "$REVIEW" --strict 2>/dev/null; then
  echo "Deploy-exit: REVIEW.md failed schema validation" >&2
  log_event "deploy-exit" "block" "$REVIEW"
  exit 2
fi

# Check for any status: fail
if grep -E '^Status: fail' "$REVIEW"; then
  echo "Deploy-exit: REVIEW.md has status: fail in at least one section" >&2
  echo "Fix findings and re-run /sdlc-deploy" >&2
  log_event "deploy-exit" "block" "$REVIEW"
  exit 2
fi

# Transition REVIEW.md -> accepted when valid
if [ "$REVIEW_STATE" = "draft" ] || [ "$REVIEW_STATE" = "iterating" ]; then
  if node "$CLI_BIN" state deploy "$REVIEW" --transition accepted 2>/dev/null; then
    echo "Deploy-exit: transitioned REVIEW.md $REVIEW_STATE -> accepted" >&2
    node "$CLI_BIN" cycle set deploy accepted "$ROOT" >/dev/null 2>&1 || true
    log_event "deploy-exit" "accept" "$REVIEW"
  else
    echo "Deploy-exit: schema valid but state transition rejected" >&2
    log_event "deploy-exit" "block" "$REVIEW"
    exit 2
  fi
else
  log_event "deploy-exit" "noop" "$REVIEW"
fi

# Emit DAG event on successful validation (must run BEFORE exit 0)
if [ -f "$SCRIPT_DIR/lib/event-emit.sh" ]; then
  CYCLE_ID=$(grep -E '^cycle_id:' "$REVIEW" 2>/dev/null | awk '{print $2}' | head -1 || true)
  if [ -z "${CYCLE_ID:-}" ]; then CYCLE_ID="${CURRENT_CYCLE:-0}"; fi
  ARTIFACT_ID=$(grep -E '^id:' "$REVIEW" 2>/dev/null | awk '{print $2}' | head -1 || true)
  emit_event "validate" "$CYCLE_ID" "deploy" "${ARTIFACT_ID:-unknown}"
fi

exit 0
