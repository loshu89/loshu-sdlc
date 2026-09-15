# §4 State Machine / Compliance Contract

<!-- SDLC compliance contract. Not a literal state machine; the five rules that govern how external capabilities interact with the artifact chain. -->

This file is titled "state machine" per the template, but the loshu-sdlc artifact chain behaves less like a formal state machine and more like a **compliance contract**: five rules that any external capability must satisfy when it touches an SDLC artifact.

## The five compliance rules

1. **Landing zone.** Every borrowed capability's output lands in a defined SDLC artifact (`intent.md`, `spec.md`, `plan.md`, `CLAUDE.md`, `SKILL.md`, `REVIEW.md`, `bands.yaml`, or generated config).
2. **Schema enforcement.** Every artifact validates against a JSON schema in `packages/plugin/schemas/`.
3. **Hook enforcement.** External plugin output cannot bypass tiered hooks. Untrusted until it passes the same gates as human-authored output.
4. **Loop closure.** Every Maintain-stage output that identifies a problem MUST end with a new `intent.md` if a code change is required.
5. **Provenance.** Every borrowed file carries a frontmatter header citing source, license, and "full catalog available in <source>".

## Cycle lifecycle (implicit state)

The artifact chain defines an implicit six-stage cycle:

```
Plan → Design → Build → Test → Deploy → Maintain
                                      ↓
                                  (3σ incident)
                                      ↓
                                    Plan (new intent.md)
```

Each stage has an entry gate (the previous artifact validated) and an exit gate (the current artifact validated). Stage gates are enforced by hooks (see [§5-data-flow.md](§5-data-flow.md) § 9 for hook exit semantics).

## Cross-references

- See also: [§3-domain-model.md](§3-domain-model.md) for the schemas directory referenced in rule 2
- See also: [§5-data-flow.md](§5-data-flow.md) for the happy-path sequence and loop closure flow
- See also: [§10-adr.md](§10-adr.md) for the locked decision on tiered hook policy
