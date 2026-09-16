---
id: <%= planId %>
schema_version: 0.5.0
cycle_id: 1
stage: build
state: draft
created_by: <%= createdBy %>
created_at: <%= today %>
title: <%= projectName %>
spec: spec.md
tasks:
  - id: task-1
    title: "[First task]"
verification:
  build: "[build command]"
  test: "[test command]"
  lint: "[lint command]"
  typecheck: "[typecheck command]"
---

# Plan: <First feature>

## Tasks

- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Verification

- Build: `pnpm build` exits 0
- Test: `pnpm test` exits 0
- Lint: `pnpm lint` exits 0
- Type-check: `pnpm typecheck` exits 0
