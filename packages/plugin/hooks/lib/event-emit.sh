#!/usr/bin/env bash
# Shared event emitter for SDLC hooks.
# Usage: source this file, then call emit_event <event_type> <cycle_id> <stage> <artifact_id>
# Writes one JSON line to $ROOT/.loshu-sdlc/state/events.jsonl.

set -euo pipefail

emit_event() {
  local event_type="$1"
  local cycle_id="$2"
  local stage="$3"
  local artifact_id="$4"
  local actor="${LOSHU_HOOK_ACTOR:-hook:${0##*/}}"
  local ts
  ts=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  local branch="${LOSHU_CURRENT_BRANCH:-}"
  # Bare JSON value: number when set, null when unset (empty would be invalid JSON).
  local pr_number="${LOSHU_CURRENT_PR:-null}"
  local events_file="$ROOT/.loshu-sdlc/state/events.jsonl"
  mkdir -p "$(dirname "$events_file")"
  [ -f "$events_file" ] && chmod 0644 "$events_file" || touch "$events_file"
  local event_id
  event_id=$(date +%s%N | sha256sum | cut -c1-26)
  local json
  json=$(cat <<EOF2
{"event_id":"$event_id","ts":"$ts","schema_version":"1.0.0","event":"$event_type","cycle_id":$cycle_id,"stage":"$stage","artifact_id":"$artifact_id","actor":{"type":"hook","id":"$actor"},"git":{"branch":"$branch","pr_number":$pr_number}}
EOF2
)
  printf '%s\n' "$json" >> "$events_file"
  chmod 0444 "$events_file"
}