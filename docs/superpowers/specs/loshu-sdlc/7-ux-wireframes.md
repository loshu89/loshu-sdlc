# §7 UX Wireframes

<!-- ASCII boxes + sample outputs for each UI surface. loshu-sdlc is a CLI; "UI" surfaces are terminal output and the scaffolded README. -->

loshu-sdlc is a CLI plugin, so UX surfaces are: terminal output of each command, the prompt flow during scaffolding, and the README layout users see in the scaffolded project. Every surface gets one wireframe + one sample artifact.

## Wireframe 1: Scaffolder prompt flow (`npx create-loshu-sdlc-app my-app`)

```
┌────────────────────────────────────────────────────────────┐
│  npx create-loshu-sdlc-app my-app                           │
├────────────────────────────────────────────────────────────┤
│  ? Project name:    my-app                                  │
│  ? Template:        minimal ▾   (minimal | full)            │
│  ? Tier-1 deps:     install superpowers:* (Y/n) Y           │
│  ? Tier-2 deps:     install ui-ux-pro-max + ecc:* (Y/n) y   │
│  ? Coverage line:   80                                      │
│  ? Coverage branch: 75                                      │
│  ? Init git:        (Y/n) Y                                 │
│  ? Strict mode:     (Y/n) n                                 │
└────────────────────────────────────────────────────────────┘
        │
        ▼
┌────────────────────────────────────────────────────────────┐
│  ✔ Scaffolded my-app/                                       │
│    ├─ intent.md   (template, not seeded in --existing)      │
│    ├─ .loshu-sdlc/config.yaml                               │
│    ├─ SKILL.md (project-level, from policy-template/)       │
│    └─ CLAUDE.md (project-level, from policy-default/)       │
│  Next:  cd my-app && claude  →  /sdlc-plan                  │
└────────────────────────────────────────────────────────────┘
```

## Wireframe 2: `loshu-sdlc status`

```
┌────────────────────────────────────────────────────────────┐
│  loshu-sdlc status --json                                   │
├────────────────────────────────────────────────────────────┤
│  Cycle:    3                                                │
│  Stage:    Build                                            │
│  Artifact: plan.md                                          │
│  Status:   in-progress                                      │
│  Updated:  2026-09-15T10:22:01Z                             │
│  Next gate: /sdlc-test (waits on green build + coverage ≥80)│
└────────────────────────────────────────────────────────────┘
```

## Wireframe 3: `loshu-sdlc doctor`

```
┌────────────────────────────────────────────────────────────┐
│  loshu-sdlc doctor .                                        │
├────────────────────────────────────────────────────────────┤
│  ✔ .loshu-sdlc/config.yaml present                          │
│  ✔ intent.md validates against intent.schema.json          │
│  ✔ spec.md validates against spec.schema.json              │
│  ✔ Tier-1 deps present: superpowers:{brainstorming, …}      │
│  ⚠ Tier-2 dep missing: ui-ux-pro-max (run --fix to install)│
│  ✔ Hooks registered: 5 (PreToolUse, PostToolUse, …)         │
│  ⚠ Coverage line: 76.4 (target 80)                          │
└────────────────────────────────────────────────────────────┘
```

## Wireframe 4: Scaffolded README structure (post-bootstrap)

```
my-app/
├── README.md                ← top-level project README
├── CLAUDE.md                ← project policy (loshu-sdlc owns scaffold)
├── SKILL.md                 ← project skill (user-editable)
├── intent.md                ← current cycle intent
├── spec.md                  ← current cycle spec
├── plan.md                  ← current cycle plan
├── REVIEW.md                ← most recent deploy review
├── bands.yaml               ← statistical band configuration
└── .loshu-sdlc/
    ├── config.yaml          ← CLI config (see §6)
    └── logs/                ← loshu-sdlc logs (local-only)
```

## Wireframe 5: Maintain hook block (3σ incident)

```
┌────────────────────────────────────────────────────────────┐
│  loshu-sdlc/maintain (PreToolUse)                           │
├────────────────────────────────────────────────────────────┤
│  ✖ BLOCKED: 3σ incident detected                            │
│    metric:  p95 latency                                     │
│    current: 1840ms                                          │
│    3σ band: 1200ms                                          │
│                                                            │
│  Required next action:                                      │
│    1. /sdlc-maintain                                        │
│    2. superpowers:systematic-debugging                      │
│    3. Produce new intent.md (incident-driven)               │
│    4. PO signoff → cycle restarts at Plan                   │
│                                                            │
│  exit 2  (stderr fed back to model)                         │
└────────────────────────────────────────────────────────────┘
```

## Cross-references

- See also: [5-data-flow.md](5-data-flow.md) for the bootstrap and maintain flows these wireframes illustrate
- See also: [6-api-surface.md](6-api-surface.md) for the full flag/option list referenced in the prompts
- See also: [3-domain-model.md](3-domain-model.md) for the scaffolded file layout (Wireframe 4)
