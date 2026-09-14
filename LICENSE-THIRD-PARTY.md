# Third-Party Licenses

loshu-sdlc includes content borrowed from the following third-party projects. All borrowed content is used under their respective licenses.

---

## ui-ux-pro-max

**Source:** https://github.com/superpowers/ui-ux-pro-max (or equivalent)
**License:** MIT (assumed — verify before release)
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

These files carry a `provenance:` frontmatter header citing ui-ux-pro-max as the source.

---

## ecc (Everything Claude Code)

**Source:** https://github.com/affaan-m/everything-claude-code
**License:** MIT (assumed — verify before release)
**Used in:**
- `packages/plugin/skills/policy-default/coding-standards.md`
- `packages/plugin/skills/policy-default/security-baseline.md`

These files carry a `provenance:` frontmatter header citing ecc as the source.

---

## Full catalogs

The borrowed content in loshu-sdlc is a **small curated subset** of the upstream projects. For the complete catalog, install the corresponding plugin:

```bash
# Full ui-ux-pro-max
claude plugin install ui-ux-pro-max@<marketplace>

# Full ecc
claude plugin install ecc@ecc
```

---

## License verification

Before v1.0 release:
- [ ] Verify ui-ux-pro-max license (MIT, Apache 2.0, etc.)
- [ ] Verify ecc license
- [ ] Audit all `provenance:` frontmatter matches upstream content
- [ ] Confirm subset use qualifies under upstream license terms (typically MIT permits derivative works with attribution)

If any license is incompatible with MIT (loshu-sdlc's license), the borrowed content must be replaced or the file marked for removal.
