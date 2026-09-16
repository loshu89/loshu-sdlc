#!/usr/bin/env bash
# Resolve the compiled loshu-sdlc CLI bin path. Bypasses `npx`, which is
# broken on Windows + Git Bash (the .cmd shim ignores the local
# node_modules/.bin lookup that bash would use natively).
#
# Usage: find-cli.sh [root]
#   root: project root to search under; defaults to current directory.
#
# Honors $LOSHU_SDLC_CLI — when set to a path that exists, that path is
# returned verbatim (highest priority; useful for CI overrides and tests).
#
# Output: absolute path to the CLI JS file on stdout.
# Exit:   0 if a candidate was found, 127 if none matched.

set -euo pipefail

# Explicit env override wins. Treat empty string as "not set" so a caller
# can `unset LOSHU_SDLC_CLI` without breaking this check.
if [ -n "${LOSHU_SDLC_CLI:-}" ] && [ -f "${LOSHU_SDLC_CLI}" ]; then
  echo "${LOSHU_SDLC_CLI}"
  exit 0
fi

ROOT="${1:-.}"

# Resolve ROOT to an absolute path so the returned CLI bin path is
# always absolute. The caller may `cd` away before invoking
# `node "$CLI_BIN" …`; relative output would silently break.
case "$ROOT" in
  /*) ABS_ROOT="$ROOT" ;;
  *)  ABS_ROOT="$(cd "$ROOT" >/dev/null 2>&1 && pwd)" ;;
esac

# Resolution order: marketplace plugin install > npm workspace install >
# pnpm bin shim. Mirrors the schema lookup pattern at plan-exit.sh:105-115.
for candidate in \
  "$ABS_ROOT/.claude/plugins/loshu-sdlc/packages/cli/dist/bin/loshu-sdlc.js" \
  "$ABS_ROOT/node_modules/@loshu89/cli/dist/bin/loshu-sdlc.js" \
  "$ABS_ROOT/node_modules/.bin/loshu-sdlc"; do
  if [ -f "$candidate" ]; then
    echo "$candidate"
    exit 0
  fi
done

echo "loshu-sdlc CLI not found under $ABS_ROOT (set LOSHU_SDLC_CLI to override)" >&2
exit 127
