# Task 2: Author backlog addendum

**Goal:** Create `docs/superpowers/specs/2026-09-18-v0.8.0-backlog.md` — a one-page addendum to `docs/superpowers/specs/doc-mgmt/6-scope-acceptance.md` §6.1.2 / §6.2.2-4 with one-line dispositions per deferred item.

**Spec:** `docs/superpowers/specs/2026-09-18-v0.8.0-design.md` §Components.2 (`backlog.md`).

**Files:**
- Create: `docs/superpowers/specs/2026-09-18-v0.8.0-backlog.md`

**Interfaces:**
- Consumes: `docs/superpowers/specs/doc-mgmt/6-scope-acceptance.md` §6.1.2 / §6.2.2-4 (read-only source).
- Produces: a single Markdown addendum that future brainstorming can cite instead of relitigating.

---

- [ ] **Step 1: Read §6.1.2 / §6.2.2-4 of the source spec**

Read `D:/workspace/3.my/SDLC/docs/superpowers/specs/doc-mgmt/6-scope-acceptance.md` end to end. Confirm the exact list of deferred items:
- §6.1.2: Webhook receiver, Branch protection enforcement, Auto-revert on failed merge.
- §6.2.2 (items 24-27): Performance benchmark suite (cycle.json read/write < 100ms, events.jsonl append < 10ms, lock acquisition < 50ms).
- §6.2.3 (items 28-30): events.jsonl secrets, hook signatures, rejected unknown version on migrate.
- §6.2.4 (items 31-33): Existing v0.5.0 projects migrate, eval suite stable, CHANGELOG/README/plugin metadata unchanged.

- [ ] **Step 2: Draft the backlog addendum**

Use this template (fill in real disposition rationales):

```markdown
# v0.8.0 Backlog Disposition — addendum to spec §6.1.2 / §6.2.2-4

**Date:** 2026-09-18
**Status:** Approved (v0.8.0 design `8f0b479`)
**Source:** `docs/superpowers/specs/doc-mgmt/6-scope-acceptance.md` §6.1.2 / §6.2.2-4

This addendum disposition every deferred item from the original scope
spec so future brainstorming doesn't relitigate the same questions.

## §6.1.2 items

### Webhook receiver

**Disposition:** **Deferred indefinitely.** Not worth building.

**Rationale:** The scope spec's own footnote ("Polling + push trigger
sufficient") matches our model. We already have `loshu-sdlc bands
record` + `maintain-exit` 3σ fork as the push-trigger primitive
(v0.6.4). `docs/internal/playbook-coverage-analysis.md` confirms
the playbook supports the polling-and-push approach.

A webhook receiver would be:
- An HTTP server that requires deployment + ops surface we don't have.
- A security surface (HMAC validation, signature handling) for marginal value.
- Redundant with `loshu-sdlc git sync --execute` which already covers
  the "respond to a PR merge" use case.

### Branch protection enforcement

**Disposition:** **Deferred to v1.0.** Read-only status at v0.8.x.

**Rationale:** GitHub / GitLab native branch protection rules already
exist; this CLI could surface them at `loshu-sdlc repo protection`
(read-only) but writing requires OAuth scopes we haven't
negotiated. Read-only status is useful but not urgent — the existing
5 stage-exit hooks already enforce branch-side controls (state
transitions, schema validity, CODEOWNERS-driven reviewers).

### Auto-revert on failed merge

**Disposition:** **Deferred to v0.8.x as part of Maintain closure spec.**

**Rationale:** Maps directly to the AI-Native SDLC playbook's "Any
breached control band is diagnosed and written back into the loop
as a new intent.md". This is the broader Maintain → Plan loop closure
gap flagged in `playbook-coverage-analysis.md`.

Until the broader Maintain automation spec is written, an
auto-revert on failed merge would be a partial primitive without the
diagnose-and-write-back half. Don't build half a loop.

## §6.2.2 items (performance)

### Items 24-27 (cycle.json < 100ms, events.jsonl < 10ms, lock < 50ms, suite < 10s)

**Disposition:** **Dropped.**

**Rationale:** This project is a CLI tool with no high-throughput
service component. Performance benchmarks would be theater.

The accept gate that matters is **wall-clock for the agent's daily
workflow** — `pnpm install` < 60s, `pnpm test` < 30s, `pnpm lint` <
10s. These are observable; track them informally and ship a regression
fix only if they break.

## §6.2.3 items (security)

### Item 28 (events.jsonl no secrets)

**Disposition:** **Deferred to v0.9.x if any secret-handling use case
emerges.** Currently no events carry secrets — the event log is
SDLC state transitions only.

### Item 29 (hook signatures: hooks don't eval unsigned input)

**Disposition:** **Already covered.** Bash hooks use `set -euo pipefail`
and read only typed parameters (file paths, commit messages). No
string eval. See `packages/plugin/hooks/lib/event-emit.sh` and the
five stage-exit hooks.

### Item 30 (migrate --to <unknown-ver> rejects)

**Disposition:** **Already covered** as of v0.6.0. The `migrate` command
in `packages/cli/src/commands/migrate.ts` rejects unknown versions
with a clear error and non-zero exit. Verified by the v0.6.0 acceptance
test suite.

## §6.2.4 items (compatibility)

### Item 31 (existing v0.5.0 projects migrate to v0.6.0 schema)

**Disposition:** **Already covered.** `loshu-sdlc migrate --from
<old> --to <new>` is the canonical upgrade path; tested by the
migration acceptance suite.

### Item 32 (eval suite stable, no breaking)

**Disposition:** **Stable as of v0.7.1.** Eval suite is 30 stories,
fully green. Future releases must keep `pnpm test:eval:strict`
passing.

### Item 33 (CHANGELOG / README / plugin metadata unchanged)

**Disposition:** **Convention enforced.** CHANGELOG.md is append-only
(history). README.md untouched in plugin-metadata path (per
`.github/repo-metadata.md`). Violations of this convention are
release-blocking.

## Summary

| Item | Disposition |
|---|---|
| Webhook receiver | Deferred indefinitely |
| Branch protection enforcement | Deferred to v1.0 (read-only at v0.8.x) |
| Auto-revert on failed merge | Deferred to v0.8.x (Maintain closure) |
| Performance items 24-27 | Dropped |
| events.jsonl secrets | Deferred to v0.9.x if needed |
| Hook signatures | Already covered |
| migrate unknown ver | Already covered (v0.6.0) |
| Compatibility items 31-33 | Already covered / convention enforced |

**Total deferred to v0.8.x:** 1 (auto-revert, as part of Maintain)
**Total deferred to v0.9.x:** 1 (events.jsonl secrets)
**Total deferred to v1.0:** 1 (branch protection write)
**Total dropped:** 1 (performance benchmarks)
**Total deferred indefinitely:** 1 (webhook)
**Total already covered:** 4 (compatibility + 2 security)

Next time these items come up in brainstorm, cite this addendum
and link to it. Don't relitigate.
```

- [ ] **Step 3: Verify cross-references**

- Verify `docs/superpowers/specs/doc-mgmt/6-scope-acceptance.md` still has §6.1.2 / §6.2.2-4 unchanged (i.e., we didn't accidentally edit the historical spec). Run `git diff HEAD docs/superpowers/specs/doc-mgmt/6-scope-acceptance.md` — should be empty.
- Verify the addendum file references the right spec section numbers.

- [ ] **Step 4: Run the verification gauntlet (no source change but confirm no regression)**

Run: `npx pnpm@9.0.0 typecheck && npx pnpm@9.0.0 lint && npx pnpm@9.0.0 test`
Expected: clean, 229/229 still passing.

- [ ] **Step 5: Commit**

```bash
git add docs/superpowers/specs/2026-09-18-v0.8.0-backlog.md
git commit -m "docs(spec): v0.8.0 backlog cleanup — disposition \u00a76.1.2 / \u00a72.2-4

Dispositions for every deferred item in
docs/superpowers/specs/doc-mgmt/6-scope-acceptance.md so future
brainstorming doesn't relitigate the same questions:

  - Webhook receiver: deferred indefinitely (playbook supports
    polling+push; v0.6.4 already has 3\u03c3 fork primitive).
  - Branch protection enforcement: deferred to v1.0 (write requires
    OAuth scopes not negotiated; read-only at v0.8.x is useful but
    not urgent).
  - Auto-revert on failed merge: deferred to v0.8.x as part of
    Maintain closure (half a loop without diagnose+write-back is
    worse than no loop).
  - Performance items 24-27: dropped (CLI tool, not service).
  - Events.jsonl secrets: deferred to v0.9.x if any secret-handling
    use case emerges.
  - Hook signatures / migrate unknown ver / compatibility items
    31-33: already covered, conventions enforced.

Closes the second-highest-ROI gap from
docs/internal/playbook-coverage-analysis.md."
```
