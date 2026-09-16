# §4 Acceptance Testing Layer (D)

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
| C6 | 3 | PR exists in platform API with matching state | sync |
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

## Cross-references

- See also: [1-identity.md](1-identity.md) for A1-A8 field-level assertions on identity frontmatter
- See also: [2-versioning.md](2-versioning.md) for V1-V4 schema-version assertions
- See also: [3-state-machine-git.md](3-state-machine-git.md) for C1-C9 transition and git-binding assertions
- See also: [5-storage.md](5-storage.md) for the test-results.yaml report file location
- See also: [6-scope-acceptance.md](6-scope-acceptance.md) for the full system-level acceptance criteria (33 items) that this 22-assertion suite feeds into
