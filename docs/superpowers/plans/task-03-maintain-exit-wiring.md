# Task 3: Wire diagnose into `maintain-exit.sh` + shell test

**Goal:** Modify `packages/plugin/hooks/maintain-exit.sh` to call `loshu-sdlc maintain diagnose` before the existing 3σ block branch. On success, the hook exits 0 (no block). On failure or timeout, fall back to today's "block and tell user to run /sdlc-maintain" behavior.

**Spec:** `docs/superpowers/specs/2026-09-20-v0.9.0-design.md` §Components.2 (`maintain-exit.sh` change) and §Data Flow.

**Files:**
- Modify: `packages/plugin/hooks/maintain-exit.sh`
- Create: `packages/plugin/hooks/tests/maintain-diagnose.test.sh` (new shell test)

---

- [ ] **Step 1: Read current `maintain-exit.sh` lines 118-148 (the 3σ fork branch)**

From `D:/workspace/3.my/SDLC/packages/plugin/hooks/maintain-exit.sh`, find:
- The line where `LATEST_INTENT="$ROOT/intent.md"` is set (line ~130).
- The branch that runs `[ ! -f "$LATEST_INTENT" ] || ! grep -qE 'origin:[[:space:]]*maintain' "$LATEST_INTENT"` (line ~131).
- The block branch (`echo "Maintain-exit: 3σ incident detected but no incident-driven intent.md found"` ~line 132).
- The fork-and-emit branch (line ~139+).

The new branch goes between line 131 (the test) and line 132 (the block). If the test fails AND `loshu-sdlc maintain diagnose` succeeds, skip the block; otherwise keep today's behavior.

- [ ] **Step 2: Modify `maintain-exit.sh` to add the diagnose-before-block branch**

Edit around the existing block branch:

```bash
  LATEST_INTENT="$ROOT/intent.md"
  # v0.9.0: try to auto-diagnose via `loshu-sdlc maintain diagnose` (10s timeout).
  # On success, this writes incident intent.md and the gate passes.
  # On failure or timeout, fall through to the existing block branch.
  if [ ! -f "$LATEST_INTENT" ] || ! grep -qE 'origin:[[:space:]]*maintain' "$LATEST_INTENT"; then
    if timeout 10 node "$CLI_BIN" maintain diagnose "$BANDS" "$LATEST_INTENT" >/dev/null 2>&1; then
      echo "Maintain-exit: auto-diagnosed incident, wrote $LATEST_INTENT" >&2
    else
      echo "Maintain-exit: 3σ incident detected but no incident-driven intent.md found" >&2
      echo "Run /sdlc-maintain to investigate and generate a new intent.md" >&2
      log_event "maintain-exit" "block" "$BANDS"
      exit 2
    fi
  fi
```

Notes:
- `node "$CLI_BIN"` reuses the existing `CLI_BIN` variable resolution pattern (already present elsewhere in the file).
- `timeout 10` is POSIX; on Windows where `timeout` is unavailable, the hook falls through to today's block behavior (the `if` wrapper around `timeout` is in fact harmless — on Windows `timeout` is treated as a normal command and likely fails, so the `else` branch executes). On Windows, v0.9.0 closes the loop only via manual `/sdlc-maintain` (same as today). This is acceptable — Windows hook parity is tracked as a follow-up.
- The `>/dev/null 2>&1` suppresses the JSON output of `maintain diagnose`; only the error path needs to surface.
- If `CLI_BIN` is empty (no path resolved), `node ""` will fail; the `else` branch handles it gracefully.

- [ ] **Step 3: Write the shell test**

Create `packages/plugin/hooks/tests/maintain-diagnose.test.sh`:

```bash
#!/usr/bin/env bash
# Tests for the v0.9.0 maintain-exit.sh auto-diagnose branch.
# Verifies:
#   - When maintain diagnose succeeds, hook exits 0 (no block).
#   - When maintain diagnose fails (CLI not present or returns non-zero), hook
#     exits 2 (today's block behavior) with a helpful stderr message.
#
# Pattern: stub `loshu-sdlc` with a fake script that returns a canned
# exit code. This tests the hook's logic without depending on a real
# CLI build.

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
HOOK="$SCRIPT_DIR/../maintain-exit.sh"
if [ ! -x "$HOOK" ]; then
  echo "FAIL: hook not found or not executable: $HOOK" >&2
  exit 1
fi

PASS=0; FAIL=0
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# Helper: write a bands.yaml with one metric + a metrics.json with one value
setup_bands() {
  local metric_value="$1"
  mkdir -p "$TMP/.loshu-sdlc/state" "$TMP/.sdlc"
  cat > "$TMP/bands.yaml" <<EOF
id: bands-c01-test-0001-01HXYZBANDS
schema_version: 0.5.0
cycle_id: 1
stage: maintain
state: draft
created_at: 2026-01-01T00:00:00Z
created_by: human:test
version: 1
metrics:
  - name: error_rate
    baseline: 0.01
    sigma_1: 0.015
    sigma_2: 0.02
    sigma_3: 0.03
    unit: ratio
    window: 1h
evaluation:
  interval: 5m
  on_3sigma: block_maintain_exit
  on_2sigma: warn
  on_1sigma: log
EOF
  echo "{\"error_rate\": $metric_value}" > "$TMP/.sdlc/metrics.json"
  cat > "$TMP/.loshu-sdlc/state/cycle.json" <<EOF
{"version": 1, "current_cycle": 1, "cycles": {"1": {"id": 1, "title": "demo", "created_at": "2026-01-01T00:00:00Z", "origin": null, "stages": {}}}}
EOF
}

# Helper: stub `loshu-sdlc` on PATH to return either success or failure
stub_cli() {
  local mode="$1"
  local stub_dir="$TMP/stub-bin-$mode"
  mkdir -p "$stub_dir"
  cat > "$stub_dir/loshu-sdlc" <<EOF
#!/usr/bin/env bash
# Stub CLI for testing maintain-exit.sh
case "\$1 \$2 \$3" in
  "maintain diagnose"*)
    if [ "$mode" = "success" ]; then
      # Write a minimal incident intent.md
      cat > "\$4" <<INTENT
---
id: plan-c02-error-rate-0001-01HXYZSTUB
schema_version: '0.5.0'
cycle_id: 2
stage: plan
state: draft
created_at: 2026-09-20T00:00:00Z
created_by: system:test
origin: maintain/3sigma:error_rate
title: Incident: error_rate (test)
problem: 'TODO'
proposedOutcome: 'TODO'
affectedUsersAndSystems:
  - 'TODO'
openQuestions: []
---
INTENT
      exit 0
    else
      exit 1
    fi
    ;;
  *)
    # Pass through other commands; this stub shouldn't be hit
    echo "stub-cli: unexpected invocation: \$@" >&2
    exit 99
    ;;
esac
EOF
  chmod +x "$stub_dir/loshu-sdlc"
  echo "$stub_dir"
}

# Helper: run the hook with a stub CLI on PATH
run_hook() {
  local stub_dir="$1"
  (cd "$TMP" && PATH="$stub_dir:$PATH" bash "$HOOK" "$TMP")
  return $?
}

# Test 1: stub CLI succeeds → hook exits 0, intent.md exists
echo "Test 1: diagnose success → exit 0"
setup_bands 0.045  # 3σ breach
stub_bin=$(stub_cli success)
set +e
out=$(run_hook "$stub_bin")
rc=$?
set -e
if [ "$rc" -eq 0 ] && [ -f "$TMP/intent.md" ] && grep -q "origin: maintain/3sigma" "$TMP/intent.md"; then
  echo "  PASS"
  PASS=$((PASS+1))
else
  echo "  FAIL: rc=$rc, output=$out" >&2
  FAIL=$((FAIL+1))
fi

# Test 2: stub CLI fails → hook exits 2 (today's block)
echo "Test 2: diagnose failure → exit 2"
rm -rf "$TMP/intent.md"
setup_bands 0.045
stub_bin=$(stub_cli failure)
set +e
out=$(run_hook "$stub_bin" 2>&1)
rc=$?
set -e
if [ "$rc" -eq 2 ] && echo "$out" | grep -q "Run /sdlc-maintain"; then
  echo "  PASS"
  PASS=$((PASS+1))
else
  echo "  FAIL: rc=$rc, output=$out" >&2
  FAIL=$((FAIL+1))
fi

# Test 3: no breach in metrics → hook exits 0 (no block, no PR open)
echo "Test 3: no breach → exit 0 (no block)"
rm -rf "$TMP/intent.md"
setup_bands 0.011  # below sigma_1
stub_bin=$(stub_cli success)  # shouldn't be called
set +e
out=$(run_hook "$stub_bin")
rc=$?
set -e
if [ "$rc" -eq 0 ]; then
  echo "  PASS"
  PASS=$((PASS+1))
else
  echo "  FAIL: rc=$rc, output=$out" >&2
  FAIL=$((FAIL+1))
fi

echo ""
echo "Maintain-diagnose shell tests: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ]
```

- [ ] **Step 4: Make the test file executable**

Run: `chmod +x packages/plugin/hooks/tests/maintain-diagnose.test.sh`

- [ ] **Step 5: Run the shell test (red → green)**

Run: `bash packages/plugin/hooks/tests/maintain-diagnose.test.sh`
Expected: 3 passed.

If the test fails because `maintain-exit.sh` doesn't yet have the new branch (e.g., you did Step 2 first), the test should still pass since the hook's "no breach → exit 0" path doesn't depend on the diagnose branch.

- [ ] **Step 6: Run the vitest gauntlet (no vitest changes expected, but verify the new branch doesn't break existing tests)**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 234/234 (no new vitest tests; shell tests are separate).

- [ ] **Step 7: Commit**

```bash
git add packages/plugin/hooks/maintain-exit.sh \
        packages/plugin/hooks/tests/maintain-diagnose.test.sh
git commit -m "feat(hooks): maintain-exit auto-diagnoses before blocking (10s timeout)

Adds a new branch in maintain-exit.sh:
  - When 3sigma is detected AND no incident intent.md exists, try
    'timeout 10 loshu-sdlc maintain diagnose <bands> <intent>'.
  - On success: hook exits 0 (the new intent.md satisfies the gate).
  - On failure or timeout: fall back to today's block behavior
    with 'Run /sdlc-maintain to investigate' message.

This closes the Maintain -> Plan loop per the AI-Native SDLC
playbook. Combined with Task 2's stub (structured fields populated,
natural-language fields marked TODO for the agent to fill in), the
loop now closes without manual /sdlc-maintain invocation. Future
v0.10+ may replace the TODO scaffold with an LLM synthesis call.

Windows note: 'timeout' is not available by default on Windows;
the hook falls through to today's block path on Windows (manual
/sdlc-maintain required). Windows hook parity is tracked as
follow-up.

Adds 3 shell tests covering the success, failure-fallback, and
no-breach paths."
```
