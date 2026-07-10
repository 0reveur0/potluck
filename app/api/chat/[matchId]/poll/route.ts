import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/session'

/**
 * GET /api/chat/[matchId]/poll?since=<lastMessageId>
 *
 * Returns all messages with id > since, plus the current match state.
 * Designed to be called every 2 seconds from the ChatModal.
 * Pass since=0 (or omit) to load the full history on first open.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { matchId: string } }
) {
  try {
    const user = await requireAuth()
    const matchId = parseInt(params.matchId, 10)
    if (Number.isNaN(matchId)) return NextResponse.json({ error: 'Invalid matchId.' }, { status: 400 })

    const sinceParam = new URL(req.url).searchParams.get('since') ?? '0'
    const since = parseInt(sinceParam, 10) || 0

    // Verify caller is a party to this match
    const match = await queryOne<{
      id: number; post_id: number; table_id: number
      provider_id: string; receiver_id: string; credits: number
      status: string; provider_confirmed: boolean; receiver_confirmed: boolean
      created_at: string; settled_at: string | null
    }>(
      'SELECT * FROM matches WHERE id = $1',
      [matchId]
    )
    if (!match) return NextResponse.json({ error: 'Match not found.' }, { status: 404 })
    if (match.provider_id !== user.userId && match.receiver_id !== user.userId)
      return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })

    const messages = await query(
      `SELECT * FROM messages
       WHERE match_id = $1 AND id > $2
       ORDER BY created_at ASC`,
      [matchId, since]
    )

    return NextResponse.json({ messages, match })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[chat/poll GET]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
