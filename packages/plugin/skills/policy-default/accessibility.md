---
provenance:
  source: ui-ux-pro-max
  upstream: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
  borrowed_at: 2026-09-11
  verified: 2026-09-15
  license: MIT (Copyright (c) 2024 Next Level Builder)
  full_catalog: install ui-ux-pro-max for the complete set of 119 UX guidelines
---

# Default accessibility rules (WCAG 2.2 AA)

## Color and contrast

- Text on background: ≥4.5:1 (normal), ≥3:1 (large 18px+ or 14px bold)
- Non-text UI: ≥3:1
- Don't rely on color alone for state

## Keyboard

- All functionality available via keyboard
- Visible focus indicator (≥2px outline, ≥3:1 contrast)
- Skip-to-main-content link
- No keyboard traps

## Screen reader

- All images have `alt` text (or `alt=""` if decorative)
- Form fields have associated `<label>` or `aria-label`
- Live regions for dynamic content (`aria-live="polite"`)
- Headings hierarchical (h1 → h2 → h3)

## Motion

- Respect `prefers-reduced-motion`
- No flashing content >3 Hz

## Touch targets

- Minimum 44x44 CSS pixels

## Forms

- Error messages associated with fields (`aria-describedby`)
- Don't disable submit on validation; show errors
