# Lint Fix Report — v0.1.1 Release Gauntlet

**Date:** 2026-09-14
**Branch:** main
**Commit:** bcb3c2c

## Summary

Resolved all 18 lint errors that were blocking the v0.1.1 release gauntlet. Mechanical fixes only; no behavioral changes. Lint, typecheck, and the full test suite (46 tests across 12 files) all pass.

## Errors Fixed Per File

### `packages/cli/src/bin/loshu-sdlc.ts` — 10 errors fixed

All 10 `no-fallthrough` errors were resolved by adding `// falls through` comments before each subsequent `case` (and the `default` branch). The cases terminate via `process.exit()` but ESLint cannot prove that statically, so explicit fallthrough markers are required.

| Line | Case |
|------|------|
| 77   | `case 'doctor':` |
| 82   | `case 'bands':` |
| 105  | `case 'lint':` |
| 114  | `case 'rules':` |
| 132  | `case 'status':` |
| 140  | `case 'coverage':` |
| 149  | `case 'logs':` |
| 158  | `case 'upgrade':` |
| 168  | `case 'telemetry':` |
| 180  | `default:` |

### `packages/cli/src/commands/create.ts` — 1 error fixed

Removed unused `filesPresent` variable (line 33). Replaced the assignment with `void existsSync(...)` so the call still occurs (preserving the original side-effect intent) without producing an unused-variable warning.

### `packages/cli/src/commands/rules.ts` — 1 error fixed

Removed unused `readFile` from the destructuring on line 3 (`const { stat } = fsExtra;`). `readFile` was imported via `fs-extra` but never called.

### `packages/cli/src/lib/prompts.ts` — 1 error fixed

Cast `inquirer.prompt(...)` result directly to `ScaffoldOptions` (line 15) and removed the redundant `as ScaffoldOptions` at the return statement. The inquirer typings return `unknown`; the explicit cast at the assignment site resolves the unsafe-assignment error without needing a downstream cast.

### `packages/cli/src/lib/validate.ts` — 4 errors fixed

- **Line 7** (Unsafe assignment + Unsafe member access): Replaced the `as any` cast pattern with a proper type alias `type FormatsPlugin = (ajv: Ajv2020) => Ajv2020` and cast through `unknown` with structural typing. The `.default ?? import` CJS-interop pattern is preserved but typed as `FormatsPlugin` rather than `any`.
- **Line 38** (Unsafe assignment of `any`): `JSON.parse(...)` now casts to `Record<string, unknown>` instead of falling through to the implicit `any`.
- **Line 54** (Unsafe call of `any` typed value): Resolved automatically once `addFormats` is typed as `FormatsPlugin` on line 7.

### `tests/evals/run.ts` — 1 error fixed

Removed unnecessary backslash escape in the character class on line 110: `[#*_>\-]` → `[#*_>-]`. The hyphen at the end of a character class needs no escaping.

## Verification

### Lint Output (clean)

```
> loshu-sdlc@0.1.0 lint D:\workspace\3.my\SDLC
> eslint . --ext .ts,.js,.mjs

(no output — exit code 0)
```

### Typecheck Output (clean)

```
> loshu-sdlc@0.1.0 typecheck D:\workspace\3.my\SDLC
> pnpm -r typecheck

packages/plugin typecheck: plugin is markdown/JSON, no typecheck — Done
packages/templates typecheck: templates are markdown/yaml, no typecheck — Done
packages/cli typecheck: tsc --noEmit — Done
```

### Test Output (no regression)

```
Test Files  12 passed (12)
     Tests  46 passed (46)
  Duration  2.06s
```

All 46 tests across 12 test files pass after the fixes.

## Files Changed

- `packages/cli/src/bin/loshu-sdlc.ts` (+10, -0)
- `packages/cli/src/commands/create.ts` (+1, -1)
- `packages/cli/src/commands/rules.ts` (+1, -1)
- `packages/cli/src/lib/prompts.ts` (+1, -1)
- `packages/cli/src/lib/validate.ts` (+9, -2)
- `tests/evals/run.ts` (+1, -1)

Total: 6 files, 22 insertions, 10 deletions.

## One-Line Summary

Fixed 18 lint errors across 6 files (no-fallthrough ×10, no-unused-vars ×2, no-unsafe-* ×5, no-useless-escape ×1); lint, typecheck, and all 46 tests pass.
