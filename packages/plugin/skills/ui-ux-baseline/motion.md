---
provenance:
  source: ui-ux-pro-max
  borrowed_at: 2026-09-11
---

# Motion presets

| Token | Duration | Easing |
|------|----------|--------|
| fast | 100ms | ease-out |
| base | 200ms | ease-in-out |
| slow | 400ms | ease-in-out |
| page | 300ms | ease-out |

## Usage

- Hover/focus: `fast`
- State changes (toggle, expand): `base`
- Page transitions: `page`
- Loading: `slow`

## Respect preferences

```css
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```
