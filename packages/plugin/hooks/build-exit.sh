#!/usr/bin/env bash
# Build-exit gate: validates plan.md + CLAUDE.md has verification block

set -euo pipefail

ROOT="${1:-.}"
PLAN="$ROOT/plan.md"
CLAUDE_MD="$ROOT/CLAUDE.md"

if [ ! -f "$PLAN" ]; then
  exit 0
fi

# Validate plan.md
if ! npx --no-install loshu-sdlc validate plan "$PLAN" --strict 2>/dev/null; then
  echo "Build-exit: plan.md failed schema validation" >&2
  exit 2
fi

# CLAUDE.md must exist with verification block
if [ ! -f "$CLAUDE_MD" ]; then
  echo "Build-exit: CLAUDE.md not found; required for verification block" >&2
  exit 2
fi

if ! grep -qE '^## Verification block' "$CLAUDE_MD"; then
  echo "Build-exit: CLAUDE.md missing 'Verification block' section" >&2
  exit 2
fi

exit 0