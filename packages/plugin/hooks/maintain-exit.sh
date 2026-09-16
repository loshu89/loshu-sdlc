#!/usr/bin/env bash
# Maintain-exit gate: evaluates bands.yaml; if 3σ incident, requires new intent.md
# Plus: respects DAG state machine; deploy stage must be accepted.
# Plus: persists state transitions to .loshu-sdlc/state/cycle.json
# Plus: appends gate events to .loshu-sdlc/state/gates.jsonl
# Plus: forks a new cycle when a 3σ incident is detected (loop closure).

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
BANDS="$ROOT/bands.yaml"
REVIEW="$ROOT/REVIEW.md"
STATE_DIR="$ROOT/.loshu-sdlc/state"
CYCLE_FILE="$STATE_DIR/cycle.json"

mkdir -p "$STATE_DIR"

# Load debounce library; skip this gate run if we're still inside the
# settle period for bands.yaml (rapid-fire writes during tuning).
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
  if ! gate_should_run "$ROOT" "bands.yaml" 2; then
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
    --gate "$gate" --stage maintain --result "$result" \
    --cycle "$CURRENT_CYCLE" ${artifact:+--artifact "$artifact"} \
    >/dev/null 2>&1 || true
}

if [ ! -f "$BANDS" ]; then
  log_event "maintain-exit" "noop" ""
  exit 0
fi

# Cross-stage: REVIEW.md (deploy stage) must be accepted
if [ ! -f "$REVIEW" ]; then
  echo "Maintain-exit: REVIEW.md not found; required before bands.yaml" >&2
  log_event "maintain-exit" "block" "$BANDS"
  exit 2
fi

REVIEW_STATE=$(grep -E '^state:' "$REVIEW" | head -1 | awk '{print $2}' || true)
if [ -z "$REVIEW_STATE" ]; then
  REVIEW_STATE=$(grep -E '^status:' "$REVIEW" | head -1 | awk '{print $2}' || true)
fi
REVIEW_STATE="${REVIEW_STATE:-pending}"

if [ "$REVIEW_STATE" = "rejected" ] || [ "$REVIEW_STATE" = "archived" ]; then
  echo "Maintain-exit: REVIEW.md is $REVIEW_STATE; resolve upstream artifact first" >&2
  log_event "maintain-exit" "block" "$BANDS"
  exit 2
fi

if [ "$REVIEW_STATE" != "accepted" ]; then
  echo "Maintain-exit: REVIEW.md is '$REVIEW_STATE' (must be 'accepted')" >&2
  log_event "maintain-exit" "block" "$BANDS"
  exit 2
fi

# Read bands.yaml current state
BANDS_STATE=$(grep -E '^state:' "$BANDS" | head -1 | awk '{print $2}' || true)
if [ -z "$BANDS_STATE" ]; then
  BANDS_STATE=$(grep -E '^status:' "$BANDS" | head -1 | awk '{print $2}' || true)
fi
BANDS_STATE="${BANDS_STATE:-pending}"

case "$BANDS_STATE" in
  rejected|archived)
    echo "Maintain-exit: bands.yaml is $BANDS_STATE, allowing revision" >&2
    log_event "maintain-exit" "noop" "$BANDS"
    ;;
esac

# Validate schema
if ! node "$CLI_BIN" validate bands "$BANDS" --strict 2>/dev/null; then
  echo "Maintain-exit: bands.yaml failed schema validation" >&2
  log_event "maintain-exit" "block" "$BANDS"
  exit 2
fi

# Evaluate metrics — current values come from $ROOT/.sdlc/metrics.json sidecar
# (written by observability stack). If absent, we cannot evaluate; allow.
METRICS_FILE="$ROOT/.sdlc/metrics.json"
TRIPPED='{"incidents":[]}'
TRIPPED_METRIC=""
if [ -f "$METRICS_FILE" ]; then
  OBS_JSON=$(cat "$METRICS_FILE")
  EVAL_OUTPUT=$(node "$CLI_BIN" bands evaluate "$BANDS" --observations-json "$OBS_JSON" 2>/dev/null || echo '{"incidents":[]}')
  TRIPPED="$EVAL_OUTPUT"
  # Extract first 3sigma metric name for cycle origin.
  TRIPPED_METRIC=$(echo "$EVAL_OUTPUT" | grep -oE '"metric":"[^"]+"[^}]*"tier":"3sigma"' | head -1 | grep -oE '"metric":"[^"]+"' | head -1 | sed 's/"metric":"//;s/"//' || echo "")
fi

# If any 3σ incident and no new intent.md, block
if echo "$TRIPPED" | grep -q '"tier":[[:space:]]*"3sigma"'; then
  LATEST_INTENT="$ROOT/intent.md"
  if [ ! -f "$LATEST_INTENT" ] || ! grep -qE 'origin:[[:space:]]*maintain' "$LATEST_INTENT"; then
    echo "Maintain-exit: 3σ incident detected but no incident-driven intent.md found" >&2
    echo "Run /sdlc-maintain to investigate and generate a new intent.md" >&2
    log_event "maintain-exit" "block" "$BANDS"
    exit 2
  fi

  # Loop closure: archive the current cycle and fork a new incident-driven cycle.
  ORIGIN="maintain/3sigma:${TRIPPED_METRIC:-unknown_metric}"
  echo "Maintain-exit: 3σ incident on $TRIPPED_METRIC — forking incident cycle (origin: $ORIGIN)" >&2
  # Archive the cycle that's currently active (preserve history).
  node "$CLI_BIN" cycle archive "$ROOT" >/dev/null 2>&1 || true
  # Create a new incident-driven cycle. Title is the metric + UTC timestamp.
  TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "unknown-time")
  NEW_TITLE="Incident: ${TRIPPED_METRIC:-unknown_metric} ($TS)"
  node "$CLI_BIN" cycle new "$NEW_TITLE" --origin "$ORIGIN" "$ROOT" >/dev/null 2>&1 || true
  if [ -f "$SCRIPT_DIR/lib/event-emit.sh" ]; then
    emit_event "incident" "$CURRENT_CYCLE" "maintain" "bands-3sigma:${TRIPPED_METRIC:-unknown}"
  fi
  log_event "maintain-exit" "incident" "$BANDS"
fi

# Transition bands.yaml -> accepted when valid
if [ "$BANDS_STATE" = "draft" ] || [ "$BANDS_STATE" = "iterating" ]; then
  if node "$CLI_BIN" state maintain "$BANDS" --transition accepted 2>/dev/null; then
    echo "Maintain-exit: transitioned bands.yaml $BANDS_STATE -> accepted" >&2
    node "$CLI_BIN" cycle set maintain accepted "$ROOT" >/dev/null 2>&1 || true
    log_event "maintain-exit" "accept" "$BANDS"
  else
    echo "Maintain-exit: schema valid but state transition rejected" >&2
    log_event "maintain-exit" "block" "$BANDS"
    exit 2
  fi
else
  log_event "maintain-exit" "noop" "$BANDS"
fi

# Emit DAG event on successful validation (must run BEFORE exit 0)
if [ -f "$SCRIPT_DIR/lib/event-emit.sh" ]; then
  CYCLE_ID=$(grep -E '^cycle_id:' "$BANDS" 2>/dev/null | awk '{print $2}' | head -1 || true)
  if [ -z "${CYCLE_ID:-}" ]; then CYCLE_ID="$CURRENT_CYCLE"; fi
  ARTIFACT_ID=$(grep -E '^id:' "$BANDS" 2>/dev/null | awk '{print $2}' | head -1 || true)
  emit_event "validate" "$CYCLE_ID" "maintain" "${ARTIFACT_ID:-bands-c$CYCLE_ID}"
fi

exit 0
