# Task 4: V4 — cross-cycle parent schema consistency

**Goal:** Add assertion `V4` to `versioning.ts`. Spec §4.3 row V4: "cross-cycle parent schema consistent | warn".

**What it checks:** For each artifact's `parent_ids`, if any parent_id points to an artifact in a DIFFERENT cycle, the parent's `schema_version` should be consistent with the current artifact's schema (e.g., parent's version should be in the registered versions and not flagged as deprecated for forward references). Conservative first-cut: warn (not fail) if any cross-cycle parent's schema_version is unknown or deprecated.

**Depends on:** Task 1 (Artifact.rootPath) — needs cycle.json access.

## Files to change

### `packages/cli/src/lib/accept/assertions/versioning.ts`

Read the current file. Add a new `V4` assertion after `V3`. The assertion:

1. Reads the artifact's frontmatter to get `parent_ids` and `schema_version`.
2. Loads cycle.json via `a.rootPath`.
3. For each parent_id:
   - Find the cycle entry containing a stage with that id.
   - If the parent is in the SAME cycle: skip (intra-cycle consistency is checked elsewhere — C2/V1).
   - If the parent is in a DIFFERENT cycle: read the parent's schema_version, look it up in the registry. If unknown or deprecated, accumulate as a warning.
4. If any warnings, return a fail with the warn detail (per spec: "warn" auto-fix action is "trigger migrate", but we won't auto-fix; we'll report).

```ts
{
  rule: 'V4',
  layer: 2,
  description: 'cross-cycle parent schema is consistent (no deprecated/unknown versions)',
  run: async (a) => {
    let fm: Record<string, unknown>;
    try {
      fm = await readFrontmatter(a.filePath);
    } catch {
      return pass('V4');
    }
    const parents = (fm.parent_ids as string[] | undefined) ?? [];
    if (parents.length === 0) return pass('V4');

    const cyclePath = `${a.rootPath}/.loshu-sdlc/state/cycle.json`;
    let cycle: CycleStateFile;
    try {
      cycle = JSON.parse(await readFile(cyclePath, 'utf-8')) as CycleStateFile;
    } catch {
      return pass('V4');
    }

    const reg = await loadRegistry();
    const typeReg = getArtifactTypeRegistry(reg, a.stage);

    // Find the current artifact's cycle (best-effort: match by stage + cycle_id).
    const currentCycleId = Number(fm.cycle_id ?? 0);
    const warnings: string[] = [];
    for (const parentId of parents) {
      const parentCycleId = findCycleIdForArtifactId(cycle, parentId);
      if (parentCycleId === null || parentCycleId === currentCycleId) continue;
      // Cross-cycle parent — look up its schema_version.
      const parentVersion = findParentSchemaVersion(cycle, parentId);
      if (!parentVersion) {
        warnings.push(`parent ${parentId}: cannot read schema_version`);
        continue;
      }
      const entry = typeReg[parentVersion] as RegistryVersion | undefined;
      if (!entry) {
        warnings.push(`parent ${parentId} (cycle ${parentCycleId}): schema_version ${parentVersion} not in registry`);
      } else if (entry.deprecated) {
        warnings.push(`parent ${parentId} (cycle ${parentCycleId}): schema_version ${parentVersion} is deprecated`);
      }
    }

    if (warnings.length === 0) return pass('V4');
    return fail(
      'V4',
      `${warnings.length} cross-cycle parent schema inconsistency: ${warnings.join('; ')}`,
      'loshu-sdlc migrate <parent-file>',
    );
  },
},
```

You'll need two helper functions:

```ts
function findCycleIdForArtifactId(
  cycle: CycleStateFile,
  artifactId: string,
): number | null {
  for (const [idStr, entry] of Object.entries(cycle.cycles)) {
    for (const stageEntry of Object.values(entry.stages)) {
      if (stageEntry.artifact === artifactId) return Number(idStr);
    }
  }
  return null;
}

function findParentSchemaVersion(
  cycle: CycleStateFile,
  artifactId: string,
): string | undefined {
  for (const entry of Object.values(cycle.cycles)) {
    for (const stageEntry of Object.values(entry.stages)) {
      if (stageEntry.artifact === artifactId) {
        // Read the artifact file from disk to get schema_version.
        // (Could be expensive; consider caching in a future task.)
        return undefined; // Placeholder — actual implementation reads file
      }
    }
  }
  return undefined;
}
```

**Important:** `findParentSchemaVersion` needs to read the parent artifact's frontmatter. You'll need the parent's file path — but `stageEntry.artifact` is just the filename; the parent cycle's rootPath is unknown (we only have the current cycle's rootPath). For the first cut, restrict V4 to cases where the parent artifact's file exists in the CURRENT rootPath's file tree (probably a relative path under the project root). This is a conservative implementation that handles the common case (multi-cycle project sharing one workspace) and gracefully no-ops otherwise.

Full implementation:

```ts
function findParentSchemaVersion(
  cycle: CycleStateFile,
  artifactId: string,
  rootPath: string,
): string | undefined {
  for (const entry of Object.values(cycle.cycles)) {
    for (const stageEntry of Object.values(entry.stages)) {
      if (stageEntry.artifact === artifactId) {
        // The artifact filename is relative to rootPath (per CycleEntry's
        // artifact field convention).
        try {
          const content = readFileSync(
            join(rootPath, stageEntry.artifact),
            'utf-8',
          );
          const fm = parseYaml(content) as Record<string, unknown>;
          return String(fm.schema_version ?? '');
        } catch {
          return undefined;
        }
      }
    }
  }
  return undefined;
}
```

Use `readFileSync` from `node:fs` (synchronous — assertions are async already; the sync IO is small).

### `packages/cli/tests/lib/accept/assertions/versioning.test.ts`

Read existing tests. Add V4 tests:

**Positive test:** Two cycles in the same rootPath. Cycle 1 has artifact A (schema 0.5.0). Cycle 2 has artifact B with `parent_ids: [A.id]`. A's schema is current (not deprecated). V4 passes.

**Negative test:** Same setup but A's schema_version is a deprecated version. V4 fails with "deprecated" in the message.

**Empty parent_ids:** B with no parent_ids. V4 passes.

**Intra-cycle parent:** B with parent_ids pointing to an artifact in the SAME cycle. V4 passes (skips intra-cycle).

Use the same mkdtemp/writeFile/readFile/rm pattern.

## Verification

1. `pnpm test` — all tests pass (existing V1-V3 + new V4 tests, total ≥5 versioning tests).
2. `pnpm lint` clean.
3. `pnpm typecheck` clean.

## TDD discipline

Write tests first (assert V4 fails because not implemented). Then implement. Then re-run.

## Commit

```
feat(accept): V4 — cross-cycle parent schema consistency

Spec §4.3 row V4 ("cross-cycle parent schema consistent | warn").
For each parent_id pointing to an artifact in a different cycle,
the parent's schema_version must be in the registry and not
deprecated. Intra-cycle parents are skipped (consistency is
covered by V1/V2).

The parent artifact's frontmatter is read via stageEntry.artifact
(relative to rootPath) — conservative implementation that
handles the common case of multi-cycle projects sharing one
workspace. Cross-rootPath parent references gracefully no-op
(return undefined, skip the check).

Tests:
- Positive: cross-cycle parent with current schema_version passes.
- Negative: cross-cycle parent with deprecated schema_version fails.
- Empty parent_ids passes.
- Intra-cycle parent passes.

Depends on Task 1 (Artifact.rootPath).
```

