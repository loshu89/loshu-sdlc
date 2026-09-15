# Document Management System — Design Spec

**Status:** Draft (awaiting user review)
**Date:** 2026-09-15
**Target version:** v0.6.0
**Source:** Continuation of loshu-sdlc v0.5.0 architecture discussion

---

## Overview

loshu-sdlc v0.5.0 ships with a partial artifact management system: the DAG state machine (v0.3.0) and the cycle infrastructure (v0.4.0). v0.6.0 completes it by adding four missing layers:

1. **Identity (A)** — every artifact has a unique, human-readable ID with parent chain
2. **Versioning (B)** — schema registry with chained migration tooling
3. **State Machine + Git Lifecycle (C)** — full DAG plus branch/PR/merge integration
4. **Acceptance Testing (D)** — 4-layer test framework with auto-fix mode

Plus GitHub + GitLab platform adapters for full git workflow integration.

The system answers five questions for every artifact at any time:

- **What** is this artifact? → Identity (A)
- **Which schema version** does it conform to? → Versioning (B)
- **Where** in the lifecycle is it? → State Machine (C)
- **Where** in git is it? → Git lifecycle (C)
- **Is it valid?** → Acceptance Testing (D)

---

## §1 Identity Layer (A)

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

# Git binding (C)
git:
  branch: sdlc/cycle-3-oauth-auth
  commit: abc123def456
  pr_number: 42
  pr_url: https://github.com/loshu89/loshu-sdlc/pull/42

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

---

## §2 Versioning Layer (B)

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

---

## §3 State Machine + Git Lifecycle (C)

### 3.1 Complete State Diagram

```
                      (none) → draft  (artifact file created)
                      ↓
                    ┌──────────┐
                    │ pending  │ (no artifact file yet)
                    └────┬─────┘
                         │ cycle new ↓
                    ┌──────────┐
                    │  draft   │◀────────────┐
                    └────┬─────┘             │
                         │ validate          │ resurrect
                         ▼ (passed)          │
                    ┌──────────┐             │
                    │ accepted │             │
                    └────┬─────┘             │
            ┌───────────┼───────────┐         │
            │           │           │         │
         block       revise      archive     │
            │           │           │         │
            ▼           ▼           ▼         │
       ┌─────────┐ ┌──────────┐ ┌──────────┐  │
       │ blocked │→│iterating │ │archived  │  │
       └────┬────┘ └────┬─────┘ └────┬─────┘  │
            │           │            │        │
            │ unblock   │ validate   │ unarchive
            │           │            │        │
            └───────────┴────────────┘        │
                         │                    │
                         │ reject             │
                         ▼                    │
                    ┌──────────┐              │
                    │ rejected │──────────────┘
                    └──────────┘  resurrect

       accepted → merged (PR merged; artifact "landed")
       merged → archived (new cycle supersedes)
```

### 3.2 Transition Events (13 events)

| From → To | event | Trigger | Git action |
|---|---|---|---|
| (none) → draft | `create` | `cycle new` or first file write | branch create + first commit |
| draft → accepted | `validate` | schema + cross-stage pass | push commit |
| draft → rejected | `reject` | schema invalid unrecoverable | delete file, close PR |
| draft → blocked | `block` | dependency not ready | mark PR as draft |
| accepted → iterating | `revise` | user/agent triggers revision | push commit + push same PR |
| accepted → blocked | `block` | downstream issue | label PR `blocked` |
| accepted → archived | `archive` | new cycle supersedes | delete branch, close PR |
| iterating → accepted | `validate` | revision validated | push commit + comment PR |
| iterating → rejected | `reject` | revision still fails | close PR |
| blocked → draft | `unblock` | dependency ready | unlabel PR |
| blocked → rejected | `reject` | blocker unresolvable, abandon | close PR |
| rejected → draft | `resurrect` | retry | re-open branch + PR |
| archived → draft | `unarchive` | old artifact reactivated | re-open branch |
| **accepted → merged** | `merge` | **PR merged; artifact "landed"** | **delete branch** |
| **merged → archived** | `archive` | **new cycle supersedes** | (no-op; already merged) |

### 3.3 Event Schema

```typescript
type SdlcEvent = {
  // Identity
  event_id: string;           // ULID
  ts: string;                 // ISO timestamp
  schema_version: '1.0.0';

  // What
  event: EventType;
  cycle_id: number;
  stage: 'plan' | 'design' | 'build' | 'test' | 'deploy' | 'maintain';
  artifact_id: string;

  // Who
  actor:
    | { type: 'human'; id: string }
    | { type: 'agent'; id: string }
    | { type: 'hook'; id: string };

  // Git binding
  git?: {
    branch?: string;
    commit_before?: string;
    commit_after?: string;
    pr_number?: number;
    pr_url?: string;
  };

  // CI binding
  ci?: {
    runs: Array<{
      provider: 'github-actions' | 'gitlab-ci';
      run_id: string;
      url: string;
      status: 'queued' | 'running' | 'success' | 'failure' | 'cancelled';
    }>;
  };

  // Payload (event-specific)
  payload: Record<string, unknown>;
  // Examples:
  //   create: { initial_artifact_path: 'intent.md', title: 'OAuth' }
  //   validate: { errors_before: [], schema_version: '0.5.0' }
  //   block: { blocker_url: 'https://...' }
  //   archive: { successor_cycle_id: 4 }
};
```

### 3.4 Git Lifecycle Integration

#### 3.4.1 Branch Creation (cycle new)

```typescript
async function createBranch(cycleId: number, title: string): Promise<string> {
  const slug = title.toLowerCase().replace(/\s+/g, '-').slice(0, 30);
  const branchName = `sdlc/cycle-${String(cycleId).padStart(2, '0')}-${slug}`;
  await execa('gh', [
    'api', '-X', 'POST',
    `/repos/{owner}/{repo}/git/refs`,
    '-f', `ref=refs/heads/${branchName}`,
    '-f', `sha={main_branch_sha}`,
  ]);
  return branchName;
}
```

Conflict handling: if branch exists, reuse and emit event; if slug collides, add 4hex suffix.

#### 3.4.2 Commit + Push (stage accepted)

```typescript
async function commitArtifact(branch: string, artifactPath: string, message: string): Promise<string> {
  // commit message format: sdlc(<stage>): <artifact path> accepted for cycle <N>
  await execa('git', ['add', artifactPath], { cwd: branchPath });
  await execa('git', ['commit', '-m', message], { cwd: branchPath });
  await execa('git', ['push', 'origin', branch], { cwd: branchPath });
  return execa.stdout('git', ['rev-parse', 'HEAD'], { cwd: branchPath });
}
```

#### 3.4.3 PR/MR Creation (cycle all accepted)

When all 6 stages are `accepted`:

```typescript
async function openPR(branch: string, cycleId: number, title: string): Promise<{number, url}> {
  const pr = await execa('gh', [
    'pr', 'create',
    '--base', 'main',
    '--head', branch,
    '--title', `[cycle ${cycleId}] ${title}`,
    '--body', generatePRBody(cycleId),
    '--label', 'sdlc-cycle',
    '--label', `cycle-${cycleId}`,
  ]);
  return { number: parsePrNumber(pr), url: prUrl };
}
```

Reviewer assignment via CODEOWNERS:

```gitignore
# .loshu-sdlc/CODEOWNERS (or .github/CODEOWNERS)
/spec.md    @architecture-team @security-reviewer
/plan.md    @eng-leads
/REVIEW.md  @security-team @qa-leads
/intent.md  @product-team
/bands.yaml @sre-team
/*         @loshu89
```

CLI parses this file at stage-accepted events and passes reviewers to `gh pr create --reviewer`.

#### 3.4.4 Branch Archive (cycle archived)

```typescript
async function archiveBranch(branch: string): Promise<void> {
  await execa('gh', ['api', '-X', 'DELETE',
    `/repos/{owner}/{repo}/git/refs/heads/${branch}`]);
  await execa('gh', ['pr', 'close', '--delete-branch']);
}
```

### 3.5 Transition Guards

| Transition | Guard |
|---|---|
| `draft → accepted` | (1) schema valid (2) cross-stage: prev stage is `accepted` (3) `git.branch` exists |
| `accepted → merged` | (1) all CI success (2) ≥1 approval (3) PR has no unresolved comments (4) main mergeable |
| `accepted → archived` | (1) new cycle exists (2) new cycle's corresponding artifact exists |
| `iterating → accepted` | (1) git has new commit (2) schema valid |

### 3.6 Final State: `merged`

PR-merged artifact enters `merged` (separate from `accepted`):

```
accepted → merged   (PR merged; artifact landed)
merged → archived   (new cycle supersedes)
```

Why a distinct state? `accepted` means "ready for review"; `merged` means "landed in main".

### 3.7 Hook Integration

Each stage hook now does more than schema validation:

```bash
# plan-exit.sh (pseudocode)
1. debounce (2s settle; v0.5.0)
2. validate intent.md schema
3. cross-stage check (intent has no prev; just verify required fields)
4. If pass:
   - generate ID, fill frontmatter if missing
   - create branch (if cycle new)
   - commit + push
   - write events.jsonl { event: validate, ... }
   - update state = accepted in cycle.json
5. If CI configured, trigger CI:
   - gh workflow run ci.yml --ref <branch>
   - write run_id to events.jsonl
6. If cycle's last stage (maintain accepted):
   - trigger PR creation
   - assign reviewers from CODEOWNERS
7. CI pass + approvals:
   - merge PR
   - set state = merged
```

### 3.8 Acceptance Assertions (Preview)

- **C1**: state transitions follow DAG (no illegal)
- **C2**: `state` enum in schema
- **C3**: events.jsonl entry per transition
- **C4**: git branch exists
- **C5**: git commit SHA is real
- **C6**: PR open when cycle all accepted
- **C7**: state = `merged` after PR merge
- **C8**: branch deleted after archive
- **C9**: events.jsonl is append-only (event_id monotonic)
- **C10**: reviewers are CODEOWNERS-matched

### 3.9 Scope Boundaries

| In scope | Out of scope |
|---|---|
| Branch + PR/MR + merge automation | Webhook receiver (use polling) |
| CODEOWNERS-based reviewer assignment | Custom review policies |
| Merge + cleanup | Auto-rebase |
| Events.jsonl audit | Real-time dashboard UI |
| GitHub + GitLab dual-platform | Gitea / Bitbucket / Azure DevOps |

---

## §4 Acceptance Testing Layer (D)

### 4.1 Four Test Layers

```
┌──────────────────────────────────────────┐
│ Layer 4: E2E (cycle run-through)            │
├──────────────────────────────────────────────────────────────────────────┤
│ Layer 3: Cross-artifact (dependencies) │
├──────────────────────────────────────────────────────────────────────────┤
│ Layer 2: Per-artifact (schema + invariants)│
├──────────────────────────────────────────────────────────────────────────┤
│ Layer 1: Field-level (format + semantic)    │
└──────────────────────────────────────────┘
```

Each layer runs independently, reports independently, fails independently.

### 4.2 Test Discovery (Registry + Glob)

Tests aren't hardcoded to "intent.md". Discovery via:

```typescript
async function discoverArtifacts(rootPath: string): Promise<Artifact[]> {
  const cycles = await loadCycles(rootPath);
  const artifacts: Artifact[] = [];
  for (const cycle of cycles) {
    for (const [stage, stageData] of Object.entries(cycle.stages)) {
      if (stageData.artifact_path) {
        const fm = parseFrontmatter(stageData.artifact_path);
        artifacts.push({
          stage: stage as Stage,
          filePath: join(rootPath, stageData.artifact_path),
          id: fm.id,
        });
      }
    }
  }
  return artifacts;
}
```

### 4.3 Assertion Library

```typescript
export type AssertionResult =
  | { pass: true; rule: string }
  | { pass: false; rule: string; message: string; fix?: string };

export interface Assertion {
  rule: string;        // e.g., 'A1', 'V3', 'C7'
  layer: 1 | 2 | 3 | 4;
  run: (artifact: Artifact) => Promise<AssertionResult>;
}
```

**All 22 assertions:**

| Rule | Layer | Check | Auto-fix |
|---|---|---|---|
| A1 | 1 | frontmatter has `id` | generate new ID |
| A2 | 1 | `id` matches regex | regenerate |
| A3 | 1 | `id` globally unique | regenerate |
| A4 | 1 | `schema_version` is semver | fix |
| A5 | 1 | `cycle_id` exists in cycle.json | sync cycle.json |
| A6 | 1 | `state` in enum | default `draft` |
| A7 | 1 | `created_at` is ISO 8601 | add now() |
| A8 | 1 | `stage` in enum | infer |
| V1 | 1 | `schema_version` exists | — |
| V2 | 2 | `schema_version` in registry | trigger migrate |
| V3 | 2 | not deprecated | trigger migrate |
| V4 | 2 | cross-cycle parent schema consistent | warn |
| C1 | 2 | `state` transition in DAG | fail |
| C2 | 2 | schema validate pass | — |
| C3 | 2 | cross-stage guard (prev accepted) | — |
| C4 | 3 | `parent_ids` artifacts exist | — |
| C5 | 3 | `git.branch` exists | — |
| C6 | 3 | `git.commit` in branch history | — |
| C7 | 3 | cycle all accepted → PR open | open PR |
| C8 | 4 | PR CI all success | wait — |
| B1 | 4 | bands.yaml σ thresholds monotonic | — |
| B2 | 4 | bands.yaml ≥1 metric defined | — |

### 4.4 Test Runner

```bash
# Single file
loshu-sdlc test spec.md
# Output:
# Layer 1 (Field-level):    8/8 pass
# Layer 2 (Per-artifact):   4/4 pass
# Layer 3 (Cross-artifact): 2/2 pass
# Layer 4 (E2E):           1/1 pass
# Total: 15/15

# Whole project
loshu-sdlc test

# Strict (CI gate; exit 1 on any fail)
loshu-sdlc test --strict

# Single layer
loshu-sdlc test --layer 3
```

### 4.5 Report Format

```yaml
# .loshu-sdlc/test-results.yaml
runs:
  - artifact: spec.md
    cycle: 3
    stage: design
    results:
      layer: 1
        - { rule: A1, pass: true }
        - { rule: A2, pass: true }
        ...
```

### 4.6 Auto-fix (CI: cautious)

```bash
loshu-sdlc test --fix  # auto-apply all fixable failures
# Examples:
# - Missing ID → generate new ID, write frontmatter
# - Deprecated version → trigger migrate
# - Cross-stage fail → mark as iterating for manual review
```

CI defaults to **report-only** (no auto-fix). `--fix` is explicit user action.

### 4.7 Eval Suite Relationship

Existing `tests/evals/` (30 golden-file stories) is **Layer 4 subset** focused on behavior (LLM output quality).

Acceptance tests are **structural** (schema + DAG + invariants).

Both coexist:
- Acceptance = static structure (no slash command execution)
- Eval = dynamic output (mock LLM, verify artifact content)

### 4.8 Acceptance + GitHub Actions

`.github/workflows/acceptance.yml`:

```yaml
name: acceptance
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20', cache: 'pnpm' }
      - run: pnpm install --frozen-lockfile
      - run: |
          pnpm --filter @loshu89/cli exec tsx src/lib/accept/run.ts \
            --strict --reporter junit > acceptance-junit.xml
      - uses: actions/upload-artifact@v4
        with:
          name: acceptance-results
          path: acceptance-junit.xml
```

### 4.9 Scope Boundaries

| In scope | Out of scope |
|---|---|
| 4-layer tests | Performance/load tests |
| Auto-fix CLI mode | Hook auto-fix |
| Test reports to `.loshu-sdlc/test-results.yaml` | Web UI dashboard |
| GitHub Actions integration | GitLab CI integration (v1.0+) |
| Eval suite preserved as Layer 4 subset | Eval rewrite |

---

## §5 Storage Layer

### 5.1 Directory Layout (User Project)

```
my-project/
├── intent.md
├── spec.md
├── plan.md
├── CLAUDE.md
├── REVIEW.md
├── bands.yaml
├── .loshu-sdlc/                  # State (gitignored except events.jsonl for tamper evidence)
│   ├── state/
│   │   ├── cycle.json            # Current cycle + history
│   │   ├── gates.jsonl           # v0.4.0 (per-hook gate events)
│   │   ├── events.jsonl          # NEW (DAG + Git events)
│   │   └── .debounce/            # v0.5.0 debounce markers
│   ├── config.yaml               # platform config (GitHub vs GitLab)
│   ├── CODEOWNERS                # reviewer mapping
│   └── test-results.yaml         # latest acceptance run
└── .claude/                       # Generated by create-loshu-sdlc-app
    ├── settings.json
    └── hooks/                    # → symlink to plugins/loshu-sdlc/hooks/
```

### 5.2 cycle.json Schema

```typescript
interface CycleStateFile {
  schema_version: 1;
  current_cycle: number;
  cycles: Record<string, CycleEntry>;
  platform: PlatformConfig;
  branch_prefix: 'sdlc/';
}

interface CycleEntry {
  id: number;
  title: string;
  created_at: string;
  created_by: { type: 'human' | 'agent' | 'hook'; id: string };
  origin?:
    | { type: 'plan'; artifact_id: string }
    | { type: 'maintain-3sigma'; metric: string; value: number }
    | { type: 'merge'; from_cycle_id: number };
  stages: Partial<Record<Stage, StageEntry>>;
  pr?: PRRef;
  merged_at?: string;
  merged_by?: string;
  archived_at?: string;
}

interface StageEntry {
  state: 'draft' | 'accepted' | 'iterating' | 'blocked' | 'rejected' | 'merged' | 'archived';
  artifact_id?: string;
  artifact_path?: string;
  updated_at: string;
  updated_by: string;
  blocked_by?: string;
  ci_status?: 'queued' | 'running' | 'success' | 'failure';
  ci_run_id?: string;
  pr_url?: string;
}

interface PRRef {
  number: number;
  url: string;
  provider: 'github' | 'gitlab';
  state: 'draft' | 'open' | 'merged' | 'closed';
  reviewers: string[];
  approvals: number;
  ci_runs: CIRun[];
}

interface CIRun {
  provider: 'github-actions' | 'gitlab-ci';
  run_id: string;
  url: string;
  status: 'success' | 'failure' | 'pending';
}

interface PlatformConfig {
  provider: 'github' | 'gitlab';
  repo: string;
  base_branch: 'main';
  host?: string;
}
```

### 5.3 events.jsonl Append-Only Guarantee

- File mode `0444` (read-only); write helper temporarily sets `0644`
- Any modify/delete detected by git diff (since the file is gitignored, but...
  - actually events.jsonl is the one file in `.loshu-sdlc/state/` that's **committed**
- Periodic `schema_marker` line with sha256 of last event (chain integrity)

```bash
append_event() {
  local event_json="$1"
  local events_file="$ROOT/.loshu-sdlc/state/events.jsonl"
  [ -f "$events_file" ] && chmod 0644 "$events_file"
  echo "$event_json" >> "$events_file"
  chmod 0444 "$events_file"
}
```

### 5.4 config.yaml Schema

```yaml
version: 1

platform:
  provider: github                  # github | gitlab
  repo: loshu89/loshu-sdlc           # owner/repo
  base_branch: main
  host: null                        # for self-hosted GitLab

branch_prefix: sdlc/

ci:
  required_checks:
    - typecheck
    - test
    - build
    - lint
    - test:eval:strict
    - acceptance:layer-3

review:
  required_approvals: 1
  auto_request_reviewers: true

identity:
  ulid_seed: deterministic-or-random  # for test reproducibility

storage:
  events_retention_days: 365
  keep_archived_cycles: 50
```

### 5.5 CODEOWNERS Format

Located at `.loshu-sdlc/CODEOWNERS` (or `.github/CODEOWNERS` for GitHub-native).

```gitignore
/spec.md    @architecture-team @security-reviewer
/plan.md    @eng-leads
/REVIEW.md  @security-team @qa-leads
/intent.md  @product-team
/bands.yaml @sre-team
/*          @loshu89
```

Format identical to GitHub CODEOWNERS; loshu-sdlc reads it directly.

### 5.6 Concurrency Locks

```typescript
async function withLock<T>(file: string, fn: () => Promise<T>): Promise<T> {
  const lockFile = file + '.lock';
  try {
    await fs.mkdir(lockFile);  // mkdir is atomic on POSIX
  } catch (e) {
    if (e.code === 'EEXIST') throw new Error(`busy: ${file}`);
    throw e;
  }
  try {
    return await fn();
  } finally {
    await fs.rmdir(lockFile);
  }
}
```

- `cycle.json` uses mkdir lockfile
- `events.jsonl` uses atomic append + chmod dance

### 5.7 Scope Boundaries

| In scope | Out of scope |
|---|---|
| 4 state files + config.yaml + CODEOWNERS | Database (file + git only) |
| Lock mechanisms | Real-time sync (CRDT/OT) |
| Append-only events.jsonl | Encryption/signing (git GPG) |
| Retention policy | Web dashboard |

---

## §6 Scope Boundaries + System Acceptance

### 6.1 System-Level Scope

#### 6.1.1 In Scope (v0.6.0 MVP)

| Category | Contents |
|---|---|
| Artifacts | 6 user artifacts + state files (cycle.json, events.jsonl, gates.jsonl) |
| Identity | ULID-based slug ID + parent chain + provenance |
| Versioning | Schema registry + chained migrate + hand-written transforms |
| State Machine | Full DAG (incl. `merged`) + 13 transfer events + cross-stage guards |
| Git Integration | Branch lifecycle + commit/push + PR/MR + merge + cleanup |
| Platforms | GitHub (gh CLI + REST API) + GitLab (glab CLI + API) |
| Acceptance Tests | 4 layers + 22 assertions + auto-fix mode |
| CI Integration | GitHub Actions runs acceptance (GitLab CI analog) |
| Events Log | Append-only events.jsonl + chain integrity |
| Concurrency | mkdir-based lockfile + atomic append |

#### 6.1.2 Out of Scope (Deferred)

| Category | Deferred to | Why |
|---|---|---|
| Web UI / dashboard | v1.0 | CLI sufficient for technical users |
| Real-time collaborative editing | v1.0+ | CRDT/OT heavy |
| Webhook receiver | v0.7.0 | Polling + push trigger sufficient |
| Branch protection enforcement | v0.7.0 | GitHub/GitLab native rules, CLI can read but not modify |
| Cross-platform webhook receiver | v1.0+ | Third-party deps not needed |
| Encryption/signing of events.jsonl | never | git GPG on commits suffices |
| Gitea / Bitbucket / Azure DevOps | never | GitHub+GitLab covers 80% |
| Automatic schema versioning | v1.0 | Manual versioning is auditable |
| Auto-revert on failed merge | v0.7.0 | Dangerous; must be manual |
| Multi-user simultaneous editing | never | File lock + git conflict suffice |

### 6.2 System-Level Acceptance Criteria

#### 6.2.1 Functionality (22 items)

1. ✅ Every user artifact has ULID-format `id` field
2. ✅ All artifact IDs in same project are globally unique
3. ✅ Each artifact's `parent_ids` points to real upstream artifacts
4. ✅ Artifact `schema_version` exists in registry
5. ✅ `loshu-sdlc migrate spec.md --to <ver>` succeeds and sets state to `iterating`
6. ✅ `cycle new` auto-creates branch (`sdlc/cycle-N-slug`)
7. ✅ Stage `accepted` auto-commits + pushes to cycle's branch
8. ✅ All stages accepted auto-opens PR/MR + assigns reviewers from CODEOWNERS
9. ✅ PR/MR merge auto-transitions state to `merged`, deletes branch
11. ✅ State machine DAG strict: illegal transition returns error, doesn't execute
12. ✅ events.jsonl append-only + chain integrity
13. ✅ `loshu-sdlc test` runs 22 assertions all green
14. ✅ `loshu-sdlc test --strict` exits 1 on any failure
15. ✅ `loshu-sdlc test --fix` auto-applies fixable items
16. ✅ CODEOWNERS triggers reviewer auto-@-mention
17. ✅ GitHub + GitLab platform adapters both work (mocked tests)
18. ✅ Lock prevents concurrent conflicts (two sessions same project → one succeeds)
19. ✅ Retention policy cleans expired events
20. ✅ events.jsonl tamper detection (chain hash validation)
21. ✅ GitHub Actions runs acceptance + PR comments
22. ✅ Eval suite (30 stories) keeps working + Layer 4 coverage
23. ✅ `loshu-sdlc migrate --check` detects outdated `schema_version`

#### 6.2.2 Performance (4 items)

24. ✅ Acceptance tests on 100-artifact project < 10s
25. ✅ cycle.json read/write < 100ms
26. ✅ events.jsonl append < 10ms (even with 10k+ events)
27. ✅ Lock acquisition < 50ms (no contention)

#### 6.2.3 Security (3 items)

28. ✅ events.jsonl contains no secrets (commit diff visible in git log)
29. ✅ Hook scripts use `set -euo pipefail`, don't eval unsigned input
30. ✅ `loshu-sdlc migrate --to <unknown-ver>` rejects execution

#### 6.2.4 Compatibility (3 items)

31. ✅ Existing v0.5.0 projects (no Identity field) can migrate to v0.6.0 schema (adds ID)
32. ✅ Existing eval suite (30 stories) keeps working, no breaking
33. ✅ Existing CHANGELOG / README / plugin metadata unchanged

### 6.3 Implementation Phases

**v0.6.0 (this design's MVP):**
- Identity, Versioning, State Machine, Acceptance all foundational
- GitHub adapter complete; GitLab adapter deferred
- 23 user acceptance + 4 performance + 3 security + 3 compatibility = 33 items

**v0.7.0:**
- GitLab adapter complete
- Webhook receiver
- Branch protection enforcement
- Auto-revert on failed merge

**v1.0:**
- Web UI dashboard
- Real-time collaboration
- Cross-platform support

### 6.4 Test Strategy

```
unit tests (vitest)
  └─ 4-layer acceptance (run via tsx)
       └─ Per-rule unit tests for assertions (Layer 1, 2, 3, 4 each)
       └─ Cross-rule interaction tests
  └─ E2E: create-loshu-sdlc-app my-app && cd my-app && loshu-sdlc test
  └─ Integration with GitHub Actions
```

New tests in `packages/cli/tests/accept/`:
- `assertions/A*.test.ts` (Layer 1, 8 tests)
- `assertions/V*.test.ts` (Layer 2, 4 tests)
- `assertions/C*.test.ts` (Layer 2+3, 6 tests)
- `assertions/B*.test.ts` (Layer 4, 2 tests)
- `discover.test.ts` (artifact discovery, 3 tests)
- `migrate.test.ts` (chain migration, 4 tests)
- `lock.test.ts` (concurrency, 2 tests)
- `platforms/github.test.ts` (mocked, 4 tests)
- `platforms/gitlab.test.ts` (mocked, 4 tests)

Total: ~37 new acceptance tests + existing 109 → **~146 tests in v0.6.0**.

### 6.5 Phasing Rationale

Why this staged rollout:

- **v0.6.0 = technical core.** **Without** this, the system is half-implemented: state machine exists but no ID/version/git integration. Half-built artifacts can't be safely versioned.
- **v0.7.0 = platform completeness.** GitLab + webhooks bring the system to 95% of users.
- **v1.0 = UX layer.** UI is gold plating; system is functionally complete at v0.7.0.

Each phase is independently usable. v0.6.0 alone ships as a working artifact-management system even without v0.7.0 features.

### 6.6 Scope Boundaries (Repeat for Clarity)

| In scope (v0.6.0) | Out of scope |
|---|---|
| ✅ All 4 layers (Identity/Versioning/State/Acceptance) | ❌ Webhook receiver |
| ✅ GitHub + GitLab dual-platform | ❌ Third-party platforms |
| ✅ 22+4+3+3=33 acceptance assertions + tests | ❌ Performance benchmark suite |
| ✅ v0.6.0 only (not v0.7.0+ features) | ❌ v0.7.0+ functionality |

---

## References

- **Spec source:** loshu-sdlc v0.5.0 architecture continuation
- **Prior work:** brainstorming transcript + design review
- **Related specs:**
  - `docs/superpowers/specs/2026-09-11-loshu-sdlc-design.md` (original architecture)
  - `docs/superpowers/specs/2026-09-15-loshu-sdlc-state-mgmt-design.md` (TBD after this spec)
- **External patterns:** ULID spec (https://github.com/ulid/spec), GitHub CODEOWNERS, XState