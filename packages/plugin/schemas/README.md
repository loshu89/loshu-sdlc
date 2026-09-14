# loshu-sdlc Schemas

JSON Schema (Draft 2020-12) definitions for SDLC artifacts.

| Schema | Purpose | Invoked by |
|---|---|---|
| `intent.schema.json` | Validates `intent.md` | Plan-exit hook, `loshu-sdlc validate intent` |
| `spec.schema.json` | Validates `spec.md` | Design-exit hook, `loshu-sdlc validate spec` |
| `plan.schema.json` | Validates `plan.md` | Build-exit hook, `loshu-sdlc validate plan` |
| `claude-md.schema.json` | Validates `CLAUDE.md` (esp. verification block) | Build-exit hook |
| `review.schema.json` | Validates `REVIEW.md` | Deploy-exit hook |
| `bands.schema.json` | Validates `bands.yaml` | Maintain-exit hook |
| `policy.schema.json` | Validates `policy-default/*.md` frontmatter | `loshu-sdlc lint` |

All schemas use `https://json-schema.org/draft/2020-12/schema`.