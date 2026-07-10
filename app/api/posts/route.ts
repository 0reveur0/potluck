import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAuth } from '@/lib/session'

/**
 * GET /api/posts?table_id=<number>
 * Returns all study posts for a specific clan (server-side filtered),
 * with the author profile joined on each row.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth()
    const { searchParams } = new URL(req.url)
    const tableIdParam = searchParams.get('table_id')
    if (!tableIdParam) return NextResponse.json({ error: 'table_id is required.' }, { status: 400 })

    const tableId = parseInt(tableIdParam, 10)
    if (Number.isNaN(tableId)) return NextResponse.json({ error: 'table_id must be an integer.' }, { status: 400 })

    // Verify caller is a member of this table
    const membership = await query(
      'SELECT id FROM table_members WHERE user_id = $1 AND table_id = $2',
      [user.userId, tableId]
    )
    if (membership.length === 0) {
      return NextResponse.json({ error: 'You are not a member of this table.' }, { status: 403 })
    }

    const posts = await query(
      `SELECT
         sp.id, sp.user_id, sp.table_id, sp.type, sp.title, sp.description,
         sp.subject, sp.credit_price, sp.status, sp.created_at,
         p.id           AS author_id,
         p.full_name    AS author_full_name,
         p.display_name AS author_display_name,
         p.avatar_emoji AS author_avatar_emoji,
         p.avatar_url   AS author_avatar_url,
         p.bio          AS author_bio,
         p.is_super_admin AS author_is_super_admin,
         p.created_at   AS author_created_at,
         p.email        AS author_email
       FROM study_posts sp
       JOIN profiles p ON p.id = sp.user_id
       WHERE sp.table_id = $1
         AND sp.status NOT IN ('cancelled')
       ORDER BY sp.created_at DESC`,
      [tableId]
    )

    const shaped = posts.map((row: any) => ({
      id: row.id,
      user_id: row.user_id,
      table_id: row.table_id,
      type: row.type,
      title: row.title,
      description: row.description,
      subject: row.subject,
      credit_price: row.credit_price,
      status: row.status,
      created_at: row.created_at,
      author: {
        id: row.author_id,
        email: row.author_email,
        full_name: row.author_full_name,
        display_name: row.author_display_name,
        avatar_emoji: row.author_avatar_emoji,
        avatar_url: row.author_avatar_url,
        bio: row.author_bio,
        is_super_admin: row.author_is_super_admin,
        created_at: row.author_created_at,
      },
    }))

    return NextResponse.json(shaped)
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[posts GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
