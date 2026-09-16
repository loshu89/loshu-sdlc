# PLAN-TEMPLATE

> **For plan authors:** This template uses **progressive disclosure**, mirroring `docs/superpowers/specs/SPEC-TEMPLATE.md`. A plan is split into one index file (`plan.md`) plus one file per task (`task-NN-*.md`). Executors load only the index + their own task file — never the whole plan. This keeps context consumption proportional to the task, not the project.

---

## Why split plans

Monolithic plans (the v0.1.0 plan was 4524 lines, v0.6.0 was 2772) force every executor to either:

- load the entire plan (wastes 90%+ of context on other tasks), or
- rely on a controller to extract their task text (the SDD `task-brief` script exists precisely because of this).

Per-task files make extraction trivial: the task file **is** the brief. The controller dispatches with a file path; the executor reads ~350 lines total (index + own task) instead of ~4500.

---

## Usage

```
docs/superpowers/plans/<feature>/
├── plan.md              ← index: header, global constraints, task table (~100-200 lines)
├── task-01-<slug>.md    ← one file per task, full task text
├── task-02-<slug>.md
├── ...
└── task-NN-<slug>.md
```

**Loading strategy:**

| Actor | Loads | Size |
|---|---|---|
| Controller (SDD) | `plan.md` only | ~150 lines |
| Executor (per task) | `plan.md` header + global constraints + own `task-NN-*.md` | ~350 lines |
| Reviewer | task file + diff | ~250 lines |
| Human (progress check) | `plan.md` task table (checkbox states) | ~150 lines |

---

## Template: `plan.md` (copy-paste and fill in)

````markdown
# <Feature Name> Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Each task's full text lives in its own `task-NN-*.md` file — load only the task you are executing.

**Goal:** <one sentence>

**Architecture:** <2-3 sentences>

**Tech Stack:** <key technologies>

**Spec:** <path to spec directory, e.g. `docs/superpowers/specs/<feature>/spec.md`> — the plan argues from the spec; executors read both.

## Global Constraints

<The spec's project-wide requirements — version floors, dependency limits, naming rules, platform requirements. One line each, exact values copied verbatim from the spec. Every task's requirements implicitly include this section, so keep it tight (<30 lines).>

- Node ≥ 20.0.0
- pnpm ≥ 9.0.0 (invoke via `npx pnpm@9.0.0 <cmd>` if not on PATH)
- TypeScript strict mode
- Conventional Commits
- ...

## Task Index

Progress is tracked here. Executor marks `- [x]` when their task is committed; controller verifies via review before checking the box.

| # | Task | Files | Depends on | Status |
|---|------|-------|-----------|--------|
| 1 | [Install dependencies](task-01-install-deps.md) | `package.json` | — | ☐ |
| 2 | [Core library](task-02-core-lib.md) | `src/lib/core.ts` | 1 | ☐ |
| 3 | [CLI command](task-03-cli.md) | `src/commands/x.ts` | 2 | ☐ |
| ... | | | | |

**Batching note:** Tasks marked ⟦batch⟧ are same-shape work — the controller may dispatch them to a single executor as one combined brief (see SDD batching rule).

## Task Dependencies (DAG)

```
1 → 2 → 3
      ↘ 4 (parallel with 3)
5 (independent, any time)
```

<Only include if non-linear. Linear plans skip this section.>

## Verification (final gate)

Before release:

```bash
pnpm typecheck && pnpm test && pnpm build && pnpm lint
```

<Plus any feature-specific final checks: eval suite, smoke tests, manual QA steps.>

## Self-Review Checklist (author runs before handing off)

- [ ] Every spec § referenced by a task exists in the spec
- [ ] Every task names exact file paths (no "appropriate file")
- [ ] Every code step has the actual code (no "implement X")
- [ ] Interfaces produced by task N match what task N+1 consumes (names, types, signatures)
- [ ] No task depends on a later task
- [ ] Test commands are runnable verbatim
- [ ] Commit messages follow Conventional Commits
````

---

## Template: `task-NN-<slug>.md` (one per task)

````markdown
# Task NN: <Task Name>

**Plan:** [plan.md](plan.md) — read its Global Constraints first; they apply here.
**Spec refs:** <§N-name.md files this task implements, e.g. `specs/<feature>/6-api-surface.md`>

## Files

- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts` <line range if known>
- Test: `tests/exact/path/to/test.ts`

## Interfaces

- **Consumes:** <what this task uses from earlier tasks — exact signatures, e.g. `generateId(opts: GenerateIdOptions): string` from task 2>
- **Produces:** <what later tasks rely on — exact function names, parameter and return types. The next task's executor sees only their own file; this block is how they learn your API.>

## Steps

TDD order: failing test → verify fail → implement → verify pass → commit.

- [ ] **Step 1: Write the failing test**

```typescript
// tests/exact/path.test.ts — full content, no elision
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm test -- <path>
```

Expected: FAIL with "<exact expected error>".

- [ ] **Step 3: Write minimal implementation**

```typescript
// src/exact/path.ts — full content, no elision
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm test -- <path>
```

Expected: PASS (N tests).

- [ ] **Step 5: Commit**

```bash
git add <exact paths>
git commit -m "<type>(<scope>): <description>"
```

## Known gotchas

<Environment quirks the executor will hit: ESM vs CJS interop, exactOptionalPropertyTypes requiring `| undefined`, noUncheckedIndexedAccess requiring `!` or `??`, Windows path issues, pnpm invoked via npx, etc. Every gotcha discovered by a previous task's executor should be back-ported here.>

## Report contract

Write report to `<workspace>/task-NN-report.md`; reply with only:

- **Status:** DONE | DONE_WITH_CONCERNS | BLOCKED | NEEDS_CONTEXT
- Commits created (short SHA + subject)
- One-line test summary
- Concerns (if any)
- Report file path
````

---

## Authoring rules

1. **Task right-sizing:** a task is the smallest unit with its own test cycle and reviewer gate. Fold setup/config/docs into the task whose deliverable needs them.
2. **Step granularity:** each step is one action (2-5 minutes): write test / run test / implement / run test / commit.
3. **No placeholders:** every step contains actual content. "TBD", "add appropriate error handling", "similar to Task N" are plan failures — repeat the code, the executor may read tasks out of order.
4. **Interfaces block is a contract:** names and types written there must match the code exactly. A function called `clearLayers()` in task 3 but `clearFullLayers()` in task 7 is a plan bug.
5. **Back-port gotchas:** when an executor reports an environment quirk (ESM interop, strict-mode widening, path resolution), add it to the "Known gotchas" of every later task that will hit it.
6. **One commit per task** unless the task is explicitly a batch of same-shape edits.
7. **Task files are self-contained:** an executor reads `plan.md` (constraints) + their own task file and needs nothing else. Never write "see task 3 for the pattern" — copy the pattern.

## Naming

- Task files: `task-NN-<kebab-slug>.md`, NN zero-padded (`task-01-`, not `task-1-`) so lexical sort = execution order.
- Slug ≤ 4 words: `task-07-migrate-cli.md`, not `task-07-implement-the-migrate-command-for-the-cli.md`.

## Anti-patterns

- **Don't** write one 4000-line plan.md. If the index exceeds ~250 lines, content belongs in task files.
- **Don't** duplicate global constraints into every task file — the task links to plan.md.
- **Don't** put design rationale in the plan. Rationale lives in the spec (§10-adr.md); the plan references it.
- **Don't** leave the Task Index status column stale — it's the human-visible progress board.
- **Don't** number tasks by file count ("task 3: 7 files"). Number by deliverable ("task 3: migrate CLI command").

## Relationship to SPEC-TEMPLATE

| | SPEC | PLAN |
|---|---|---|
| Answers | *What* + *why* | *How*, in what order |
| Main file | `spec.md` (description, triggers, § index) | `plan.md` (goal, constraints, task index) |
| Leaf files | `N-<concern>.md` (§1-§12) | `task-NN-<slug>.md` |
| Leaf granularity | by concern (domain, state, API…) | by deliverable (one commit-cycle each) |
| Stable after ship? | Yes (living doc, versioned) | No (archive when executed; the code + CHANGELOG are the record) |

A plan always links to the spec it implements; a spec never links to plans (specs outlive them).
