---
name: Stack migration
description: Vite+React+Supabase → Next.js 14 App Router + Replit PostgreSQL + iron-session; key decisions and gotchas.
---

# Stack Migration: Vite → Next.js 14

**Why:** Project spec requires self-hosted Next.js App Router with internal API routes and Replit's built-in PostgreSQL. Supabase removed.

## Key decisions
- `next.config.mjs` (not `.ts` or `.js`) because `package.json` has `"type": "module"` — `.js` would be ESM but Next.js 14 requires CJS for config; `.mjs` is the clean escape hatch.
- Tailwind opacity modifiers like `border-white/8` cannot be used inside `@apply` in Tailwind v3 if the value isn't a standard step. Use raw CSS (`rgba()`) for custom opacity values in `@layer components`.
- Clear `.next/` cache after a Vite→Next.js migration or stale webpack chunk errors appear (`Cannot find module './276.js'`).

**How to apply:** Any Next.js config file naming issue → try `.mjs`. Any `@apply` opacity error → write raw CSS instead.
