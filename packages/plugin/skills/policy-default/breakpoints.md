---
provenance:
  source: ui-ux-pro-max
  upstream: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
  borrowed_at: 2026-09-11
  verified: 2026-09-15
  license: MIT (Copyright (c) 2024 Next Level Builder)
  full_catalog: install ui-ux-pro-max for the complete breakpoint reference
---

# Default breakpoints (mobile-first)

| Name | Min width | Typical devices |
|------|-----------|-----------------|
| sm | 640px | Phones (landscape) |
| md | 768px | Tablets |
| lg | 1024px | Laptops |
| xl | 1280px | Desktops |
| 2xl | 1536px | Large screens |

## Usage

```css
/* Mobile-first base */
.container { padding: 1rem; }

/* sm and up */
@media (min-width: 640px) { .container { padding: 1.5rem; } }

/* md and up */
@media (min-width: 768px) { .container { padding: 2rem; } }
```

## Anti-patterns

- Don't design for one breakpoint; test all five
- Don't hide critical functionality below md
- Don't require horizontal scrolling at any width
