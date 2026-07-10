'use client'
import { BookOpen, Loader2, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import type { Match, Profile, StudyPost } from '../lib/types'
import { CreditsPill, Modal } from '../lib/ui'
import { useToast } from '../lib/toast'

export function PostDetailModal({
  open,
  post,
  author,
  myCredits,
  onClose,
  onAccept,
  onDelete,
}: {
  open: boolean
  post: StudyPost | null
  author: Profile | null
  myCredits: number
  onClose: () => void
  onAccept: (match: Match, post: StudyPost, other: Profile) => void
  onDelete: () => void
}) {
  const { user } = useAuth()
  const { push } = useToast()
  const [busy, setBusy] = useState(false)

  if (!post || !author) return null

  const isMine  = post.user_id === user?.id
  const isOffer = post.type === 'offer_to_teach'

  // For offer_to_teach: learner (me) pays → check my credits
  // For request_to_learn: teacher (me) earns → no credit check on claimer
  const iCanAfford = isOffer ? myCredits >= post.credit_price : true
  const canAccept  = !isMine && post.status === 'open' && iCanAfford

  const accept = async () => {
    if (!post) return
    setBusy(true)
    try {
      const { match, other } = await api.post<{ match: Match; other: Profile }>(
        `/api/posts/${post.id}/claim`,
        {}
      )
      onAccept(match, post, other)
    } catch (err) {
      push('error', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!post) return
    if (!window.confirm('Delete this post?')) return
    setBusy(true)
    try {
      await api.del(`/api/posts/${post.id}`)
      push('info', 'Post deleted.')
      onDelete()
    } catch (err) {
      push('error', (err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <div className="-m-5 mb-0">
        <div className="flex items-center gap-3 rounded-t-3xl px-6 py-5"
          style={{ background: isOffer ? 'rgba(180,83,9,0.25)' : 'rgba(21,128,61,0.2)' }}>
          <span className="text-4xl">{isOffer ? '📖' : '🙋'}</span>
          <div>
            <span className={`badge text-xs font-bold text-white ${isOffer ? 'bg-amber-600' : 'bg-green-700'}`}>
              {isOffer ? 'Offer to Teach' : 'Request to Learn'}
            </span>
            <h2 className="mt-1 text-xl font-bold text-cream-50 leading-snug">{post.title}</h2>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {/* Subject + credits */}
        <div className="flex items-center gap-3">
          <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
            {post.subject}
          </span>
          <CreditsPill amount={post.credit_price} />
        </div>

        {/* Description */}
        {post.description && (
          <p className="text-sm leading-relaxed text-cream-200/70">{post.description}</p>
        )}

        {/* Author */}
        <div className="flex items-center gap-3 rounded-2xl bg-white/5 px-4 py-3">
          <span className="text-2xl">{author.avatar_emoji}</span>
          <div>
            <div className="text-sm font-semibold text-cream-50">{author.display_name || author.full_name}</div>
            <div className="text-xs text-cream-200/50">
              {isOffer ? 'Available to teach' : 'Looking for a tutor'}
            </div>
          </div>
        </div>

        {/* Credit affordability warning */}
        {!isMine && isOffer && !iCanAfford && (
          <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-400">
            You need {post.credit_price} credits but only have {myCredits} in this table.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          {isMine ? (
            <button onClick={remove} disabled={busy || post.status !== 'open'}
              className="btn-ghost flex-1 gap-2 text-red-400 hover:text-red-300">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete Post
            </button>
          ) : (
            <button onClick={accept} disabled={busy || !canAccept} className="btn-primary flex-1 py-3 gap-2">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isOffer ? <><MessageCircle className="h-4 w-4" /> Connect &amp; Start Session</> : <><ShieldCheck className="h-4 w-4" /> Accept as Tutor</>}
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
