#!/usr/bin/env bash
# Test-exit gate: runs verification block (build/test/lint/typecheck) + coverage

set -euo pipefail

ROOT="${1:-.}"
CLAUDE_MD="$ROOT/CLAUDE.md"

if [ ! -f "$CLAUDE_MD" ]; then
  exit 0
fi

# Extract commands from verification block
BUILD=$(grep -A 1 'Build:' "$CLAUDE_MD" | tail -1 | sed 's/.*`\(.*\)`.*/\1/' || echo "")
LINT=$(grep -A 1 'Lint:' "$CLAUDE_MD" | tail -1 | sed 's/.*`\(.*\)`.*/\1/' || echo "")
TEST=$(grep -A 1 'Test:' "$CLAUDE_MD" | tail -1 | sed 's/.*`\(.*\)`.*/\1/' || echo "")
TYPECHECK=$(grep -A 1 'Type-check:' "$CLAUDE_MD" | tail -1 | sed 's/.*`\(.*\)`.*/\1/' || echo "")

cd "$ROOT"

# Run build
if [ -n "$BUILD" ]; then
  if ! bash -c "$BUILD" >/dev/null 2>&1; then
    echo "Test-exit: build failed ($BUILD)" >&2
    exit 2
  fi
fi

# Run typecheck
if [ -n "$TYPECHECK" ]; then
  if ! bash -c "$TYPECHECK" >/dev/null 2>&1; then
    echo "Test-exit: typecheck failed ($TYPECHECK)" >&2
    exit 2
  fi
fi

# Run lint
if [ -n "$LINT" ]; then
  if ! bash -c "$LINT" >/dev/null 2>&1; then
    echo "Test-exit: lint failed ($LINT)" >&2
    exit 2
  fi
fi

# Run test
if [ -n "$TEST" ]; then
  if ! bash -c "$TEST" >/dev/null 2>&1; then
    echo "Test-exit: test failed ($TEST)" >&2
    exit 2
  fi
fi

exit 0