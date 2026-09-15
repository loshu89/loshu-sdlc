#!/usr/bin/env bash
# Debounce library for loshu-sdlc PostToolUse gates.
#
# Strategy: "settle period" — after the last write to an artifact, wait
# `settle_seconds` before running the gate. If another write happens during the
# settle period, the timer resets. This prevents rapid-fire writes (e.g. during
# brainstorming of intent.md) from triggering expensive validation / DAG /
# cycle operations on every keystroke.
#
# The library is POSIX-sh compatible. Each artifact has an independent marker
# file under `.loshu-sdlc/state/.debounce/`. The marker stores the epoch seconds
# of the most recent call; on every call we update the marker to "now", so the
# next call only fires if `now - last >= settle_seconds`.

# Returns 0 if the gate should run (settle period elapsed), 1 otherwise.
# Updates the artifact's marker on each call so the timer resets.
#
# Args:
#   $1 — project root (where `.loshu-sdlc/` lives)
#   $2 — artifact path/name (e.g. "intent.md"); slashes are flattened to underscores
#   $3 — settle period in seconds (default 2; override with LOSHU_SDLC_DEBOUNCE_SECONDS)
#
# Side effect: writes `.loshu-sdlc/state/.debounce/<safe-name>.lastwrite` with
# the current epoch.
gate_should_run() {
  local root="$1"
  local artifact="$2"
  local settle_seconds="${3:-${LOSHU_SDLC_DEBOUNCE_SECONDS:-2}}"

  local debounce_dir="$root/.loshu-sdlc/state/.debounce"
  local safe_name
  safe_name=$(echo "$artifact" | tr '/' '_')
  local marker="$debounce_dir/${safe_name}.lastwrite"
  local now
  now=$(date +%s)

  mkdir -p "$debounce_dir"

  local last
  last=$(cat "$marker" 2>/dev/null || echo 0)
  local diff=$((now - last))

  # Always update marker to "now" — this resets the timer on every call.
  echo "$now" > "$marker"

  # Run only if the last call was at least settle_seconds ago.
  if [ "$diff" -ge "$settle_seconds" ]; then
    return 0
  else
    return 1
  fi
}

# Returns 0 if `gate_should_run` is available (always true when this file is
# sourced). Provided so callers can guard with a single function check.
debounce_available() {
  return 0
}
