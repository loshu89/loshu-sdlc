# Task 7: Fix v0.9.0 spec drift on `sigmaMagnitude` (C2)

**Goal:** Update `docs/superpowers/specs/2026-09-20-v0.9.0-design.md` §Components.3 example to match the brief's formula. The spec example shows absolute-sigma units (`sigmaMagnitude: 4.5`); the implementation uses normalized magnitude `((current - baseline) / (sigma_3 - baseline) = 1.75`). One-line clarification.

**Spec:** Inventory C2 (`docs/internal/parked-minors-v0.6.4-to-v0.9.0.md`).

**Files:**
- Modify: `docs/superpowers/specs/2026-09-20-v0.9.0-design.md`

---

- [ ] **Step 1: Read §Components.3 example**

Read `docs/superpowers/specs/2026-09-20-v0.9.0-design.md` — find the `BandBreach` interface or the example JSON in §Components.3.

- [ ] **Step 2: Update the spec to match the implementation**

Change (approximately):
```ts
// Current spec example (absolute-sigma units, ambiguous):
"sigmaMagnitude": 4.5

// Updated spec (normalized magnitude, matches implementation):
"sigmaMagnitude": 1.75  // (0.045 - 0.01) / (0.03 - 0.01)
```

Add a clarifying note:
> Note: `sigmaMagnitude` is the **normalized** magnitude relative to `sigma_3`, computed as `(current - baseline) / (sigma_3 - baseline)`. Values ≥ 1.0 indicate a 3σ breach.

- [ ] **Step 3: Commit**

```bash
git add docs/superpowers/specs/2026-09-20-v0.9.0-design.md
git commit -m "docs(spec): clarify v0.9.0 sigmaMagnitude formula (C2)

Spec example showed 'sigmaMagnitude: 4.5' (absolute-sigma units)
but the implementation uses normalized magnitude
((current - baseline) / (sigma_3 - baseline) = 1.75 for
current=0.045, baseline=0.01, sigma_3=0.03). Updated the spec to
match the implementation and added a clarifying note.

Doc-only; no behavior change.

Inventory ref: docs/internal/parked-minors-v0.6.4-to-v0.9.0.md
section C.2."
```
