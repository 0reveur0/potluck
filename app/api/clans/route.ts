import { NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { requireAuth } from '@/lib/session'

/**
 * GET /api/clans
 * Returns all Potluck Tables the authenticated user has joined,
 * including their isolated credit balance for each table.
 */
export async function GET() {
  try {
    const user = await requireAuth()

    const rows = await query<{
      id: number; name: string; join_code: string; emoji: string
      description: string | null; created_at: string
      member_id: number; role: string; credits: number; joined_at: string
    }>(
      `SELECT
         t.id, t.name, t.join_code, t.emoji, t.description, t.created_at,
         tm.id   AS member_id,
         tm.role, tm.credits, tm.joined_at
       FROM table_members tm
       JOIN tables t ON t.id = tm.table_id
       WHERE tm.user_id = $1
       ORDER BY tm.joined_at DESC`,
      [user.userId]
    )

    const tables = rows.map((r) => ({
      id: r.id, name: r.name, join_code: r.join_code, emoji: r.emoji,
      description: r.description, created_at: r.created_at,
      member: { id: r.member_id, user_id: user.userId, table_id: r.id, role: r.role, credits: r.credits, joined_at: r.joined_at },
    }))

    return NextResponse.json(tables)
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[clans GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
