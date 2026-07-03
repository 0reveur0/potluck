import { ChefHat, HandHeart, Loader as Loader2, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { supabase, type FoodPost, type Match, type Profile } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Modal } from '../lib/ui'
import { useToast } from '../lib/toast'

const POST_TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  offer: { label: 'Teaching', icon: ChefHat, color: 'bg-olive-500 text-white' },
  request: { label: 'Learning', icon: HandHeart, color: 'bg-amber-500 text-white' },
}

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
  post: FoodPost | null
  author: Profile | null
  myCredits: number
  onClose: () => void
  onAccept: (match: Match, post: FoodPost, other: Profile) => void
  onDelete: () => void
}) {
  const { user } = useAuth()
  const { push } = useToast()
  const [busy, setBusy] = useState(false)

  if (!post || !author) return null

  const isMine = post.user_id === user?.id
  const isOffer = post.type === 'offer'
  const meta = POST_TYPE_META[post.type] ?? POST_TYPE_META.request
  const canAccept = !isMine && post.status === 'open' && (isOffer || myCredits >= post.credit_price)

  const accept = async () => {
    if (!user || !post) return

    const payerId = isOffer ? user.id : post.user_id
    const providerId = isOffer ? post.user_id : user.id
    const receiverId = isOffer ? user.id : post.user_id

    // Verify payer credits
    if (!isOffer) {
      const { data: payer, error: payerErr } = await supabase
        .from('table_members')
        .select('credits')
        .eq('table_id', post.table_id)
        .eq('user_id', payerId)
        .maybeSingle()
      if (payerErr || !payer || payer.credits < post.credit_price) {
        push('error', 'Insufficient credits in this Potluck Table!')
        return
      }
    } else if (myCredits < post.credit_price) {
      push('error', 'Insufficient credits in this Potluck Table!')
      return
    }

    setBusy(true)

    const { error: pErr } = await supabase
      .from('food_posts')
      .update({ status: 'matched' })
      .eq('id', post.id)
      .eq('status', 'open')
    if (pErr) { push('error', pErr.message); setBusy(false); return }

    const { data: match, error: mErr } = await supabase.from('matches').insert({
      post_id: post.id,
      table_id: post.table_id,
      provider_id: providerId,
      receiver_id: receiverId,
      credits: post.credit_price,
      status: 'ongoing',
    }).select('*').single()

    if (mErr) {
      await supabase.from('food_posts').update({ status: 'open' }).eq('id', post.id)
      push('error', mErr.message)
      setBusy(false)
      return
    }

    onAccept(match as Match, post, author)
    setBusy(false)
  }

  const remove = async () => {
    if (!post) return
    if (!confirm('Delete this post?')) return
    setBusy(true)
    const { error } = await supabase.from('food_posts').delete().eq('id', post.id)
    if (error) { push('error', error.message); setBusy(false); return }
    push('info', 'Post deleted')
    onDelete()
    setBusy(false)
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      <div className="-m-5 mb-0">
        {/* Hero image */}
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-t-3xl bg-cream-100">
          {post.image_url ? (
            <img src={post.image_url} alt={post.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cream-100 to-cream-200 text-7xl">
              {post.food_type === 'cooked_meal' ? '🍽️' : post.food_type === 'ingredients' ? '🧺' : post.food_type === 'baking_supplies' ? '🥖' : '🧑‍🍳'}
            </div>
          )}
          <div className="absolute left-4 top-4 flex gap-2">
            <span className={`badge ${meta.color}`}>{meta.label}</span>
            <span className="badge bg-white/90 text-charcoal-800">
              {post.subject || 'Other'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <div>
          <h2 className="font-display text-2xl font-semibold text-charcoal-900">{post.title}</h2>
          <div className="mt-1 flex items-center gap-2 text-sm text-charcoal-700/70">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cream-100 text-sm">
              {author.avatar_emoji}
            </div>
            <span className="font-medium text-charcoal-800">{isMine ? 'You' : (author.full_name ?? author.display_name)}</span>
          </div>
        </div>

        {post.description && (
          <p className="text-sm leading-relaxed text-charcoal-700/80">{post.description}</p>
        )}

        {/* Credit / escrow box */}
        <div className={`flex items-center justify-between rounded-2xl p-4 ${isOffer ? 'bg-olive-400/10' : 'bg-amber-400/10'}`}>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-charcoal-700/60">
              {isOffer ? 'Sharing' : 'Credit bounty'}
            </div>
            <div className="font-display text-2xl font-semibold text-charcoal-900">
              {isOffer ? 'Free' : `🪙 ${post.credit_price}`}
            </div>
          </div>
          {!isOffer && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <ShieldCheck className="h-4 w-4" /> Held in escrow
            </div>
          )}
        </div>

        {/* Insufficient credits warning */}
        {!isMine && !isOffer && post.status === 'open' && myCredits < post.credit_price && (
          <div className="rounded-2xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
            You need {post.credit_price - myCredits} more credits to accept this request.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {canAccept ? (
            <button onClick={accept} disabled={busy} className="btn-primary flex-1">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              Claim / Connect
            </button>
          ) : isMine && post.status === 'open' ? (
            <button onClick={remove} disabled={busy} className="btn-outline flex-1 text-danger hover:bg-danger/10">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete post
            </button>
          ) : post.status === 'matched' ? (
            <div className="flex-1 rounded-2xl bg-amber-400/15 px-4 py-3 text-center text-sm font-semibold text-amber-700">
              Already claimed — check your chats
            </div>
          ) : post.status === 'completed' ? (
            <div className="flex-1 rounded-2xl bg-success/15 px-4 py-3 text-center text-sm font-semibold text-success">
              Completed 🎉
            </div>
          ) : (
            <div className="flex-1 rounded-2xl bg-cream-100 px-4 py-3 text-center text-sm font-semibold text-charcoal-700/70">
              Cancelled
            </div>
          )}
          <button onClick={onClose} className="btn-ghost">Close</button>
        </div>
      </div>
    </Modal>
  )
}
