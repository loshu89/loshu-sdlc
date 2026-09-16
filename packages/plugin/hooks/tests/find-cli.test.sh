#!/usr/bin/env bash
# find-cli.sh tests.
#
# Tiny POSIX-shell test harness mirroring debounce.test.sh. Verifies the
# resolution order (env override > marketplace install > npm install >
# pnpm bin symlink) and the missing-candidate failure mode.

# NOTE: same convention as debounce.test.sh — we intentionally do NOT use
# `set -e`. Tests below capture the exit code from `bash find-cli.sh`
# explicitly.

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LIB="$SCRIPT_DIR/../lib/find-cli.sh"

if [ ! -f "$LIB" ]; then
  echo "FAIL: library not found at $LIB" >&2
  exit 1
fi

# Per-test scratch dir so state never leaks.
TMPDIR_BASE=$(mktemp -d)
trap 'rm -rf "$TMPDIR_BASE"' EXIT

PASS=0
FAIL=0

# Helper: create a fake CLI bin file at <root>/<relpath>. The file just
# needs to exist; the helper only checks file presence (caller invokes
# via `node <path>`).
make_fake_cli() {
  local root="$1"
  local relpath="$2"
  mkdir -p "$(dirname "$root/$relpath")"
  printf '#!/usr/bin/env node\n' > "$root/$relpath"
}

# Helper: run find-cli.sh in a subshell with LOSHU_SDLC_CLI explicitly
# cleared so prior test state doesn't leak.
run_find() {
  local root="$1"
  env -u LOSHU_SDLC_CLI bash "$LIB" "$root"
}

expect_eq() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [ "$actual" = "$expected" ]; then
    echo "PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label (expected: $expected, got: $actual)" >&2
    FAIL=$((FAIL + 1))
  fi
}

# --- Test 1: prefers marketplace install path -----------------------------
T=$(mktemp -d "$TMPDIR_BASE/market.XXXXXX")
make_fake_cli "$T" ".claude/plugins/loshu-sdlc/packages/cli/dist/bin/loshu-sdlc.js"
RESULT=$(run_find "$T")
expect_eq "prefers marketplace install path" \
  "$RESULT" \
  "$T/.claude/plugins/loshu-sdlc/packages/cli/dist/bin/loshu-sdlc.js"

# --- Test 2: falls back to node_modules npm path ---------------------------
T=$(mktemp -d "$TMPDIR_BASE/npm.XXXXXX")
make_fake_cli "$T" "node_modules/@loshu89/cli/dist/bin/loshu-sdlc.js"
RESULT=$(run_find "$T")
expect_eq "falls back to node_modules npm path" \
  "$RESULT" \
  "$T/node_modules/@loshu89/cli/dist/bin/loshu-sdlc.js"

# --- Test 3: missing candidate returns sentinel `loshu-sdlc` --------------
# (Not exit 127 — the hook needs the sentinel so `node "$CLI_BIN" …` fails
# fast with MODULE_NOT_FOUND in ~150ms instead of hanging on `node ""`.)
T=$(mktemp -d "$TMPDIR_BASE/missing.XXXXXX")
RESULT=$(run_find "$T" 2>/dev/null)
RC=$?
expect_eq "no candidate: returns sentinel loshu-sdlc" "$RESULT" "loshu-sdlc"
if [ "$RC" -eq 0 ]; then
  echo "PASS: no candidate: exit 0 (sentinel always succeeds)"
  PASS=$((PASS + 1))
else
  echo "FAIL: expected rc=0 (sentinel succeeds), got rc=$RC" >&2
  FAIL=$((FAIL + 1))
fi

# --- Test 4: marketplace wins over npm when both are present --------------
T=$(mktemp -d "$TMPDIR_BASE/priority.XXXXXX")
make_fake_cli "$T" ".claude/plugins/loshu-sdlc/packages/cli/dist/bin/loshu-sdlc.js"
make_fake_cli "$T" "node_modules/@loshu89/cli/dist/bin/loshu-sdlc.js"
RESULT=$(run_find "$T")
expect_eq "marketplace path wins over npm path when both present" \
  "$RESULT" \
  "$T/.claude/plugins/loshu-sdlc/packages/cli/dist/bin/loshu-sdlc.js"

# --- Test 5: LOSHU_SDLC_CLI env override wins over filesystem candidates --
T=$(mktemp -d "$TMPDIR_BASE/env.XXXXXX")
make_fake_cli "$T" ".claude/plugins/loshu-sdlc/packages/cli/dist/bin/loshu-sdlc.js"
make_fake_cli "$T" "node_modules/@loshu89/cli/dist/bin/loshu-sdlc.js"
OVERRIDE_DIR="$T/custom"
mkdir -p "$OVERRIDE_DIR"
echo '#!/usr/bin/env node' > "$OVERRIDE_DIR/loshu-sdlc.js"
RESULT=$(LOSHU_SDLC_CLI="$OVERRIDE_DIR/loshu-sdlc.js" bash "$LIB" "$T")
expect_eq "LOSHU_SDLC_CLI env override wins over filesystem candidates" \
  "$RESULT" \
  "$OVERRIDE_DIR/loshu-sdlc.js"

# --- Test 6: empty LOSHU_SDLC_CLI is treated as unset (falls through) -----
T=$(mktemp -d "$TMPDIR_BASE/emptyenv.XXXXXX")
make_fake_cli "$T" "node_modules/@loshu89/cli/dist/bin/loshu-sdlc.js"
RESULT=$(LOSHU_SDLC_CLI="" bash "$LIB" "$T")
expect_eq "empty LOSHU_SDLC_CLI falls through to filesystem lookup" \
  "$RESULT" \
  "$T/node_modules/@loshu89/cli/dist/bin/loshu-sdlc.js"

# --- Test 7: LOSHU_SDLC_CLI set to a missing path falls through to FS ----
T=$(mktemp -d "$TMPDIR_BASE/missingenv.XXXXXX")
make_fake_cli "$T" "node_modules/@loshu89/cli/dist/bin/loshu-sdlc.js"
RESULT=$(LOSHU_SDLC_CLI="/does/not/exist/loshu-sdlc.js" bash "$LIB" "$T")
expect_eq "LOSHU_SDLC_CLI pointing at missing file falls through" \
  "$RESULT" \
  "$T/node_modules/@loshu89/cli/dist/bin/loshu-sdlc.js"

# --- Test 8: no root arg defaults to current directory ---------------------
T=$(mktemp -d "$TMPDIR_BASE/defaultroot.XXXXXX")
make_fake_cli "$T" ".claude/plugins/loshu-sdlc/packages/cli/dist/bin/loshu-sdlc.js"
EXPECTED="$T/.claude/plugins/loshu-sdlc/packages/cli/dist/bin/loshu-sdlc.js"
# pushd/popd so the cd is scoped to this test (avoid leaking cwd into
# subsequent test assertions).
pushd "$T" >/dev/null
RESULT=$(env -u LOSHU_SDLC_CLI bash "$LIB")
popd >/dev/null
expect_eq "defaults to current directory and returns absolute path" \
  "$RESULT" "$EXPECTED"

# --- Summary --------------------------------------------------------------
echo ""
echo "find-cli.sh tests: $PASS passed, $FAIL failed"
if [ "$FAIL" -ne 0 ]; then
  exit 1
fi
echo "All tests passed"
