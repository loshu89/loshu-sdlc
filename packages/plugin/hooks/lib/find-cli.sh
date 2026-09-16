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
# When unset OR set to a missing path, falls through to filesystem search.
#
# Output: absolute path to the CLI JS file on stdout, or the literal
#         `loshu-sdlc` as a sentinel when no candidate matched (so the
#         caller's `node "$CLI_BIN" …` fails fast instead of hanging).
# Exit:   always 0. (No caller needs a non-zero signal; the sentinel
#         pattern lets every call site stay silent on missing CLI.)

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

# Resolution order: marketplace plugin install > npm workspace install.
# Intentionally does NOT walk `node_modules/.bin/loshu-sdlc` — on Windows
# that path may be a `.cmd` shim, and on POSIX it may be a bash wrapper,
# neither of which `node <path>` can execute directly. The two paths above
# always point at the real JS entry.
#
# Mirrors the schema lookup pattern at plan-exit.sh:105-115.
for candidate in \
  "$ABS_ROOT/.claude/plugins/loshu-sdlc/packages/cli/dist/bin/loshu-sdlc.js" \
  "$ABS_ROOT/node_modules/@loshu89/cli/dist/bin/loshu-sdlc.js"; do
  if [ -f "$candidate" ]; then
    echo "$candidate"
    exit 0
  fi
done

# No candidate found. Output the bare command name as a sentinel so the
# hook's `node "$CLI_BIN" …` fails fast (MODULE_NOT_FOUND in ~150ms)
# instead of hanging on `node ""` on Windows. The sentinel is harmless
# on POSIX where Node looks for `loshu-sdlc.js` / `loshu-sdlc` / etc. in
# the current directory and fails fast when absent.
echo "loshu-sdlc"
exit 0
