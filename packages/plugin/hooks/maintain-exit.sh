#!/usr/bin/env bash
# Maintain-exit gate: evaluates bands.yaml; if 3σ incident, requires new intent.md
# Plus: respects DAG state machine; deploy stage must be accepted.

set -euo pipefail

ROOT="${1:-.}"
BANDS="$ROOT/bands.yaml"
REVIEW="$ROOT/REVIEW.md"

if [ ! -f "$BANDS" ]; then
  exit 0
fi

# Cross-stage: REVIEW.md (deploy stage) must be accepted
if [ ! -f "$REVIEW" ]; then
  echo "Maintain-exit: REVIEW.md not found; required before bands.yaml" >&2
  exit 2
fi

REVIEW_STATE=$(grep -E '^state:' "$REVIEW" | head -1 | awk '{print $2}' || true)
if [ -z "$REVIEW_STATE" ]; then
  REVIEW_STATE=$(grep -E '^status:' "$REVIEW" | head -1 | awk '{print $2}' || true)
fi
REVIEW_STATE="${REVIEW_STATE:-pending}"

if [ "$REVIEW_STATE" = "rejected" ] || [ "$REVIEW_STATE" = "archived" ]; then
  echo "Maintain-exit: REVIEW.md is $REVIEW_STATE; resolve upstream artifact first" >&2
  exit 2
fi

if [ "$REVIEW_STATE" != "accepted" ]; then
  echo "Maintain-exit: REVIEW.md is '$REVIEW_STATE' (must be 'accepted')" >&2
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
    ;;
esac

# Validate schema
if ! npx --no-install loshu-sdlc validate bands "$BANDS" --strict 2>/dev/null; then
  echo "Maintain-exit: bands.yaml failed schema validation" >&2
  exit 2
fi

# Evaluate metrics — current values come from $ROOT/.sdlc/metrics.json sidecar
# (written by observability stack). If absent, we cannot evaluate; allow.
METRICS_FILE="$ROOT/.sdlc/metrics.json"
TRIPPED='{"incidents":[]}'
if [ -f "$METRICS_FILE" ]; then
  OBS_JSON=$(cat "$METRICS_FILE")
  TRIPPED=$(npx --no-install loshu-sdlc bands evaluate "$BANDS" --observations-json "$OBS_JSON" 2>/dev/null || echo '{"incidents":[]}')
fi

# If any 3σ incident and no new intent.md, block
if echo "$TRIPPED" | grep -q '"tier":\s*"3sigma"'; then
  LATEST_INTENT="$ROOT/intent.md"
  if [ ! -f "$LATEST_INTENT" ] || ! grep -qE 'origin:\s*maintain' "$LATEST_INTENT"; then
    echo "Maintain-exit: 3σ incident detected but no incident-driven intent.md found" >&2
    echo "Run /sdlc-maintain to investigate and generate a new intent.md" >&2
    exit 2
  fi
fi

# Transition bands.yaml -> accepted when valid
if [ "$BANDS_STATE" = "draft" ] || [ "$BANDS_STATE" = "iterating" ]; then
  if npx --no-install loshu-sdlc state maintain "$BANDS" --transition accepted 2>/dev/null; then
    echo "Maintain-exit: transitioned bands.yaml $BANDS_STATE -> accepted" >&2
  else
    echo "Maintain-exit: schema valid but state transition rejected" >&2
    exit 2
  fi
fi

exit 0