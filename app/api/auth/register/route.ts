import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { query, queryOne } from '@/lib/db'
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
  const displayName = String(body.displayName ?? '').trim()
  const avatarEmoji = String(body.avatarEmoji ?? '🧑‍🍳')

  if (!email || !password || !displayName) {
    return NextResponse.json(
      { error: 'email, password, and displayName are required.' },
      { status: 400 }
    )
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: 'Password must be at least 6 characters.' },
      { status: 400 }
    )
  }

  try {
    const existing = await queryOne<{ id: string }>(
      'SELECT id FROM profiles WHERE email = $1',
      [email]
    )
    if (existing) {
      return NextResponse.json(
        { error: 'An account with this email already exists.' },
        { status: 409 }
      )
    }

    const hash = await bcrypt.hash(password, 12)

    // First registered user becomes super-admin automatically
    const countRow = await queryOne<{ c: string }>('SELECT COUNT(*) AS c FROM profiles', [])
    const isFirst = parseInt(countRow?.c ?? '0', 10) === 0

    const rows = await query<{
      id: string
      email: string
      display_name: string
      avatar_emoji: string
      is_super_admin: boolean
    }>(
      `INSERT INTO profiles (email, password_hash, full_name, display_name, avatar_emoji, is_super_admin)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, display_name, avatar_emoji, is_super_admin`,
      [email, hash, displayName, displayName, avatarEmoji, isFirst]
    )
    const profile = rows[0]

    const session = await getSession()
    session.userId = profile.id
    session.email = profile.email
    session.displayName = profile.display_name
    session.avatarEmoji = profile.avatar_emoji
    session.isAdmin = profile.is_super_admin
    await session.save()

    return NextResponse.json(
      {
        user: {
          id: profile.id,
          email: profile.email,
          displayName: profile.display_name,
          avatarEmoji: profile.avatar_emoji,
          isAdmin: profile.is_super_admin,
        },
      },
      { status: 201 }
    )
  } catch (err) {
    console.error('[auth/register]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
