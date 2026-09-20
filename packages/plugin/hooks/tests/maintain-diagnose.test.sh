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
# On Windows, Node interprets POSIX /tmp paths as D:\tmp, which is
# unrelated to bash's mktemp location. Convert to a Windows-native
# path so Node's fs.writeFileSync writes where bash expects.
if command -v cygpath >/dev/null 2>&1; then
  TMP="$(cygpath -w "$TMP")"
fi
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
  # Maintain-exit requires REVIEW.md with state accepted before evaluating bands.
  cat > "$TMP/REVIEW.md" <<EOF
---
id: review-c01-test-0001-01HXYZREVIEW
schema_version: '0.5.0'
cycle_id: 1
stage: deploy
state: accepted
created_at: 2026-01-01T00:00:00Z
created_by: human:test
---
EOF
}

# Helper: stub `loshu-sdlc` on PATH to return either success or failure.
# Stub is a Node.js script (CLI_BIN resolves to a .js file path), and
# its behavior is controlled by the LOSHU_STUB_MODE env var.
stub_cli() {
  local mode="$1"
  local stub_dir="$TMP/stub-bin-$mode"
  mkdir -p "$stub_dir"
  cat > "$stub_dir/loshu-sdlc.js" <<EOF
#!/usr/bin/env node
// Stub CLI for testing maintain-exit.sh
const fs = require('fs');
const path = require('path');
const mode = process.env.LOSHU_STUB_MODE || 'success';

const cmd1 = process.argv[2];
const cmd2 = process.argv[3];

if (cmd1 === 'maintain' && cmd2 === 'diagnose') {
  const intentPath = process.argv[5];
  if (mode === 'success') {
    const intent =
      "---\n" +
      "id: plan-c02-error-rate-0001-01HXYZSTUB\n" +
      "schema_version: '0.5.0'\n" +
      "cycle_id: 2\n" +
      "stage: plan\n" +
      "state: draft\n" +
      "created_at: 2026-09-20T00:00:00Z\n" +
      "created_by: system:test\n" +
      "origin: maintain/3sigma:error_rate\n" +
      "title: Incident: error_rate (test)\n" +
      "problem: 'TODO'\n" +
      "proposedOutcome: 'TODO'\n" +
      "affectedUsersAndSystems:\n" +
      "  - 'TODO'\n" +
      "openQuestions: []\n" +
      "---\n";
    fs.mkdirSync(path.dirname(intentPath), {recursive: true});
    fs.writeFileSync(intentPath, intent);
    process.exit(0);
  } else {
    process.exit(1);
  }
}

if (cmd1 === 'validate' && cmd2 === 'bands') {
  process.exit(0);
}

if (cmd1 === 'bands' && cmd2 === 'evaluate') {
  // Read the metric value from the observations-json arg so the test can
  // simulate both breach and no-breach scenarios.
  let value = 0.045;
  for (let i = 0; i < process.argv.length; i++) {
    if (process.argv[i] === '--observations-json' && i + 1 < process.argv.length) {
      try {
        const obs = JSON.parse(process.argv[i + 1]);
        if (typeof obs.error_rate === 'number') value = obs.error_rate;
      } catch (_) { /* ignore */ }
    }
  }
  const sigma3 = 0.03;
  if (value >= sigma3) {
    process.stdout.write(JSON.stringify({incidents: [{metric: 'error_rate', value: value, tier: '3sigma'}]}) + '\n');
  } else {
    process.stdout.write(JSON.stringify({incidents: []}) + '\n');
  }
  process.exit(0);
}

if (cmd1 === 'cycle' && cmd2 === 'append-event') process.exit(0);
if (cmd1 === 'cycle' && cmd2 === 'archive') process.exit(0);
if (cmd1 === 'cycle' && cmd2 === 'new') process.exit(0);
if (cmd1 === 'cycle' && cmd2 === 'set') process.exit(0);
if (cmd1 === 'state' && cmd2 === 'maintain') process.exit(0);

process.exit(0);
EOF
  chmod +x "$stub_dir/loshu-sdlc.js"
  echo "$stub_dir"
}

# Helper: run the hook with a stub CLI via LOSHU_SDLC_CLI env override
run_hook() {
  local stub_dir="$1"
  (cd "$TMP" && LOSHU_SDLC_CLI="$stub_dir/loshu-sdlc.js" LOSHU_STUB_MODE="$2" bash "$HOOK" "$TMP")
  return $?
}

# Test 1: stub CLI succeeds → hook exits 0, intent.md exists
echo "Test 1: diagnose success → exit 0"
setup_bands 0.045  # 3σ breach
stub_bin=$(stub_cli success)
set +e
out=$(run_hook "$stub_bin" success)
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
out=$(run_hook "$stub_bin" failure 2>&1)
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
out=$(run_hook "$stub_bin" success)
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