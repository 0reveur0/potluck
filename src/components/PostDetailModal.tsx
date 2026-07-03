import { motion } from 'framer-motion'
import { Carrot, ChefHat, HandHeart, Loader as Loader2, MessageCircle, ShieldCheck, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { supabase, type Post, type Profile, type Transaction } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Modal } from '../lib/ui'
import { useToast } from '../lib/toast'

const CATEGORY_META: Record<string, { label: string; icon: any }> = {
  dish: { label: 'Freshly Cooked', icon: ChefHat },
  groceries: { label: 'Extra Groceries', icon: Carrot },
  help: { label: 'Culinary Help', icon: HandHeart },
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
  post: Post | null
  author: Profile | null
  myCredits: number
  onClose: () => void
  onAccept: (txn: Transaction, post: Post, other: Profile) => void
  onDelete: () => void
}) {
  const { user } = useAuth()
  const { push } = useToast()
  const [busy, setBusy] = useState(false)

  if (!post || !author) return null

  const isMine = post.author_id === user?.id
  const isOffer = post.kind === 'offer'
  const cat = CATEGORY_META[post.category]
  const CatIcon = cat.icon
  const canAccept = !isMine && post.status === 'open' && (isOffer || myCredits >= post.credits)

  const accept = async () => {
    if (!user || !post) return
    setBusy(true)
    // Freeze the post by marking it claimed, then create the escrow transaction.
    const { error: pErr } = await supabase.from('posts').update({ status: 'claimed' }).eq('id', post.id).eq('status', 'open')
    if (pErr) { push('error', pErr.message); setBusy(false); return }
    const { data: txn, error: tErr } = await supabase.from('transactions').insert({
      post_id: post.id,
      table_id: post.table_id,
      provider_id: post.author_id,
      consumer_id: user.id,
      credits: post.credits,
      status: 'escrow_held',
    }).select('*').single()
    if (tErr) {
      // Roll back the claim
      await supabase.from('posts').update({ status: 'open' }).eq('id', post.id)
      push('error', tErr.message)
      setBusy(false)
      return
    }
    onAccept(txn as Transaction, post, author)
    setBusy(false)
  }

  const remove = async () => {
    if (!post) return
    if (!confirm('Delete this post?')) return
    setBusy(true)
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
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
              {post.category === 'dish' ? '🍽️' : post.category === 'groceries' ? '🧺' : '🧑‍🍳'}
            </div>
          )}
          <div className="absolute left-4 top-4 flex gap-2">
            <span className={`badge ${isOffer ? 'bg-olive-500 text-white' : 'bg-amber-500 text-white'}`}>
              {isOffer ? 'Offer' : 'Request'}
            </span>
            <span className="badge bg-white/90 text-charcoal-800">
              <CatIcon className="h-3 w-3" /> {cat.label}
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
            <span className="font-medium text-charcoal-800">{isMine ? 'You' : author.display_name}</span>
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
              {isOffer ? 'Free' : `🪙 ${post.credits}`}
            </div>
          </div>
          {!isOffer && (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700">
              <ShieldCheck className="h-4 w-4" /> Held in escrow
            </div>
          )}
        </div>

        {/* Insufficient credits warning */}
        {!isMine && !isOffer && post.status === 'open' && myCredits < post.credits && (
          <div className="rounded-2xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
            You need {post.credits - myCredits} more credits to accept this request.
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {canAccept ? (
            <button onClick={accept} disabled={busy} className="btn-primary flex-1">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <MessageCircle className="h-4 w-4" />}
              {isOffer ? 'Accept & chat' : 'Accept & escrow'}
            </button>
          ) : isMine && post.status === 'open' ? (
            <button onClick={remove} disabled={busy} className="btn-outline flex-1 text-danger hover:bg-danger/10">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Delete post
            </button>
          ) : post.status === 'claimed' ? (
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
