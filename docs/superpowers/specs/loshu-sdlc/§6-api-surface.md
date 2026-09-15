# §6 API Surface

<!-- CLI reference: commands, flags, config schema, telemetry. -->

The full CLI surface of loshu-sdlc. Two binaries: the scaffolder (`create-loshu-sdlc-app`) and the maintenance CLI (`loshu-sdlc`). Plus the project-local `.loshu-sdlc/config.yaml` schema.

## `create-loshu-sdlc-app`

Flags: `--with-ux`, `--with-ecc`, `--with-all`, `--existing`, `--template <name>`, `--coverage <pct>`, `--branch <pct>`, `--no-git`, `--yes`, `--strict`, `--json`, `--verbose`, `--quiet`, `--help`, `--version`.

## `loshu-sdlc` subcommands

```
doctor [path] [--fix] [--json]
validate <artifact> [path] [--strict]
lint [path] [--fix]
rules list
rules check <name> [path]
upgrade [path] [--to <version>] [--dry-run]
logs [--tail] [--cycle <n>] [--stage <name>] [--json]
status [path] [--json]
coverage [path] [--diff <sha>]
help [command]
version
```

## `.loshu-sdlc/config.yaml`

```yaml
version: 1
coverage: { line: 80, branch: 75, fail_on_drop: false }
hooks: { policy: tiered, block_on_critical: true, warn_on_soft: true }
deps:
  tier1_required: [...]
  tier2_recommended: [...]
  auto_install_offered: true
eval: { mode: loose, similarity_threshold: 0.85 }
logging: { level: info, json: false, redact_secrets: true }
loop: { auto_intent_on_incident: true, require_po_signoff: true }
```

## Telemetry

**No telemetry by default.** Zero network calls except explicit `plugin install` and `upgrade`. Logs local-only. Optional opt-in: `loshu-sdlc telemetry enable` sends anonymized install counts only.

## Cross-references

- See also: [§5-data-flow.md](§5-data-flow.md) § 9 for CLI exit codes and error recovery semantics
- See also: [§3-domain-model.md](§3-domain-model.md) for the `packages/cli/src/` source layout that implements these subcommands
- See also: [§7-ux-wireframes.md](§7-ux-wireframes.md) for sample outputs of `doctor`, `status`, `coverage`
