---
provenance:
  source: ui-ux-pro-max
  license: MIT (assumed)
  borrowed_at: 2026-09-11
---

# Stack-specific UI patterns

## React + Vite

- File-based routing via `react-router` or `TanStack Router`
- State: server-state via TanStack Query; client-state via Zustand or React Context
- Forms: `react-hook-form` + `zod`
- Styling: Tailwind CSS or CSS Modules
- Components: shadcn/ui or Radix UI primitives

## Vue + Vite

- File-based routing via `vue-router`
- State: Pinia
- Forms: `vee-validate` + `zod`
- Styling: Tailwind CSS or `<style scoped>`
- Components: Headless UI or Radix Vue

## Svelte + SvelteKit

- File-based routing via SvelteKit
- State: Svelte stores
- Forms: Superforms
- Styling: Tailwind CSS or `<style>` blocks
- Components: shadcn-svelte or melt-ui

## Server-rendered (Rails, Django, Phoenix, etc.)

- Server-rendered with progressive enhancement
- Hotwire (Rails), HTMX (Django/Phoenix), LiveView (Phoenix) for interactivity
- Tailwind CSS or component library

For deeper stack-specific patterns, invoke `ecc:frontend-patterns` (Tier-3) at Build stage.
