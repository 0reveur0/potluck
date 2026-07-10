import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/session'

/**
 * POST /api/chat/[matchId]/send
 * Body: { content: string }
 * Appends a message to the match chat.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const user = await requireAuth()
    const matchId = parseInt(params.matchId, 10)
    if (Number.isNaN(matchId)) return NextResponse.json({ error: 'Invalid matchId.' }, { status: 400 })

    let body: Record<string, unknown>
    try { body = await req.json() } catch {
      return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
    }

    const content = String(body.content ?? '').trim()
    if (!content) return NextResponse.json({ error: 'content is required.' }, { status: 400 })
    if (content.length > 2000) return NextResponse.json({ error: 'Message too long (max 2000 chars).' }, { status: 400 })

    // Verify caller is a party to this match and match is active
    const match = await queryOne<{ provider_id: string; receiver_id: string; status: string }>(
      'SELECT provider_id, receiver_id, status FROM matches WHERE id = $1',
      [matchId]
    )
    if (!match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 })
    if (match.provider_id !== user.userId && match.receiver_id !== user.userId)
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    if (match.status !== 'ongoing' && match.status !== 'pending')
      return NextResponse.json({ error: 'This chat is closed.' }, { status: 409 })

    const rows = await query(
      `INSERT INTO messages (match_id, sender_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [matchId, user.userId, content]
    )

    return NextResponse.json(rows[0], { status: 201 })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[chat/send POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
