# §2 Versioning Layer (B)

### 2.1 Schema Registry

Single source of truth at `packages/plugin/schemas/registry.json`:

```json
{
  "intent": {
    "current": "0.5.0",
    "versions": {
      "0.1.0": { "schema_file": "intent.schema.json.0.1.0", "deprecated": true,  "migrate_to": "0.2.0" },
      "0.2.0": { "schema_file": "intent.schema.json.0.2.0", "deprecated": false, "migrate_to": null },
      "0.5.0": { "schema_file": "intent.schema.json",          "deprecated": false, "migrate_to": null, "current": true }
    }
  },
  "spec":    { /* same structure */ },
  "plan":    { /* ... */ },
  "claude-md": { /* ... */ },
  "review":  { /* ... */ },
  "bands":   { /* ... */ }
}
```

Field meanings:
- `current` — current recommended version
- `deprecated` — old version still readable but flagged on write
- `migrate_to` — official upgrade path (non-empty means migration available)
- `schema_file` — relative path to actual schema file

### 2.2 Schema Version Field

Every artifact frontmatter declares `schema_version`:

```yaml
---
id: spec-c03-oauth-7f3a-01HXYZ...
schema_version: 0.5.0
state: draft
---
```

- **Required** field (enforced by schema)
- Format: semver (X.Y.Z)
- Must exist in registry
- Hooks block (exit 2) on unknown version

### 2.3 Migration Tool

```bash
loshu-sdlc migrate <artifact-file> --from <old-ver> --to <new-ver>
loshu-sdlc migrate spec.md                    # auto-detect from frontmatter, target = current
loshu-sdlc migrate --all --dry-run             # preview project-wide migrations
loshu-sdlc migrate --check                    # exit code 0 if all current, 1 if any outdated
```

Behavior:
1. Read artifact frontmatter → get `schema_version`
2. Look up migration path in registry (A → B → C chain)
3. Run each transformation in sequence
4. Write back to original file (or to `*.migrated.md` for diff review)
5. Update frontmatter `schema_version`
6. Emit migration event to `.loshu-sdlc/state/events.jsonl`

### 2.4 Transformation Files (Hand-Written)

Why hand-written (not schema-diff inferred):
- Default values need business judgment ("new field gets what?")
- Field renames need domain context
- Deletions need data retention strategy

```typescript
// packages/plugin/migrations/intent-0.1.0-to-0.2.0.ts
export function transform(artifact: unknown): unknown {
  return {
    ...artifact,
    state: 'draft', // new field added in 0.2.0
  };
}
```

### 2.5 Chained Migration

```
artifact is 0.1.0
loshu-sdlc migrate --to 0.5.0
→ 0.1.0 → 0.2.0 → 0.5.0 (3 transformations in sequence)
```

Implementation:

```typescript
async function chainMigrate(artifact, fromVer, toVer): Promise<artifact> {
  const path = findMigrationPath(fromVer, toVer); // e.g., ['0.1.0', '0.2.0', '0.5.0']
  let current = artifact;
  for (const [from, to] of path) {
    const transform = await loadTransform(from, to);
    current = transform(current);
  }
  return current;
}
```

### 2.6 Post-Migration State

After migration, artifact's `state` is forced to `iterating` (schema changed → manual review):

```yaml
id: spec-c03-oauth-7f3a-...
schema_version: 0.5.0
state: iterating           # forced; schema changed
migrated_from: 0.1.0       # provenance
migrated_at: 2026-09-15T12:00:00Z
```

### 2.7 Acceptance Assertions (Preview)

- **V1**: `schema_version` exists in frontmatter
- **V2**: format is valid semver
- **V3**: exists in registry
- **V4**: not deprecated in any new commit
- **V5**: cross-cycle artifact schema versions consistent
- **V6**: after migration, `state` is `iterating`
- **V7**: migrated artifact content matches transform output

### 2.8 Scope Boundaries

| In scope | Out of scope |
|---|---|
| Artifact schema versioning | Dev-dep schema (no need) |
| Chained migration | Downgrade (manual) |
| Migration event audit | Auto-PR for migration review |
| Explicit user-triggered migration | Hook auto-migration |

## Cross-references

- See also: [§1-identity.md](§1-identity.md) for the `id` field that travels with every `schema_version`
- See also: [§3-state-machine-git.md](§3-state-machine-git.md) for how the `iterating` state is set post-migration
- See also: [§4-acceptance.md](§4-acceptance.md) for V1-V7 assertion rules
- See also: [§5-storage.md](§5-storage.md) for events.jsonl emission on migrate
