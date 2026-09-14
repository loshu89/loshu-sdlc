#!/usr/bin/env bash
# Design-exit gate: validates spec.md + checks DAG state machine
# Plus: ensures intent.md exists and has state: accepted
# Plus: persists state transitions to .loshu-sdlc/state/cycle.json
# Plus: appends gate events to .loshu-sdlc/state/gates.jsonl

set -euo pipefail

ROOT="${1:-.}"
SPEC="$ROOT/spec.md"
INTENT="$ROOT/intent.md"
STATE_DIR="$ROOT/.loshu-sdlc/state"
CYCLE_FILE="$STATE_DIR/cycle.json"
GATES_LOG="$STATE_DIR/gates.jsonl"

mkdir -p "$STATE_DIR"

CURRENT_CYCLE=0
if [ -f "$CYCLE_FILE" ]; then
  CURRENT_CYCLE=$(grep -oE '"current_cycle":[[:space:]]*[0-9]+' "$CYCLE_FILE" | grep -oE '[0-9]+' | head -1 || echo 0)
fi

log_event() {
  local gate="$1"
  local result="$2"
  local artifact="${3:-}"
  npx --no-install loshu-sdlc cycle append-event \
    --gate "$gate" --stage design --result "$result" \
    --cycle "$CURRENT_CYCLE" ${artifact:+--artifact "$artifact"} \
    >/dev/null 2>&1 || true
}

if [ ! -f "$SPEC" ]; then
  log_event "design-exit" "noop" ""
  exit 0  # Not an error during creation
fi

# Check intent.md exists and is in accepted state (cross-stage DAG rule)
if [ ! -f "$INTENT" ]; then
  echo "Design-exit: intent.md not found; create it via /sdlc-plan first" >&2
  log_event "design-exit" "block" "$SPEC"
  exit 2
fi

INTENT_STATE=$(grep -E '^state:' "$INTENT" | head -1 | awk '{print $2}' || true)
if [ -z "$INTENT_STATE" ]; then
  INTENT_STATE=$(grep -E '^status:' "$INTENT" | head -1 | awk '{print $2}' || true)
fi
INTENT_STATE="${INTENT_STATE:-pending}"

if [ "$INTENT_STATE" = "rejected" ] || [ "$INTENT_STATE" = "archived" ]; then
  echo "Design-exit: intent.md is $INTENT_STATE; resolve upstream artifact first" >&2
  log_event "design-exit" "block" "$SPEC"
  exit 2
fi

if [ "$INTENT_STATE" != "accepted" ]; then
  echo "Design-exit: intent.md is '$INTENT_STATE' (must be 'accepted')" >&2
  log_event "design-exit" "block" "$SPEC"
  exit 2
fi

# Read spec.md current state
SPEC_STATE=$(grep -E '^state:' "$SPEC" | head -1 | awk '{print $2}' || true)
if [ -z "$SPEC_STATE" ]; then
  SPEC_STATE=$(grep -E '^status:' "$SPEC" | head -1 | awk '{print $2}' || true)
fi
SPEC_STATE="${SPEC_STATE:-pending}"

# Allow revision if spec is rejected/archived
case "$SPEC_STATE" in
  rejected|archived)
    echo "Design-exit: spec.md is $SPEC_STATE, allowing revision" >&2
    log_event "design-exit" "noop" "$SPEC"
    ;;
esac

# Validate spec.md
if ! npx --no-install loshu-sdlc validate spec "$SPEC" --strict 2>/dev/null; then
  echo "Design-exit: spec.md failed schema validation" >&2
  echo "Run: loshu-sdlc validate spec $SPEC --verbose" >&2
  log_event "design-exit" "block" "$SPEC"
  exit 2
fi

# Transition spec -> accepted when valid
if [ "$SPEC_STATE" = "draft" ] || [ "$SPEC_STATE" = "iterating" ]; then
  if npx --no-install loshu-sdlc state design "$SPEC" --transition accepted 2>/dev/null; then
    echo "Design-exit: transitioned spec.md $SPEC_STATE -> accepted" >&2
    npx --no-install loshu-sdlc cycle set design accepted "$ROOT" >/dev/null 2>&1 || true
    log_event "design-exit" "accept" "$SPEC"
  else
    echo "Design-exit: schema valid but state transition rejected" >&2
    log_event "design-exit" "block" "$SPEC"
    exit 2
  fi
else
  log_event "design-exit" "noop" "$SPEC"
fi

exit 0
