---
provenance:
  source: ui-ux-pro-max
  upstream: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill
  license: MIT (Copyright (c) 2024 Next Level Builder)
  borrowed_at: 2026-09-11
  verified: 2026-09-15
---

# Chart type recommendations

| Data shape | Recommended chart |
|------------|-------------------|
| Time series (one metric) | Line |
| Time series (multiple metrics) | Multi-line |
| Categorical comparison | Bar |
| Categorical part-of-whole | Stacked bar |
| Distribution | Histogram |
| Correlation | Scatter |
| Part-of-whole (small number of categories) | Pie / Donut |
| Hierarchical | Treemap |
| Geographic | Choropleth |
| Flow | Sankey |

## Anti-patterns

- Pie charts with >5 slices (use bar)
- 3D charts (distort perception)
- Dual y-axes (misleading)
- Truncated y-axis on bar charts (without explicit annotation)
