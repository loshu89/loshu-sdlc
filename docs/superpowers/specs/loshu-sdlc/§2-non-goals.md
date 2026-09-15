# §2 Non-goals

<!-- 100-300 words. Specific to this section. -->

Five explicit "we will NOT do this" boundaries. Critical for scope control — these are the things loshu-sdlc will reject as out-of-scope, defer to external skills, or refuse to build.

## Non-goals

1. **Replacing the human.** Every gate the playbook marks as human-owned stays human-owned.
2. **Stack opinionation.** The plugin works in any repo; we don't ship "best practices for React" or "best practices for Django" — those are external skills.
3. **Build-system integration.** We don't generate webpack configs, vite configs, or migration runners. We hand off to existing tooling.
4. **Real-time collaboration.** This is a single-developer (or small-team) tool; no multi-user editing of `intent.md`.
5. **Hosted service.** All artifacts live in the user's repo. We never store project data.

## Cross-references

- See also: [§1-goals.md](§1-goals.md) for the positive scope that these non-goals carve out
- See also: [§3-domain-model.md](§3-domain-model.md) for the owns-vs-borrows boundary that enforces these non-goals
