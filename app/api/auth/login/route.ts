import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { queryOne } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const email = String(body.email ?? '').toLowerCase().trim()
  const password = String(body.password ?? '')

  if (!email || !password) {
    return NextResponse.json({ error: 'email and password are required.' }, { status: 400 })
  }

  try {
    const profile = await queryOne<{
      id: string
      email: string
      password_hash: string
      display_name: string
      avatar_emoji: string
      is_super_admin: boolean
    }>(
      'SELECT id, email, password_hash, display_name, avatar_emoji, is_super_admin FROM profiles WHERE email = $1',
      [email]
    )

    // Constant-time comparison even on miss (compare against a dummy hash)
    const hashToCheck = profile?.password_hash ?? '$2a$12$invalidhashpadding000000000000000000000000000000000000'
    const valid = await bcrypt.compare(password, hashToCheck)

    if (!profile || !valid) {
      return NextResponse.json({ error: 'Invalid email or password.' }, { status: 401 })
    }

    const session = await getSession()
    session.userId = profile.id
    session.email = profile.email
    session.displayName = profile.display_name
    session.avatarEmoji = profile.avatar_emoji
    session.isAdmin = profile.is_super_admin
    await session.save()

    return NextResponse.json({
      user: {
        id: profile.id,
        email: profile.email,
        displayName: profile.display_name,
        avatarEmoji: profile.avatar_emoji,
        isAdmin: profile.is_super_admin,
      },
    })
  } catch (err) {
    console.error('[auth/login]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
