# §3 State Machine + Git Lifecycle (C)

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

  // Git binding (PR ref + branch; commit SHA is queried from platform API)
  git?: {
    branch?: string;
    pr_number?: number;
    pr_url?: string;
    // NOTE: commit_before/commit_after intentionally NOT stored. See §3.7.
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
- **C4**: git branch exists (via `git rev-parse --verify`)
- **C5**: PR exists in platform API with `state` matching artifact `state`
- **C6**: state = `merged` requires PR state = `merged` in platform API
- **C7**: branch deleted after archive
- **C8**: events.jsonl is append-only (event_id monotonic)
- **C9**: reviewers are CODEOWNERS-matched

### 3.9 Scope Boundaries

| In scope | Out of scope |
|---|---|
| Branch + PR/MR + merge automation | Webhook receiver (use polling) |
| CODEOWNERS-based reviewer assignment | Custom review policies |
| Merge + cleanup | Auto-rebase |
| Events.jsonl audit | Real-time dashboard UI |
| GitHub + GitLab dual-platform | Gitea / Bitbucket / Azure DevOps |

## Cross-references

- See also: [§1-identity.md](§1-identity.md) for the `cycle_id`, `stage`, and `git.branch` frontmatter fields consumed by this state machine
- See also: [§2-versioning.md](§2-versioning.md) for how `state = iterating` is forced after schema migration
- See also: [§4-acceptance.md](§4-acceptance.md) for the C1-C9 assertion rules that gate transitions
- See also: [§5-storage.md](§5-storage.md) for cycle.json schema, events.jsonl append-only guarantees, and CODEOWNERS file format
- See also: [§6-scope-acceptance.md](§6-scope-acceptance.md) for system-level acceptance items tied to state and git operations
