#!/usr/bin/env bash
# Plan-exit gate: validates intent.md AND checks state transitions
# Plus: persists state transitions to .loshu-sdlc/state/cycle.json
# Plus: appends gate events to .loshu-sdlc/state/gates.jsonl
# Exit 0 = allow, Exit 2 = block

set -euo pipefail

ROOT="${1:-.}"
INTENT="$ROOT/intent.md"
STATE_DIR="$ROOT/.loshu-sdlc/state"
CYCLE_FILE="$STATE_DIR/cycle.json"
GATES_LOG="$STATE_DIR/gates.jsonl"

mkdir -p "$STATE_DIR"

log_event() {
  local gate="$1"
  local result="$2"
  local artifact="${3:-}"
  local extra="${4:-}"
  if [ -n "$extra" ]; then
    npx --no-install loshu-sdlc cycle append-event \
      --gate "$gate" --stage plan --result "$result" \
      --cycle "${CURRENT_CYCLE:-0}" ${artifact:+--artifact "$artifact"} \
      ${extra} >/dev/null 2>&1 || true
  else
    npx --no-install loshu-sdlc cycle append-event \
      --gate "$gate" --stage plan --result "$result" \
      --cycle "${CURRENT_CYCLE:-0}" ${artifact:+--artifact "$artifact"} \
      >/dev/null 2>&1 || true
  fi
}

# Read current cycle id (or 0 if no file yet).
CURRENT_CYCLE=0
if [ -f "$CYCLE_FILE" ]; then
  CURRENT_CYCLE=$(grep -oE '"current_cycle":[[:space:]]*[0-9]+' "$CYCLE_FILE" | grep -oE '[0-9]+' | head -1 || echo 0)
fi

if [ ! -f "$INTENT" ]; then
  echo "Plan-exit: $INTENT not found" >&2
  log_event "plan-exit" "noop" ""
  exit 0  # Missing artifact is not an error during creation
fi

# Read current state from frontmatter (state: <value>)
CURRENT=$(grep -E '^state:' "$INTENT" | head -1 | awk '{print $2}' || true)
# Fall back to legacy status: field
if [ -z "$CURRENT" ]; then
  CURRENT=$(grep -E '^status:' "$INTENT" | head -1 | awk '{print $2}' || true)
fi
CURRENT="${CURRENT:-pending}"

# If already rejected or archived, allow revision without blocking
case "$CURRENT" in
  rejected|archived)
    echo "Plan-exit: $CURRENT state, allowing revision" >&2
    log_event "plan-exit" "noop" "$INTENT"
    exit 0
    ;;
esac

# If state is blocked, surface blocker info but still allow edit (cannot
# transition to accepted without resolving the blocker).
if [ "$CURRENT" = "blocked" ]; then
  echo "Plan-exit: blocked state; resolve blocker before advancing to accepted" >&2
fi

# Auto-create a cycle if one doesn't exist yet (P0-1).
if [ ! -f "$CYCLE_FILE" ] || [ "$CURRENT_CYCLE" = "0" ]; then
  TITLE=$(grep -E '^title:' "$INTENT" | head -1 | sed 's/^title:[[:space:]]*//' | tr -d '\r' || echo "untitled")
  if [ -z "$TITLE" ]; then
    TITLE="untitled cycle"
  fi
  echo "Plan-exit: creating new cycle for: $TITLE" >&2
  NEW_ID=$(npx --no-install loshu-sdlc cycle new "$TITLE" "$ROOT" 2>/dev/null | grep -oE 'cycle [0-9]+' | grep -oE '[0-9]+' | head -1 || echo 0)
  CURRENT_CYCLE="$NEW_ID"
fi

# Schema path (relative to loshu-sdlc install)
SCHEMA="$ROOT/.claude/plugins/loshu-sdlc/packages/plugin/schemas/intent.schema.json"
if [ ! -f "$SCHEMA" ]; then
  for candidate in \
    "$ROOT/node_modules/@loshu89/plugin/schemas/intent.schema.json" \
    "$ROOT/.claude/plugins/loshu-sdlc/schemas/intent.schema.json"; do
    if [ -f "$candidate" ]; then
      SCHEMA="$candidate"
      break
    fi
  done
fi

if [ ! -f "$SCHEMA" ]; then
  echo "Plan-exit: schema not found; skipping validation" >&2
  log_event "plan-exit" "noop" "$INTENT"
  exit 0
fi

# Validate via loshu-sdlc CLI (use npx for portability)
if ! npx --no-install loshu-sdlc validate intent "$INTENT" --strict 2>/dev/null; then
  echo "Plan-exit: intent.md failed schema validation" >&2
  echo "Run: loshu-sdlc validate intent $INTENT --verbose" >&2
  log_event "plan-exit" "block" "$INTENT"
  exit 2
fi

# On validation success, attempt to transition state -> accepted
# (only legal when current state is draft or iterating).
if [ "$CURRENT" = "draft" ] || [ "$CURRENT" = "iterating" ]; then
  if npx --no-install loshu-sdlc state plan "$INTENT" --transition accepted 2>/dev/null; then
    echo "Plan-exit: transitioned intent.md $CURRENT -> accepted" >&2
    # P0-1: persist stage transition to cycle.json
    npx --no-install loshu-sdlc cycle set plan accepted "$ROOT" >/dev/null 2>&1 || true
    log_event "plan-exit" "accept" "$INTENT"
  else
    echo "Plan-exit: schema valid but state transition rejected" >&2
    log_event "plan-exit" "block" "$INTENT"
    exit 2
  fi
else
  # Pending / other state — schema is valid but we did not transition.
  log_event "plan-exit" "noop" "$INTENT"
fi

exit 0
