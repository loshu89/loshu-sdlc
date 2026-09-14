#!/usr/bin/env bash
# Deploy-exit gate: validates REVIEW.md + respects DAG state machine
# Plus: blocks if any section status: fail
# plan.md must be accepted before deploy can advance.

set -euo pipefail

ROOT="${1:-.}"
REVIEW="$ROOT/REVIEW.md"
PLAN="$ROOT/plan.md"

if [ ! -f "$REVIEW" ]; then
  exit 0
fi

# Cross-stage: plan.md must be accepted
if [ ! -f "$PLAN" ]; then
  echo "Deploy-exit: plan.md not found; required before REVIEW.md" >&2
  exit 2
fi

PLAN_STATE=$(grep -E '^state:' "$PLAN" | head -1 | awk '{print $2}' || true)
if [ -z "$PLAN_STATE" ]; then
  PLAN_STATE=$(grep -E '^status:' "$PLAN" | head -1 | awk '{print $2}' || true)
fi
PLAN_STATE="${PLAN_STATE:-pending}"

if [ "$PLAN_STATE" = "rejected" ] || [ "$PLAN_STATE" = "archived" ]; then
  echo "Deploy-exit: plan.md is $PLAN_STATE; resolve upstream artifact first" >&2
  exit 2
fi

if [ "$PLAN_STATE" != "accepted" ]; then
  echo "Deploy-exit: plan.md is '$PLAN_STATE' (must be 'accepted')" >&2
  exit 2
fi

# Read REVIEW.md current state
REVIEW_STATE=$(grep -E '^state:' "$REVIEW" | head -1 | awk '{print $2}' || true)
if [ -z "$REVIEW_STATE" ]; then
  REVIEW_STATE=$(grep -E '^status:' "$REVIEW" | head -1 | awk '{print $2}' || true)
fi
REVIEW_STATE="${REVIEW_STATE:-pending}"

case "$REVIEW_STATE" in
  rejected|archived)
    echo "Deploy-exit: REVIEW.md is $REVIEW_STATE, allowing revision" >&2
    ;;
esac

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

# Transition REVIEW.md -> accepted when valid
if [ "$REVIEW_STATE" = "draft" ] || [ "$REVIEW_STATE" = "iterating" ]; then
  if npx --no-install loshu-sdlc state deploy "$REVIEW" --transition accepted 2>/dev/null; then
    echo "Deploy-exit: transitioned REVIEW.md $REVIEW_STATE -> accepted" >&2
  else
    echo "Deploy-exit: schema valid but state transition rejected" >&2
    exit 2
  fi
fi

exit 0