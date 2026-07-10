import { NextRequest, NextResponse } from 'next/server'
import { transaction } from '@/lib/db'
import { requireAuth } from '@/lib/session'

/**
 * POST /api/matches/[id]/cancel
 * Either party can cancel an ongoing match.
 * Sets match status = 'cancelled' and post status back to 'open'.
 * No credits are transferred (escrow is simply released/discarded).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const matchId = parseInt(params.id, 10)
    if (Number.isNaN(matchId)) return NextResponse.json({ error: 'Invalid match id.' }, { status: 400 })

    const result = await transaction(async (client) => {
      const matchRes = await client.query(
        'SELECT * FROM matches WHERE id = $1 FOR UPDATE',
        [matchId]
      )
      if (matchRes.rows.length === 0) throw Object.assign(new Error('Match not found.'), { status: 404 })
      const match = matchRes.rows[0]

      if (match.provider_id !== user.userId && match.receiver_id !== user.userId)
        throw Object.assign(new Error('Forbidden.'), { status: 403 })
      if (match.status !== 'ongoing' && match.status !== 'pending')
        throw Object.assign(new Error('This match cannot be cancelled.'), { status: 409 })

      await client.query(
        "UPDATE matches SET status = 'cancelled' WHERE id = $1",
        [matchId]
      )
      // Re-open the post so others can claim it
      await client.query(
        "UPDATE study_posts SET status = 'open' WHERE id = $1",
        [match.post_id]
      )

      return { ...match, status: 'cancelled' }
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof Response) return err
    const e = err as { message?: string; status?: number }
    if (e.status) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[matches/[id]/cancel POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
