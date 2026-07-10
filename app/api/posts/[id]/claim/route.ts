import { NextRequest, NextResponse } from 'next/server'
import { transaction, query } from '@/lib/db'
import { requireAuth } from '@/lib/session'

/**
 * POST /api/posts/[id]/claim
 * Claims an open post, creating a Match with credits in escrow.
 *
 * Roles:
 *   offer_to_teach  → post owner = provider (teacher); claimer = receiver (learner, pays)
 *   request_to_learn → post owner = receiver (learner, pays); claimer = provider (teacher)
 *
 * Credit validation: receiver's balance in this table must be ≥ post.credit_price.
 * No credits are moved at claim time — they are locked via match.credits and
 * transferred atomically only when both parties confirm completion.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const postId = parseInt(params.id, 10)
    if (Number.isNaN(postId)) return NextResponse.json({ error: 'Invalid post id.' }, { status: 400 })

    const result = await transaction(async (client) => {
      // Lock post row
      const postRes = await client.query(
        'SELECT * FROM study_posts WHERE id = $1 FOR UPDATE',
        [postId]
      )
      if (postRes.rows.length === 0) throw Object.assign(new Error('Post not found.'), { status: 404 })
      const post = postRes.rows[0]

      if (post.status !== 'open') throw Object.assign(new Error('This post has already been claimed.'), { status: 409 })
      if (post.user_id === user.userId) throw Object.assign(new Error('You cannot claim your own post.'), { status: 422 })

      // Determine provider/receiver
      const isOffer     = post.type === 'offer_to_teach'
      const provider_id = isOffer ? post.user_id  : user.userId
      const receiver_id = isOffer ? user.userId   : post.user_id

      // Validate receiver has enough credits in this table
      const memberRes = await client.query(
        'SELECT credits FROM table_members WHERE user_id = $1 AND table_id = $2 FOR UPDATE',
        [receiver_id, post.table_id]
      )
      if (memberRes.rows.length === 0) throw Object.assign(new Error('Receiver is not a member of this table.'), { status: 403 })
      const receiverCredits = memberRes.rows[0].credits as number
      if (receiverCredits < post.credit_price) {
        throw Object.assign(
          new Error(`Insufficient credits. Learner has ${receiverCredits} but this post costs ${post.credit_price}.`),
          { status: 422 }
        )
      }

      // Verify claimer is a member of the table
      const claimerRes = await client.query(
        'SELECT id FROM table_members WHERE user_id = $1 AND table_id = $2',
        [user.userId, post.table_id]
      )
      if (claimerRes.rows.length === 0) throw Object.assign(new Error('You are not a member of this table.'), { status: 403 })

      // Update post to matched
      await client.query(
        "UPDATE study_posts SET status = 'matched' WHERE id = $1",
        [postId]
      )

      // Create match (status: ongoing = both parties active)
      const matchRes = await client.query(
        `INSERT INTO matches (post_id, table_id, provider_id, receiver_id, credits, status)
         VALUES ($1, $2, $3, $4, $5, 'ongoing')
         RETURNING *`,
        [postId, post.table_id, provider_id, receiver_id, post.credit_price]
      )

      return { match: matchRes.rows[0], post }
    })

    // Fetch the other party's profile to return to the client
    const otherId = result.match.provider_id === user.userId
      ? result.match.receiver_id
      : result.match.provider_id

    const profileRows = await query<{
      id: string; full_name: string; display_name: string
      avatar_emoji: string; avatar_url: string | null
      bio: string | null; is_super_admin: boolean; created_at: string; email: string
    }>('SELECT * FROM profiles WHERE id = $1', [otherId])
    const other = profileRows[0] ?? null

    return NextResponse.json({ match: result.match, other }, { status: 201 })
  } catch (err: unknown) {
    if (err instanceof Response) return err
    const e = err as { message?: string; status?: number }
    if (e.status) return NextResponse.json({ error: e.message }, { status: e.status })
    console.error('[posts/[id]/claim POST]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
