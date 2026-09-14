#!/usr/bin/env bash
# Maintain-exit gate: evaluates bands.yaml; if 3σ incident, requires new intent.md

set -euo pipefail

ROOT="${1:-.}"
BANDS="$ROOT/bands.yaml"

if [ ! -f "$BANDS" ]; then
  exit 0
fi

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

exit 0