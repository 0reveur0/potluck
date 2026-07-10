import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne, transaction } from '@/lib/db'
import { requireAuth } from '@/lib/session'

/**
 * POST /api/clans/join
 * Body: { join_code: string }
 *
 * Validates the join_code, adds the user to table_members with 50 starter
 * credits, and returns the joined table + member row.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const code = String(body.join_code ?? '').trim().toUpperCase()
    if (!code) return NextResponse.json({ error: 'join_code is required.' }, { status: 400 })

    const result = await transaction(async (client) => {
      // Resolve table
      const table = await client.query(
        'SELECT * FROM tables WHERE join_code = $1',
        [code]
      )
      if (table.rows.length === 0) throw Object.assign(new Error('Invalid join code.'), { status: 404 })

      const t = table.rows[0]

      // Already a member?
      const existing = await client.query(
        'SELECT id FROM table_members WHERE user_id = $1 AND table_id = $2',
        [user.userId, t.id]
      )
      if (existing.rows.length > 0) throw Object.assign(new Error('You are already a member of this table.'), { status: 409 })

      // Insert member row with 50 starter credits
      const member = await client.query(
        `INSERT INTO table_members (user_id, table_id, role, credits)
         VALUES ($1, $2, 'member', 50)
         RETURNING *`,
        [user.userId, t.id]
      )

      return { table: t, member: member.rows[0] }
    })

    return NextResponse.json({
      ...result.table,
      member: result.member,
    }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Response) return err
    const e = err as { message?: string; status?: number }
    if (e.status) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[clans/join POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
