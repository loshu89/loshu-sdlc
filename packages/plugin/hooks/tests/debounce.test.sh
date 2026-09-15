#!/usr/bin/env bash
# Debounce library tests.
#
# Tiny POSIX-shell test harness. Each test sources the library, runs a call
# to `gate_should_run`, and asserts on the return code. Exits non-zero on
# any failure.

# NOTE: We intentionally do NOT use `set -e`. `set -e` interacts poorly with
# functions that capture exit codes from `gate_should_run` (which returns 1
# by design when a gate should be skipped). Each test runner below captures
# the exit code explicitly.

# Resolve library path relative to this script.
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LIB="$SCRIPT_DIR/../lib/debounce.sh"

if [ ! -f "$LIB" ]; then
  echo "FAIL: library not found at $LIB" >&2
  exit 1
fi

# Per-test scratch directory so state never leaks.
TMPDIR_BASE=$(mktemp -d)
trap 'rm -rf "$TMPDIR_BASE"' EXIT

PASS=0
FAIL=0

# Helper: invoke gate_should_run in a fresh subshell. Echoes nothing; the
# gate's exit code is returned via the function.
#
# Usage: run_gate <root> <artifact> <settle>
run_gate() {
  local root="$1"
  local artifact="$2"
  local settle="$3"
  bash -c "source '$LIB'; gate_should_run '$root' '$artifact' '$settle'"
}

# Assert that the call returned 0 (run gate).
# Usage: expect_run "label" <root> <artifact> <settle>
expect_run() {
  local label="$1"
  shift
  run_gate "$@"
  local rc=$?
  if [ "$rc" -eq 0 ]; then
    echo "PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label (expected run rc=0, got rc=$rc)" >&2
    FAIL=$((FAIL + 1))
  fi
}

# Assert that the call returned non-zero (skip gate).
# Usage: expect_skip "label" <root> <artifact> <settle>
expect_skip() {
  local label="$1"
  shift
  run_gate "$@"
  local rc=$?
  if [ "$rc" -ne 0 ]; then
    echo "PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label (expected skip rc!=0, got rc=$rc)" >&2
    FAIL=$((FAIL + 1))
  fi
}

# --- Test 1: first call returns 0 (run gate) --------------------------------
T=$(mktemp -d "$TMPDIR_BASE/first.XXXXXX")
expect_run "first call runs gate" "$T" "test.md" 2

# --- Test 2: second call within settle period returns 1 (skip) -------------
expect_skip "second call within settle skips" "$T" "test.md" 2

# --- Test 3: after settle period, returns 0 again (run gate) ---------------
sleep 3
expect_run "call after settle runs gate" "$T" "test.md" 2

# --- Test 4: different artifacts have independent debounce timers -----------
T2=$(mktemp -d "$TMPDIR_BASE/indep.XXXXXX")
# Reset both timers independently by issuing one call each back-to-back.
# Then a second call to a.md should be within settle (skip); b.md's second
# call should also skip because b.md was just touched.
run_gate "$T2" "a.md" 2 >/dev/null
run_gate "$T2" "b.md" 2 >/dev/null
expect_skip "a.md within settle should skip" "$T2" "a.md" 2
expect_skip "b.md within settle should skip" "$T2" "b.md" 2
# But a third artifact c.md starts fresh (its marker is empty).
expect_run "c.md fresh timer should run" "$T2" "c.md" 2

# --- Test 5: artifact name with slashes is flattened to underscores ---------
# (Slashes in marker filenames would break the per-artifact file lookup.)
T3=$(mktemp -d "$TMPDIR_BASE/slash.XXXXXX")
run_gate "$T3" "nested/intent.md" 2 >/dev/null
MARKER="$T3/.loshu-sdlc/state/.debounce/nested_intent.md.lastwrite"
if [ -f "$MARKER" ]; then
  echo "PASS: artifact with slashes flattens to safe marker filename"
  PASS=$((PASS + 1))
else
  echo "FAIL: expected marker $MARKER to exist" >&2
  FAIL=$((FAIL + 1))
fi

# --- Test 6: settle_seconds=0 makes every call fire -------------------------
T4=$(mktemp -d "$TMPDIR_BASE/zero.XXXXXX")
expect_run "settle=0 first call runs" "$T4" "zero.md" 0
expect_run "settle=0 second call runs" "$T4" "zero.md" 0

# --- Test 7: LOSHU_SDLC_DEBOUNCE_SECONDS env var overrides default ----------
T5=$(mktemp -d "$TMPDIR_BASE/env.XXXXXX")
# Issue an initial call without the env var to set the marker to "now".
run_gate "$T5" "env.md" 2 >/dev/null
# Now with env var set to 10s, the second call should skip even though only
# a moment has passed.
env LOSHU_SDLC_DEBOUNCE_SECONDS=10 bash -c "source '$LIB'; gate_should_run '$T5' 'env.md' 2" >/dev/null
RC=$?
if [ "$RC" -ne 0 ]; then
  echo "PASS: env-var settle period (10s) suppresses second call"
  PASS=$((PASS + 1))
else
  echo "FAIL: env-var settle period did not suppress call (rc=$RC)" >&2
  FAIL=$((FAIL + 1))
fi

# --- Test 8: integration — the exact snippet stage hooks use --------------
# Reproduce the snippet the exit hooks run, and verify it gates correctly
# when called in tight succession vs. after the settle window.
T6=$(mktemp -d "$TMPDIR_BASE/hook.XXXXXX")
HOOK_SNIPPET='
ROOT="$1"
ARTIFACT="$2"
source "'"$LIB"'"
if ! gate_should_run "$ROOT" "$ARTIFACT" 2; then
  exit 0
fi
# gate should run — print a sentinel so the test can detect it ran
echo "GATE_RAN"
exit 0
'

# First invocation: should print GATE_RAN (gate should run).
OUT1=$(bash -c "$HOOK_SNIPPET" -- "$T6" "intent.md" 2>&1)
if [ "$OUT1" = "GATE_RAN" ]; then
  echo "PASS: hook snippet runs gate on first call"
  PASS=$((PASS + 1))
else
  echo "FAIL: hook snippet first call expected GATE_RAN, got: $OUT1" >&2
  FAIL=$((FAIL + 1))
fi

# Second invocation within settle: should print nothing.
OUT2=$(bash -c "$HOOK_SNIPPET" -- "$T6" "intent.md" 2>&1)
if [ -z "$OUT2" ]; then
  echo "PASS: hook snippet skips gate on rapid second call"
  PASS=$((PASS + 1))
else
  echo "FAIL: hook snippet second call expected empty output, got: $OUT2" >&2
  FAIL=$((FAIL + 1))
fi

# After settle, gate should run again.
sleep 3
OUT3=$(bash -c "$HOOK_SNIPPET" -- "$T6" "intent.md" 2>&1)
if [ "$OUT3" = "GATE_RAN" ]; then
  echo "PASS: hook snippet re-runs gate after settle window"
  PASS=$((PASS + 1))
else
  echo "FAIL: hook snippet after settle expected GATE_RAN, got: $OUT3" >&2
  FAIL=$((FAIL + 1))
fi

# --- Summary ----------------------------------------------------------------
echo ""
echo "Debounce library tests: $PASS passed, $FAIL failed"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
echo "All tests passed"
