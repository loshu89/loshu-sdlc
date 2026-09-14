#!/usr/bin/env bash
# Deploy-exit gate: validates REVIEW.md; blocks if any section status: fail

set -euo pipefail

ROOT="${1:-.}"
REVIEW="$ROOT/REVIEW.md"

if [ ! -f "$REVIEW" ]; then
  exit 0
fi

# Validate schema
if ! npx --no-install loshu-sdlc validate review "$REVIEW" --strict 2>/dev/null; then
  echo "Deploy-exit: REVIEW.md failed schema validation" >&2
  exit 2
fi

# Check for any status: fail
if grep -E '^Status: fail' "$REVIEW"; then
  echo "Deploy-exit: REVIEW.md has status: fail in at least one section" >&2
  echo "Fix findings and re-run /sdlc-deploy" >&2
  exit 2
fi

exit 0