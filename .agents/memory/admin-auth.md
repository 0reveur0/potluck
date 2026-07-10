---
name: Admin auth pattern
description: First registered user auto-promoted to super-admin; session via iron-session; requireAdmin() throws Response for route handler catch blocks.
---

# Admin Auth Pattern

## First-user bootstrap
The first `POST /api/auth/register` call counts rows in `profiles` and sets `is_super_admin = true` if count is 0. Subsequent registrations are regular members.

Seeded admin: `admin@potluck.dev` / `potluck123` (dev only — change in prod).

## Session
`iron-session` v8 with Next.js 14 App Router. `cookies()` from `next/headers` is synchronous in Next.js 14. Pass it directly to `getIronSession()`.

`SESSION_SECRET` must be ≥32 chars. In dev, a placeholder is used with a console warning. In prod, startup throws if absent.

## Auth guards
`requireAuth()` and `requireAdmin()` throw a `Response` object (not `NextResponse`) — this is intentional so route handler `catch` blocks can do `if (err instanceof Response) return err`. Using `NextResponse` from `next/server` here causes instanceof checks to fail.

**How to apply:** Any new route that needs auth → wrap in try/catch and check `instanceof Response` before the generic 500 handler.
