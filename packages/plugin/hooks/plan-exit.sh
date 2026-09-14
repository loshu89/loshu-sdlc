#!/usr/bin/env bash
# Plan-exit gate: validates intent.md AND checks state transitions
# Exit 0 = allow, Exit 2 = block

set -euo pipefail

ROOT="${1:-.}"
INTENT="$ROOT/intent.md"

if [ ! -f "$INTENT" ]; then
  echo "Plan-exit: $INTENT not found" >&2
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
    exit 0
    ;;
esac

# If state is blocked, surface blocker info but still allow edit (cannot
# transition to accepted without resolving the blocker).
if [ "$CURRENT" = "blocked" ]; then
  echo "Plan-exit: blocked state; resolve blocker before advancing to accepted" >&2
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
  exit 0
fi

# Validate via loshu-sdlc CLI (use npx for portability)
if ! npx --no-install loshu-sdlc validate intent "$INTENT" --strict 2>/dev/null; then
  echo "Plan-exit: intent.md failed schema validation" >&2
  echo "Run: loshu-sdlc validate intent $INTENT --verbose" >&2
  exit 2
fi

# On validation success, attempt to transition state -> accepted
# (only legal when current state is draft or iterating).
if [ "$CURRENT" = "draft" ] || [ "$CURRENT" = "iterating" ]; then
  if npx --no-install loshu-sdlc state plan "$INTENT" --transition accepted 2>/dev/null; then
    echo "Plan-exit: transitioned intent.md $CURRENT -> accepted" >&2
  else
    echo "Plan-exit: schema valid but state transition rejected" >&2
    exit 2
  fi
fi

exit 0