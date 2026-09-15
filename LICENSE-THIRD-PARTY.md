# Third-Party Licenses

loshu-sdlc includes content borrowed from the following third-party projects. All borrowed content is used under their respective licenses.

Both upstream sources are **MIT-licensed** and compatible with loshu-sdlc's MIT license. Subset use (curated excerpts) qualifies as a derivative work under MIT's permissive terms; attribution is preserved in each file's `provenance:` frontmatter and in `packages/plugin/skills/policy-default/ATTRIBUTION.md`.

---

## ui-ux-pro-max

**Source:** https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
**License:** MIT
**Copyright:** (c) 2024 Next Level Builder
**Verified:** 2026-09-15 (LICENSE file fetched from `raw.githubusercontent.com/nextlevelbuilder/ui-ux-pro-max-skill/main/LICENSE`)
**Original reference (incorrect):** the older `LICENSE-THIRD-PARTY.md` cited `https://github.com/superpowers/ui-ux-pro-max`, which does **not** exist (HTTP 404). The actual upstream repo for the "ui-ux-pro-max" design-intelligence skill/plugin is `nextlevelbuilder/ui-ux-pro-max-skill`.

**Used in:**
- `packages/plugin/skills/policy-default/palette.md` (color palettes)
- `packages/plugin/skills/policy-default/typography.md` (font pairings)
- `packages/plugin/skills/policy-default/accessibility.md` (WCAG guidelines subset)
- `packages/plugin/skills/policy-default/breakpoints.md` (responsive breakpoints)
- `packages/plugin/skills/ui-ux-baseline/SKILL.md`
- `packages/plugin/skills/ui-ux-baseline/charts.md`
- `packages/plugin/skills/ui-ux-baseline/motion.md`
- `packages/plugin/skills/ui-ux-baseline/icons.md`
- `packages/plugin/skills/ui-ux-baseline/stacks.md`

These files carry a `provenance:` frontmatter header citing `ui-ux-pro-max` as the source.

---

## ecc (Everything Claude Code)

**Source:** https://github.com/affaan-m/everything-claude-code
**License:** MIT
**Copyright:** (c) 2026 Affaan Mustafa
**Verified:** 2026-09-15 (LICENSE file fetched from `raw.githubusercontent.com/affaan-m/everything-claude-code/main/LICENSE`)
**Used in:**
- `packages/plugin/skills/policy-default/coding-standards.md` (sub-skill: `ecc:coding-standards`)
- `packages/plugin/skills/policy-default/security-baseline.md` (sub-skill: `ecc:security-reviewer`)

These files carry a `provenance:` frontmatter header citing `ecc` (and the specific sub-skill) as the source.

---

## Full catalogs

The borrowed content in loshu-sdlc is a **small curated subset** of the upstream projects. For the complete catalog, install the corresponding plugin:

```bash
# Full ui-ux-pro-max
claude plugin install ui-ux-pro-max@ui-ux-pro-max-skill

# Full ecc
claude plugin install ecc@ecc
```

---

## License verification

Verified 2026-09-15:

- [x] Verify ui-ux-pro-max license — **MIT, (c) 2024 Next Level Builder** (upstream `nextlevelbuilder/ui-ux-pro-max-skill`)
- [x] Verify ecc license — **MIT, (c) 2026 Affaan Mustafa** (upstream `affaan-m/everything-claude-code`)
- [x] Confirm both upstream licenses are MIT, compatible with loshu-sdlc's MIT license
- [x] Audit all `provenance:` frontmatter matches upstream content — see `packages/plugin/skills/policy-default/ATTRIBUTION.md`
- [x] Confirm subset use qualifies under upstream MIT terms (MIT permits derivative works with attribution)

If any license is incompatible with MIT (loshu-sdlc's license), the borrowed content must be replaced or the file marked for removal. **No replacements or removals required** — both upstreams are MIT.
