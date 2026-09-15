# §11 Open Questions

<!-- Unresolved items that block or shape implementation. Each marked Blocking / Non-blocking. -->

Seven questions still open as of v0.1.0. None block v0.1–v0.5; license question becomes blocking before v1.0.0.

## Open questions

1. **License** — MIT vs Apache 2.0 vs custom? Compatibility with superpowers, ECC, ui-ux-pro-max licenses TBD.
   - **Status:** Blocking before v1.0.0 (need clarity before publishing to npm + marketplace).
2. **Plugin marketplace identity** — `loshu-sdlc` or `loshu-sdlc-plugin`? Avoid collision with existing plugins.
   - **Status:** Non-blocking (can be decided before marketplace submission).
3. **First-party hosting** — npm under `loshu-sdlc` org or personal?
   - **Status:** Non-blocking (organizational decision).
4. **Backing org** — personal repo or loshu-sdlc GitHub org?
   - **Status:** Non-blocking.
5. **Brand assets** — logo, color palette (could leverage ui-ux-pro-max's 192 palettes).
   - **Status:** Non-blocking.
6. **Eval similarity threshold** — 0.85 is a guess; calibrate against real stories once we have them.
   - **Status:** Non-blocking (data-driven, will refine over v0.x).
7. **Hook policy overrides** — should users be able to relax Tier-2 BLOCK to WARN via config? (Currently: yes, via `hooks.block_on_critical: false`.)
   - **Status:** Non-blocking (already partly answered; question is whether to document the override path explicitly).

## Cross-references

- See also: [§10-adr.md](§10-adr.md) — locked decisions that may be amended once these resolve
- See also: [§9-nfrs.md](§9-nfrs.md) — license and security SLA decisions live here once resolved
- See also: [§1-goals.md](§1-goals.md) — "auditable" goal is most affected by license + provenance decisions
