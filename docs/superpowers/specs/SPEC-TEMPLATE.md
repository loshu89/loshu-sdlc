# SPEC-TEMPLATE

> **For spec authors:** This template uses **progressive disclosure**, inspired by Claude Code's SKILL.md. The spec is split into 4 layers that are loaded on demand, not all upfront. This avoids burning context on a 1500-line monolith when AI only needs 30 lines to start coding.

---

## Usage

```
docs/superpowers/specs/<feature>/
├── spec.md              ← main file (this template's structure)
├── §1-goals.md
├── §2-non-goals.md
├── §3-domain-model.md
├── §4-state-machine.md
├── §5-data-flow.md
├── §6-api-surface.md
├── §7-ux-wireframes.md
├── §8-acceptance.md
├── §9-nfrs.md
├── §10-adr.md
├── §11-open-questions.md
└── §12-references.md
```

**Layer 1 (always loaded, 10-30 lines):** Description + trigger. AI and humans read this first.
**Layer 2 (loaded on trigger, 5-15 lines):** Trigger conditions. AI reads this when the spec is referenced.
**Layer 3 (lazy, 500-2000 lines total across §-files):** Full design. AI reads only the §-files it needs.
**Layer 4 (changelog, always at bottom):** What changed and when.

---

## Template (copy-paste this into your `spec.md`)

```markdown
# <Feature Name> — Design Spec

> **Status:** Draft | In Review | Approved | Implementing | Shipped
> **Date:** YYYY-MM-DD
> **Target version:** vX.Y.Z
> **Source material:** <optional link>

---

## Description (Layer 1 — always loaded)

<One paragraph: what this is, the problem it solves, the proposed outcome. 3-5 sentences max.>

**Example:**
> loshu-sdlc v0.6.0 completes the artifact management system by adding four layers: Identity (every artifact gets a unique ID), Versioning (schema registry with migration), State Machine + Git lifecycle (DAG with platform adapters), and Acceptance Testing (4-layer assertions). Closes the spec → plan → implement loop by making every artifact discoverable, version-aware, state-tracked, and validated.

---

## Trigger conditions (Layer 2 — loaded on reference)

<When does this spec get loaded? List the slash commands, hook events, or CLI invocations that would reference this spec.>

**Example:**
- Triggered by `/sdlc-design` when entering Design stage
- Triggered by `loshu-sdlc cycle new` to scaffold initial cycle state
- Referenced by all §-files in this directory (cross-links via `§N-name.md` syntax)

---

## Detailed design (Layer 3 — lazy load per §)

Each § is a separate file. The numbering is fixed (1-12) but not all §-files are required — pick what applies.

### Goals — [§1-goals.md](§1-goals.md)
<3-7 measurable goals. What does "done" look like?>

### Non-goals — [§2-non-goals.md](§2-non-goals.md)
<3-7 explicit "we will NOT do this." Critical for scope control.>

### Domain model — [§3-domain-model.md](§3-domain-model.md)
<Entities, fields, types, relationships. ASCII diagram OK.>

### State machine — [§4-state-machine.md](§4-state-machine.md)
<States, transitions, guards, trigger events. ASCII diagram or table.>

### Data flow — [§5-data-flow.md](§5-data-flow.md)
<Bootstrap, happy path, error path, edge cases. Sequence diagrams OK.>

### API surface — [§6-api-surface.md](§6-api-surface.md)
<Commands, parameters, outputs, error codes. Type signatures.>

### UX wireframes — [§7-ux-wireframes.md](§7-ux-wireframes.md)
<ASCII boxes + sample outputs. Each UI surface gets one wireframe + one sample artifact.>

### Acceptance criteria — [§8-acceptance.md](§8-acceptance.md)
<Checklist: how do we know this is done? Per-assertion pass/fail criteria.>

### Non-functional requirements — [§9-nfrs.md](§9-nfrs.md)
<Performance budgets, reliability targets, security constraints, scalability limits.>

### Architecture decisions — [§10-adr.md](§10-adr.md)
<One section per decision: context, options considered, choice, rationale, consequences.>

### Open questions — [§11-open-questions.md](§11-open-questions.md)
<Unresolved items that block implementation. Mark each as Blocking / Non-blocking.>

### References — [§12-references.md](§12-references.md)
<External docs, prior work, related specs.>

---

## Changelog (Layer 4 — bottom of file, always present)

| Date | Version | Changes |
|---|---|---|
| YYYY-MM-DD | v0.1.0 | Initial draft |

---

## Per-§-file template

Each §-file follows the same shape:

```markdown
# §N <Section Name>

<!-- 100-300 words. Specific to this section. -->
<!-- For §7-ux-wireframes, include ASCII boxes. -->
<!-- For §10-adr, one section per decision. -->

<content here>

## Cross-references

- See also: [§3-domain-model.md](§3-domain-model.md) for field definitions
- See also: [§8-acceptance.md](§8-acceptance.md) for related acceptance criteria
```

The "Cross-references" section at the end of each §-file is optional but recommended when §-files reference each other heavily.

---

## Authoring checklist

- [ ] Layer 1 (Description) ≤ 30 lines, one paragraph, no jargon
- [ ] Layer 2 (Trigger) lists every command/event that loads this spec
- [ ] §3 Domain model: every entity has a type, every field has a unit
- [ ] §4 State machine: every state has a defined exit, every transition has a guard
- [ ] §7 UX wireframes: at least one ASCII box per UI surface
- [ ] §8 Acceptance: every goal in §1 has ≥1 acceptance criterion here
- [ ] §10 ADR: every "we picked X over Y" decision is documented
- [ ] §11 Open questions: every blocking item has a target date or owner
- [ ] Every cross-§-reference uses relative link to a §-file, not the parent

## Anti-patterns

- **Don't** write a single 1500-line spec.md. Split into §-files.
- **Don't** put prototype / wireframe in §10 (ADR). Prototypes go in §7.
- **Don't** put acceptance criteria in §1 (Goals). Goals are high-level; criteria are detailed.
- **Don't** put domain model in §4 (State machine). They're different concerns; one might be in §3, the other in §4.
- **Don't** repeat content across §-files. Link instead.
