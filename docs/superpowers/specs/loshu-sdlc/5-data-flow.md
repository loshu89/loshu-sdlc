# §5 Data Flow

<!-- Bootstrap, happy path, loop closure, cross-stage navigation, error handling. -->

How artifacts move through the system, what triggers each transition, and what happens when things go wrong.

## Project bootstrap

**Fresh project:**
```
$ npx create-loshu-sdlc-app my-app [--with-ux] [--with-ecc] [--with-all]
  [--template minimal|full] [--existing] [--coverage 80] [--branch 75]
  [--no-git] [--yes] [--strict] [--json] [--verbose] [--quiet]
```

**Existing project (in-place):**
```
$ npx create-loshu-sdlc-app . --existing
```
Detects existing repo; does not seed `intent.md`/`spec.md`/`plan.md`; starts SDLC at next change.

## Happy path

User story → `/sdlc-plan` → `intent.md` → `/sdlc-design` → `spec.md` (also copies `policy-default/` files into the user's project root) → `/sdlc-build` → `plan.md` + `CLAUDE.md` + project-level `SKILL.md` (the project policy file, scaffolded from `policy-template/`) → `/sdlc-test` → verification block + `evals/` → `/sdlc-deploy` → `REVIEW.md` → `/sdlc-maintain` → `bands.yaml` evaluation.

**Terminology note:**
- "Plugin-internal skills" = `packages/plugin/skills/*` — used by Claude Code when invoking our slash commands
- "Project-level SKILL.md" = `<user-project>/SKILL.md` — the project policy file, scaffolded by `/sdlc-build` from `policy-template/`
- "policy-default/*" = shipped defaults copied into user-project root by `/sdlc-design`

## Loop closure

3σ incident → `loshu-sdlc/maintain` hook BLOCKS → `/sdlc-maintain` invokes `superpowers:systematic-debugging` → produces new `intent.md` (incident-driven) → PO accepts → cycle restarts at Plan stage.

## Cross-stage navigation

`/sdlc-status` (and `loshu-sdlc status`) shows current cycle state: stage, artifact, status, last update, next gate.

---

## Error handling

### Error categories

| Code | Severity | Recovery |
|---|---|---|
| E1 | Tier-1 dep missing | Install instructions; hard fail |
| E2 | Schema validation fail | Show field/location; suggest fix |
| E3 | Stage gate not satisfied | Tell user what's missing |
| E4 | Hook block | Specific actionable error |
| E5 | External plugin fail | Retry + fallback (configurable) |
| E6 | REVIEW.md status:fail | Block deploy; show remediation |
| E7 | Band 3σ incident | Auto-generate intent.md |
| E8 | Build/test/lint not green | Block test-exit; show failing command |
| E9 | Coverage below threshold | Block test-exit; show uncovered files |
| E10 | Coverage drop | Warn only |

### Hook exit semantics

```
exit 0  → allow
exit 2  → block; stderr fed back to model as error
other  → non-block error; stderr logged
```

### Fallback strategy

- `ecc:code-reviewer` fail → loshu-sdlc native code-review
- `ecc:security-reviewer` fail → **block** (security is non-negotiable)
- `ecc:architect` fail → loshu-sdlc native spec authoring
- `ui-ux-pro-max` fail → borrowed baseline in `policy-default/`
- `superpowers:*` fail → **never falls back** (Tier-1)

### CLI exit codes

```
0 success; 1 generic; 2 usage; 3 validation; 4 external dep;
5 hook; 6 git; 7 template; 8 permission
```

## Cross-references

- See also: [3-domain-model.md](3-domain-model.md) for the slash command → external dependency map
- See also: [4-state-machine.md](4-state-machine.md) for the compliance rules these flows must satisfy
- See also: [6-api-surface.md](6-api-surface.md) for CLI flags referenced in the bootstrap section
- See also: [8-acceptance.md](8-acceptance.md) for how the happy path is tested
