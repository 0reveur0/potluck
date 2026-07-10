import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/session'

const VALID_SUBJECTS = ['Math', 'Physics', 'Chemistry', 'English', 'Programming', 'Other']

/**
 * POST /api/posts/create
 * Body: { table_id, type, title, description?, subject, credit_price }
 *
 * For request_to_learn posts, validates that the user's credit balance in
 * the specific table is ≥ the bounty price before inserting.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth()

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const table_id   = Number(body.table_id)
    const type       = String(body.type ?? '')
    const title      = String(body.title ?? '').trim()
    const description = String(body.description ?? '').trim()
    const subject    = String(body.subject ?? 'Other').trim()
    const credit_price = Number(body.credit_price ?? 0)

    // Validate
    if (!table_id || Number.isNaN(table_id))
      return NextResponse.json({ error: 'table_id is required.' }, { status: 400 })
    if (type !== 'offer_to_teach' && type !== 'request_to_learn')
      return NextResponse.json({ error: 'type must be offer_to_teach or request_to_learn.' }, { status: 400 })
    if (!title)
      return NextResponse.json({ error: 'title is required.' }, { status: 400 })
    if (title.length > 120)
      return NextResponse.json({ error: 'title must be 120 characters or fewer.' }, { status: 400 })
    if (credit_price < 1 || credit_price > 500 || !Number.isInteger(credit_price))
      return NextResponse.json({ error: 'credit_price must be an integer between 1 and 500.' }, { status: 400 })

    // Verify membership
    const member = await queryOne<{ id: number; credits: number }>(
      'SELECT id, credits FROM table_members WHERE user_id = $1 AND table_id = $2',
      [user.userId, table_id]
    )
    if (!member)
      return NextResponse.json({ error: 'You are not a member of this table.' }, { status: 403 })

    // For learning requests: verify the user can afford the bounty
    if (type === 'request_to_learn' && member.credits < credit_price) {
      return NextResponse.json(
        { error: `Insufficient credits. You have ${member.credits} but this request requires ${credit_price}.` },
        { status: 422 }
      )
    }

    const safeSubject = VALID_SUBJECTS.includes(subject) ? subject : 'Other'

    const rows = await query<{ id: number }>(
      `INSERT INTO study_posts (user_id, table_id, type, title, description, subject, credit_price)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user.userId, table_id, type, title, description, safeSubject, credit_price]
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[posts/create POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
