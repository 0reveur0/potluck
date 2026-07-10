import { NextRequest, NextResponse } from 'next/server'
import { transaction } from '@/lib/db'
import { requireAuth } from '@/lib/session'

/**
 * POST /api/matches/[id]/confirm
 *
 * Marks the authenticated user as having confirmed completion.
 * When BOTH parties confirm, executes an atomic ACID transaction:
 *   1. SELECT … FOR UPDATE to lock both table_member rows.
 *   2. Verify receiver still has enough credits (safety check).
 *   3. Deduct credits from receiver's table_members balance.
 *   4. Add credits to provider's table_members balance.
 *   5. Set match status = 'completed', settled_at = NOW().
 * Any failure rolls back the entire operation.
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
      // Lock the match row
      const matchRes = await client.query(
        'SELECT * FROM matches WHERE id = $1 FOR UPDATE',
        [matchId]
      )
      if (matchRes.rows.length === 0) throw Object.assign(new Error('Match not found.'), { status: 404 })
      const match = matchRes.rows[0]

      const isProvider = match.provider_id === user.userId
      const isReceiver = match.receiver_id === user.userId
      if (!isProvider && !isReceiver) throw Object.assign(new Error('Forbidden.'), { status: 403 })
      if (match.status !== 'ongoing') throw Object.assign(new Error('This match is no longer active.'), { status: 409 })

      // Record this user's confirmation
      const confirmCol = isProvider ? 'provider_confirmed' : 'receiver_confirmed'
      await client.query(
        `UPDATE matches SET ${confirmCol} = true WHERE id = $1`,
        [matchId]
      )

      // Re-read both flags after update
      const updatedRes = await client.query('SELECT * FROM matches WHERE id = $1', [matchId])
      const updated = updatedRes.rows[0]

      // If both confirmed → settle the escrow atomically
      if (updated.provider_confirmed && updated.receiver_confirmed) {
        // Lock both table_member rows in deterministic order to prevent deadlocks
        const [firstId, secondId] = [match.provider_id, match.receiver_id].sort()
        await client.query(
          'SELECT id FROM table_members WHERE user_id = ANY($1::uuid[]) AND table_id = $2 FOR UPDATE',
          [[firstId, secondId], match.table_id]
        )

        // Safety: verify receiver can still cover the cost
        const receiverRes = await client.query(
          'SELECT credits FROM table_members WHERE user_id = $1 AND table_id = $2',
          [match.receiver_id, match.table_id]
        )
        const receiverCredits = receiverRes.rows[0]?.credits ?? 0
        if (receiverCredits < match.credits) {
          throw Object.assign(
            new Error(`Receiver has insufficient credits (${receiverCredits} < ${match.credits}).`),
            { status: 422 }
          )
        }

        // Deduct from learner (receiver)
        await client.query(
          'UPDATE table_members SET credits = credits - $1 WHERE user_id = $2 AND table_id = $3',
          [match.credits, match.receiver_id, match.table_id]
        )

        // Pay teacher (provider)
        await client.query(
          'UPDATE table_members SET credits = credits + $1 WHERE user_id = $2 AND table_id = $3',
          [match.credits, match.provider_id, match.table_id]
        )

        // Mark match complete, update post status
        await client.query(
          "UPDATE matches SET status = 'completed', settled_at = NOW() WHERE id = $1",
          [matchId]
        )
        await client.query(
          "UPDATE study_posts SET status = 'completed' WHERE id = $1",
          [match.post_id]
        )

        return { ...updated, status: 'completed', settled_at: new Date().toISOString() }
      }

      return updated
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof Response) return err
    const e = err as { message?: string; status?: number }
    if (e.status) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[matches/[id]/confirm POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
