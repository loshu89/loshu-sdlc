#!/usr/bin/env bash
# Build-exit gate: validates plan.md + CLAUDE.md has verification block
# Plus: respects DAG state machine; spec.md must be accepted
# Plus: persists state transitions to .loshu-sdlc/state/cycle.json
# Plus: appends gate events to .loshu-sdlc/state/gates.jsonl

set -euo pipefail

ROOT="${1:-.}"
PLAN="$ROOT/plan.md"
SPEC="$ROOT/spec.md"
CLAUDE_MD="$ROOT/CLAUDE.md"
STATE_DIR="$ROOT/.loshu-sdlc/state"
CYCLE_FILE="$STATE_DIR/cycle.json"

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
    --gate "$gate" --stage build --result "$result" \
    --cycle "$CURRENT_CYCLE" ${artifact:+--artifact "$artifact"} \
    >/dev/null 2>&1 || true
}

if [ ! -f "$PLAN" ]; then
  log_event "build-exit" "noop" ""
  exit 0
fi

# Cross-stage: spec.md must be accepted before plan can advance
if [ ! -f "$SPEC" ]; then
  echo "Build-exit: spec.md not found; required before plan.md" >&2
  log_event "build-exit" "block" "$PLAN"
  exit 2
fi

SPEC_STATE=$(grep -E '^state:' "$SPEC" | head -1 | awk '{print $2}' || true)
if [ -z "$SPEC_STATE" ]; then
  SPEC_STATE=$(grep -E '^status:' "$SPEC" | head -1 | awk '{print $2}' || true)
fi
SPEC_STATE="${SPEC_STATE:-pending}"

if [ "$SPEC_STATE" = "rejected" ] || [ "$SPEC_STATE" = "archived" ]; then
  echo "Build-exit: spec.md is $SPEC_STATE; resolve upstream artifact first" >&2
  log_event "build-exit" "block" "$PLAN"
  exit 2
fi

if [ "$SPEC_STATE" != "accepted" ]; then
  echo "Build-exit: spec.md is '$SPEC_STATE' (must be 'accepted')" >&2
  log_event "build-exit" "block" "$PLAN"
  exit 2
fi

# Read plan.md current state
PLAN_STATE=$(grep -E '^state:' "$PLAN" | head -1 | awk '{print $2}' || true)
if [ -z "$PLAN_STATE" ]; then
  PLAN_STATE=$(grep -E '^status:' "$PLAN" | head -1 | awk '{print $2}' || true)
fi
PLAN_STATE="${PLAN_STATE:-pending}"

# Allow revision if plan is rejected/archived
case "$PLAN_STATE" in
  rejected|archived)
    echo "Build-exit: plan.md is $PLAN_STATE, allowing revision" >&2
    log_event "build-exit" "noop" "$PLAN"
    ;;
esac

# Validate plan.md
if ! npx --no-install loshu-sdlc validate plan "$PLAN" --strict 2>/dev/null; then
  echo "Build-exit: plan.md failed schema validation" >&2
  log_event "build-exit" "block" "$PLAN"
  exit 2
fi

# CLAUDE.md must exist with verification block
if [ ! -f "$CLAUDE_MD" ]; then
  echo "Build-exit: CLAUDE.md not found; required for verification block" >&2
  log_event "build-exit" "block" "$PLAN"
  exit 2
fi

if ! grep -qE '^## Verification block' "$CLAUDE_MD"; then
  echo "Build-exit: CLAUDE.md missing 'Verification block' section" >&2
  log_event "build-exit" "block" "$PLAN"
  exit 2
fi

# Transition plan -> accepted when valid
if [ "$PLAN_STATE" = "draft" ] || [ "$PLAN_STATE" = "iterating" ]; then
  if npx --no-install loshu-sdlc state build "$PLAN" --transition accepted 2>/dev/null; then
    echo "Build-exit: transitioned plan.md $PLAN_STATE -> accepted" >&2
    npx --no-install loshu-sdlc cycle set build accepted "$ROOT" >/dev/null 2>&1 || true
    log_event "build-exit" "accept" "$PLAN"
  else
    echo "Build-exit: schema valid but state transition rejected" >&2
    log_event "build-exit" "block" "$PLAN"
    exit 2
  fi
else
  log_event "build-exit" "noop" "$PLAN"
fi

exit 0
