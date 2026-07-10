import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { requireAuth } from '@/lib/session'

/**
 * DELETE /api/posts/[id]
 * Soft-cancels the post (sets status to 'cancelled').
 * Only the post author can delete; post must be in 'open' status.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await requireAuth()
    const postId = parseInt(params.id, 10)
    if (Number.isNaN(postId)) return NextResponse.json({ error: 'Invalid post id.' }, { status: 400 })

    const post = await queryOne<{ id: number; user_id: string; status: string }>(
      'SELECT id, user_id, status FROM study_posts WHERE id = $1',
      [postId]
    )
    if (!post) return NextResponse.json({ error: 'Post not found.' }, { status: 404 })
    if (post.user_id !== user.userId) return NextResponse.json({ error: 'Forbidden.' }, { status: 403 })
    if (post.status !== 'open') return NextResponse.json({ error: 'Only open posts can be deleted.' }, { status: 409 })

    await queryOne(
      "UPDATE study_posts SET status = 'cancelled' WHERE id = $1",
      [postId]
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof Response) return err
    console.error('[posts/[id] DELETE]', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
