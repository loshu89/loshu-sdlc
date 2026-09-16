# Task 1: Extend Artifact with rootPath

**Goal:** Add `rootPath: string` to the `Artifact` interface in `packages/cli/src/lib/accept/types.ts`, populate it from `discover.ts`, and pass it through to assertions.

**Why:** Tasks 2 (A3), 3 (state refactor including C4 artifact existence), and 4 (V4 cross-cycle) all need to read `.loshu-sdlc/state/cycle.json` from the project root. Today, `Artifact` only carries `stage`, `filePath`, `id`. Assertions can't derive the root reliably from `filePath` (would need to walk up to find `.loshu-sdlc/state/cycle.json`). Adding `rootPath` makes project-scope assertions clean.

**Spec reference:** Spec §4.3 — `Artifact` interface doesn't currently include rootPath but the assertion signature is `(artifact: Artifact) => Promise<AssertionResult>` so the artifact needs to carry enough context to do its job. This is an enabling change, not a spec change.

## Files to change

### `packages/cli/src/lib/accept/types.ts`

Add `rootPath: string` to the `Artifact` interface:

```ts
import type { Stage } from '../identity.js';

export interface Artifact {
  stage: Stage;
  filePath: string;
  id: string;
  // Absolute path to the project root (parent of `.loshu-sdlc/`).
  // Populated by discover.ts from the cycle.json path. Needed by
  // project-scope assertions (A3 global uniqueness, V4 cross-cycle,
  // C4 parent existence) to re-read cycle.json or walk the artifact set.
  rootPath: string;
}
```

### `packages/cli/src/lib/accept/discover.ts`

- Import `CycleStateFile` from `lib/cycle.js` (already exported there) and use it instead of the local `CycleFile` interface.
- Set `rootPath` on every pushed artifact. The cycle.json is at `join(rootPath, '.loshu-sdlc/state/cycle.json')` — extract `rootPath` from `cyclePath` via `dirname(dirname(cyclePath))` (or equivalently `dirname(dirname(cyclePath))` which gives the project root).

```ts
import { readFile, stat } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Artifact } from './types.js';
import type { Stage } from '../identity.js';
import type { CycleStateFile } from '../cycle.js';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

function parseFrontmatter(content: string): Record<string, unknown> {
  const m = FRONTMATTER_RE.exec(content);
  if (!m) return {};
  const lines = m[1]!.split('\n');
  const obj: Record<string, unknown> = {};
  for (const line of lines) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (kv) obj[kv[1]!] = kv[2];
  }
  return obj;
}

export async function discoverArtifacts(rootPath: string): Promise<Artifact[]> {
  const cyclePath = join(rootPath, '.loshu-sdlc/state/cycle.json');
  try {
    await stat(cyclePath);
  } catch {
    return [];
  }
  const cycle = JSON.parse(await readFile(cyclePath, 'utf-8')) as CycleStateFile;
  const artifacts: Artifact[] = [];
  for (const cycleEntry of Object.values(cycle.cycles)) {
    for (const [stage, stageEntry] of Object.entries(cycleEntry.stages)) {
      if (!stageEntry.artifact_path || !stageEntry.artifact) continue;
      const filePath = join(rootPath, stageEntry.artifact_path);
      const fm = parseFrontmatter(
        await readFile(filePath, 'utf-8').catch(() => ''),
      );
      artifacts.push({
        stage: stage as Stage,
        filePath,
        id: String(fm.id ?? stageEntry.artifact),
        rootPath,
      });
    }
  }
  return artifacts;
}
```

**Note:** I changed `stageEntry.artifact_id` to `stageEntry.artifact` — per the v0.6.3 type-cleanup commit, the CycleEntry stage field is `artifact`, not `artifact_id`. The local `CycleFile` interface in the old discover.ts had `artifact_id` which was the latent bug. Fixing it here is in-scope (it's the same field name correction as the git command fix in v0.6.3).

### `packages/cli/src/lib/accept/runner.ts`

No change needed — it iterates artifacts and passes them to assertions. Assertions will receive `rootPath` automatically.

### `packages/cli/tests/lib/accept/discover.test.ts` (if it constructs Artifact literals)

Read the file first. If it constructs `Artifact` literals (e.g., `{ stage: 'plan', filePath: '...', id: '...' }`), update them to include `rootPath`. If it only consumes them via the runner, no change needed.

### `packages/cli/tests/lib/accept/runner.test.ts`

Same: read it, update any Artifact literals to include `rootPath`.

## Verification

1. **Typecheck:** `pnpm typecheck` must remain clean (no `Property 'rootPath' is missing` errors anywhere).
2. **Existing tests:** `pnpm test` — all 169 tests still pass (no behavior change).
3. **Discover test:** `pnpm --filter @loshu89/cli test -- tests/lib/accept/discover.test.ts` — the existing discover test should still pass (the function still returns the same artifacts, just with an extra field).
4. **Lint:** `pnpm lint` clean.

## TDD discipline

This is a refactor (widening an interface, no behavior change). The verification is:
- Existing tests pass (regression guard)
- New assertions in Tasks 2/3/4 can read `a.rootPath` without TS errors

Write the type change + discover change, run existing tests, then commit. No new tests for Task 1 itself.

## Commit

```
feat(accept): extend Artifact with rootPath (enables project-scope assertions)

Tasks 2 (A3), 3 (C4 extended), and 4 (V4 cross-cycle) all need
to read cycle.json from the project root. The Artifact interface
carried stage/filePath/id but no anchor; widen with rootPath
populated by discover.ts from the cycle.json parent path.

While here, fix the latent discover.ts bug where stageEntry.artifact_id
should be stageEntry.artifact (per the v0.6.3 CycleEntry type fix).
Local CycleFile interface also replaced with CycleStateFile from
lib/cycle.ts to keep the types consistent.

No behavior change — existing 169 tests still pass.
```

