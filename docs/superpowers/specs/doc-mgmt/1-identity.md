# §1 Identity Layer (A)

### 1.1 ID Format

**Format:** `stage-c##-slug-####-ULID`

```
id: spec-c03-oauth-7f3a-01HXYZABCDEFGHJKMNPQRSTVWXY
 └─┘ └┘ └───┘ └─┘ └──────────────────────────┘
 stage cycle slug 4hex ULID (26-char timestamp+random)
```

Components:
- `stage`: one of `plan|design|build|test|deploy|maintain`
- `c##`: cycle number, zero-padded (e.g., `c03` for cycle 3)
- `slug`: kebab-case, max 30 chars
- `####`: 4-hex random suffix (collision absorption)
- ULID: 26 chars (Crockford Base32), lexicographically sortable, time-ordered

**Regex (used in schema `pattern`):**

```regex
^(plan|design|build|test|deploy|maintain)-c(\d{2,})-[a-z0-9-]+-[0-9a-f]{4}-[0-9A-HJKMNP-TV-Z]{26}$
```

**Rationale:**
- Readable: human can parse stage + cycle + intent at a glance
- Globally unique: ULID has 1-in-2^80 collision probability per millisecond
- Sortable: ULID prefix orders events chronologically
- Grep-friendly: `git log --grep "spec-c03"` finds related commits

### 1.2 Artifact Identity Fields

Each artifact's YAML frontmatter carries:

```yaml
---
# Identity (A)
id: spec-c03-oauth-7f3a-01HXYZABCDEFGHJKMNPQRSTVWXY
schema_version: 0.5.0          # used by Versioning (B)
cycle_id: 3                    # used by State Machine (C)
stage: design # design|build|test|deploy|maintain

# Dependency chain (parent chain)
parent_ids:
  - 01HXYZABCDEFGHJKMNPQRSTVWXY       # intent.md's ID (spec's parent)

# Provenance
created_by: claude-code-session-abc123 # or human:loshu89
created_at: 2026-09-15T10:30:00Z
authored_by:
  - type: human
    id: loshu89
    at: 2026-09-15T10:00:00Z
  - type: agent
    id: superpowers:brainstorming
    at: 2026-09-15T10:30:00Z

# Git binding (C) — PR ref + branch; commit SHA queried from platform API on demand
git:
  branch: sdlc/cycle-3-oauth-auth
  pr_number: 42
  pr_url: https://github.com/loshu89/loshu-sdlc/pull/42
# NOTE: commit SHA is NOT stored locally. The platform API (GitHub/GitLab)
# is the source of truth for commit info. This avoids stale data after
# rebase/force-push and removes redundant storage.

# Existing fields (preserved)
state: draft
---
```

### 1.3 Parent Chain Semantics

Each artifact's `parent_ids` points to the upstream artifacts that produced it:

```
intent.md ──parent──> spec.md ──parent──> plan.md ──parent──> REVIEW.md
                                  └─parent─> CLAUDE.md
                                                                   spec.md ──parent──> intent.md
plan.md     ──parent──> spec.md
CLAUDE.md   ──parent──> plan.md
REVIEW.md   ──parent──> CLAUDE.md
bands.yaml  ──parent──> REVIEW.md
                                   └─parent─> intent.md (loop closure: 3σ spawns new cycles)
```

`parent_ids` is an **array** to support:
- Single parent (normal case)
- Multiple parents (merged cycles from two source features)
- Cross-cycle parents (migration references old cycle's artifact)

### 1.4 Schema Changes

Every artifact schema gets new fields. **Required**: `id`, `schema_version`, `cycle_id`, `stage`, `created_by`, `created_at`. **Optional**: `parent_ids`, `authored_by`, `git`.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "required": [
    "id",
    "schema_version",
    "cycle_id",
    "stage",
    "state",
    "created_by",
    "created_at"
  ],
  "properties": {
    "id":             { "type": "string", "pattern": "^(plan|design|build|test|deploy|maintain)-c\\d{2,}-[a-z0-9-]+-[0-9a-f]{4}-[0-9A-HJKMNP-TV-Z]{26}$" },
    "schema_version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
    "cycle_id":       { "type": "integer", "minimum": 1 },
    "stage":          { "enum": ["plan","design","build","test","deploy","maintain"] },
    "parent_ids":     { "type": "array", "items": { "type": "string" } },
    "created_by":     { "type": "string", "minLength": 1 },
    "created_at":     { "type": "string", "format": "date-time" },
    "authored_by":    { "type": "object" },
    "git":            { "type": "object" },
    "state":          { "enum": ["draft","accepted","iterating","blocked","rejected","merged","archived"] }
  }
}
```

### 1.5 ID Generation

```typescript
// packages/cli/src/lib/identity.ts
import { ulid } from 'ulid';
import { randomBytes } from 'node:crypto';

export function generateId(opts: {
  stage: 'plan' | 'design' | 'build' | 'test' | 'deploy' | 'maintain';
  cycle: number;
  slug: string;
}): string {
  const slug = opts.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 30);
  const cycle = String(opts.cycle).padStart(2, '0');
  const hex = randomBytes(2).toString('hex');   // 4-hex collision absorber
  const ulid = ulid();                            // 26-char ULID
  return `${opts.stage}-c${cycle}-${slug}-${hex}-${ulid}`;
}
```

### 1.6 Conflict Detection

ULID collisions are statistically negligible. But if a user **manually duplicates** an artifact without changing the ID, the system detects and warns:

```
$ loshu-sdlc validate spec.md
⚠ Warning: ID 01HXYZ... already exists in cycle 2 (intent.md:5).
  New copy should generate a fresh ID. Run: loshu-sdlc repair spec.md
```

## Cross-references

- See also: [2-versioning.md](2-versioning.md) for the `schema_version` field that travels with every ID
- See also: [3-state-machine-git.md](3-state-machine-git.md) for how `cycle_id` and `git.branch` link to lifecycle
- See also: [4-acceptance.md](4-acceptance.md) for ID-related assertions (A1-A3, A5)
