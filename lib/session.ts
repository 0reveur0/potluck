import { getIronSession, type IronSession } from 'iron-session'
import { cookies } from 'next/headers'

// Validate the secret at module load time so misconfiguration fails fast
const secret = process.env.SESSION_SECRET
if (!secret || secret.length < 32) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SESSION_SECRET env var must be set and at least 32 characters in production.')
  }
  // In dev, warn but continue so the server starts without the secret configured
  console.warn('[session] SESSION_SECRET is missing or too short — sessions will not persist across restarts.')
}

export interface SessionData {
  userId?: string
  email?: string
  displayName?: string
  avatarEmoji?: string
  isAdmin?: boolean
}

export const SESSION_OPTIONS = {
  password: (secret ?? 'dev-only-insecure-placeholder-32char!!') as string,
  cookieName: 'potluck_sess',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
}

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = cookies()
  return getIronSession<SessionData>(cookieStore, SESSION_OPTIONS)
}

/** Returns the current user or throws a 401 NextResponse. */
export async function requireAuth(): Promise<Required<SessionData>> {
  const session = await getSession()
  if (!session.userId) {
    throw NextResponse401()
  }
  return session as Required<SessionData>
}

/** Returns the current user or throws a 403 NextResponse if not super-admin. */
export async function requireAdmin(): Promise<Required<SessionData>> {
  const user = await requireAuth()
  if (!user.isAdmin) {
    throw NextResponse403()
  }
  return user
}

// ── Response factories ────────────────────────────────────────────────────────
// Throwing a Response object from a Next.js route handler is idiomatic;
// the catch blocks in each route handler check `instanceof Response`.

function NextResponse401(): Response {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  })
}

function NextResponse403(): Response {
  return new Response(JSON.stringify({ error: 'Forbidden' }), {
    status: 403,
    headers: { 'Content-Type': 'application/json' },
  })
}
