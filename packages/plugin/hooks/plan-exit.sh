#!/usr/bin/env bash
# Plan-exit gate: validates intent.md against intent.schema.json
# Exit 0 = allow, Exit 2 = block

set -euo pipefail

ROOT="${1:-.}"
INTENT="$ROOT/intent.md"

if [ ! -f "$INTENT" ]; then
  echo "Plan-exit: $INTENT not found" >&2
  exit 0  # Missing artifact is not an error during creation
fi

# Schema path (relative to loshu-sdlc install)
SCHEMA="$ROOT/.claude/plugins/loshu-sdlc/packages/plugin/schemas/intent.schema.json"
if [ ! -f "$SCHEMA" ]; then
  # Try alternate locations
  for candidate in \
    "$ROOT/node_modules/@loshu-sdlc/plugin/schemas/intent.schema.json" \
    "$ROOT/.claude/plugins/loshu-sdlc/schemas/intent.schema.json"; do
    if [ -f "$candidate" ]; then
      SCHEMA="$candidate"
      break
    fi
  done
fi

if [ ! -f "$SCHEMA" ]; then
  echo "Plan-exit: schema not found; skipping validation" >&2
  exit 0
fi

# Validate via loshu-sdlc CLI (use npx for portability)
if ! npx --no-install loshu-sdlc validate intent "$INTENT" --strict 2>/dev/null; then
  echo "Plan-exit: intent.md failed schema validation" >&2
  echo "Run: loshu-sdlc validate intent $INTENT --verbose" >&2
  exit 2
fi

exit 0