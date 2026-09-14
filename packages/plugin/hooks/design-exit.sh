#!/usr/bin/env bash
# Design-exit gate: validates spec.md against spec.schema.json
# Plus: ensures intent.md exists and has status: accepted

set -euo pipefail

ROOT="${1:-.}"
SPEC="$ROOT/spec.md"
INTENT="$ROOT/intent.md"

if [ ! -f "$SPEC" ]; then
  exit 0  # Not an error during creation
fi

# Check intent.md is accepted
if [ ! -f "$INTENT" ]; then
  echo "Design-exit: intent.md not found; create it via /sdlc-plan first" >&2
  exit 2
fi

if ! grep -qE '^status:\s*accepted' "$INTENT"; then
  echo "Design-exit: intent.md is not accepted (status != accepted)" >&2
  exit 2
fi

# Validate spec.md
if ! npx --no-install loshu-sdlc validate spec "$SPEC" --strict 2>/dev/null; then
  echo "Design-exit: spec.md failed schema validation" >&2
  echo "Run: loshu-sdlc validate spec $SPEC --verbose" >&2
  exit 2
fi

exit 0