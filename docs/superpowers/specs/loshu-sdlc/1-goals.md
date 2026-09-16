# §1 Goals

<!-- 100-300 words. Specific to this section. -->

The six measurable success criteria for loshu-sdlc. Every goal must be verifiable through a combination of acceptance criteria ([8-acceptance.md](8-acceptance.md)) and NFRs ([9-nfrs.md](9-nfrs.md)).

## Goals

1. **Universal applicability.** Works in any codebase, any language, any stack.
2. **Full lifecycle coverage.** All six SDLC stages shippable end-to-end: Plan → Design → Build → Test → Deploy → Maintain.
3. **Closed feedback loop.** Production incidents automatically become new `intent.md` documents, restarting the cycle.
4. **Composable, not duplicative.** Borrows from `superpowers:*`, `ui-ux-pro-max`, and `ecc:*`; ships only what's SDLC-specific.
5. **Auditable.** Every artifact is git-tracked; every gate has a defined enforcer; every borrowed capability has provenance.
6. **Bootstrappable.** One command (`npx create-loshu-sdlc-app`) scaffolds a working project; another (`loshu-sdlc init --existing`) installs into an existing repo.

## Cross-references

- See also: [2-non-goals.md](2-non-goals.md) for explicit "we will NOT do this" boundaries
- See also: [8-acceptance.md](8-acceptance.md) for how each goal is verified
- See also: [3-domain-model.md](3-domain-model.md) for the architecture that satisfies these goals
