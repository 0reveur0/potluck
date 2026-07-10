import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAdmin } from '@/lib/session'

// ── helpers ──────────────────────────────────────────────────────────────────

function generateCode(length = 6): string {
  // Omit visually ambiguous chars (I, O, 0, 1)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

/** Generates a join_code, inserts the row, and retries on unique-key collisions. */
async function insertTableWithUniqueCode(
  name: string,
  emoji: string,
  description: string | null,
  createdBy: string,
  maxAttempts = 10
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const joinCode = generateCode()
    try {
      const rows = await query<{
        id: number
        name: string
        join_code: string
        emoji: string
        description: string | null
        created_by: string | null
        created_at: string
      }>(
        `INSERT INTO tables (name, join_code, emoji, description, created_by)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [name, joinCode, emoji, description, createdBy]
      )
      return rows[0]
    } catch (err: unknown) {
      // PostgreSQL unique-violation error code = 23505
      const pgErr = err as { code?: string }
      if (pgErr?.code === '23505' && attempt < maxAttempts) continue
      throw err // propagate non-collision errors or final attempt
    }
  }
  throw new Error('Could not generate a unique join_code after max attempts.')
}

// ── POST /api/admin/tables ────────────────────────────────────────────────────
// Body: { name: string, emoji?: string, description?: string }
// Returns 201 + created table object

export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin()

    let body: Record<string, unknown>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const name = String(body.name ?? '').trim()
    const emoji = String(body.emoji ?? '🍲').trim() || '🍲'
    const description = String(body.description ?? '').trim() || null

    if (!name) {
      return NextResponse.json({ error: 'Table name is required.' }, { status: 400 })
    }
    if (name.length > 80) {
      return NextResponse.json({ error: 'Name must be 80 characters or fewer.' }, { status: 400 })
    }

    const created = await insertTableWithUniqueCode(name, emoji, description, admin.userId)
    return NextResponse.json(created, { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[admin/tables POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}

// ── GET /api/admin/tables ─────────────────────────────────────────────────────
// Returns all tables with active member count

export async function GET() {
  try {
    await requireAdmin()

    const tables = await query<{
      id: number
      name: string
      join_code: string
      emoji: string
      description: string | null
      created_at: string
      member_count: number
    }>(
      `SELECT
         t.id,
         t.name,
         t.join_code,
         t.emoji,
         t.description,
         t.created_at,
         COUNT(tm.id)::int AS member_count
       FROM tables t
       LEFT JOIN table_members tm ON tm.table_id = t.id
       GROUP BY t.id
       ORDER BY t.created_at DESC`
    )

    return NextResponse.json(tables)
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[admin/tables GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
