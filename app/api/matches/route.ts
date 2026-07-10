import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAuth } from '@/lib/session'

/**
 * GET /api/matches
 * Returns all matches the authenticated user is part of (provider or receiver),
 * with the other party's profile embedded.
 */
export async function GET() {
  try {
    const user = await requireAuth()

    const rows = await query(
      `SELECT
         m.*,
         -- other party profile (opposite of current user)
         CASE WHEN m.provider_id = $1 THEN m.receiver_id ELSE m.provider_id END AS other_id,
         p.full_name    AS other_full_name,
         p.display_name AS other_display_name,
         p.avatar_emoji AS other_avatar_emoji,
         p.avatar_url   AS other_avatar_url,
         p.email        AS other_email,
         p.bio          AS other_bio,
         p.is_super_admin AS other_is_super_admin,
         p.created_at   AS other_created_at
       FROM matches m
       JOIN profiles p ON p.id = CASE WHEN m.provider_id = $1 THEN m.receiver_id ELSE m.provider_id END
       WHERE m.provider_id = $1 OR m.receiver_id = $1
       ORDER BY m.created_at DESC`,
      [user.userId]
    )

    const matches = rows.map((r: any) => ({
      id: r.id,
      post_id: r.post_id,
      table_id: r.table_id,
      provider_id: r.provider_id,
      receiver_id: r.receiver_id,
      credits: r.credits,
      status: r.status,
      provider_confirmed: r.provider_confirmed,
      receiver_confirmed: r.receiver_confirmed,
      created_at: r.created_at,
      settled_at: r.settled_at,
      other: {
        id: r.other_id,
        email: r.other_email,
        full_name: r.other_full_name,
        display_name: r.other_display_name,
        avatar_emoji: r.other_avatar_emoji,
        avatar_url: r.other_avatar_url,
        bio: r.other_bio,
        is_super_admin: r.other_is_super_admin,
        created_at: r.other_created_at,
      },
    }))

    return NextResponse.json(matches)
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[matches GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
