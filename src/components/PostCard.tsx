import { motion } from 'framer-motion'
import { Clock, HandHeart } from 'lucide-react'
import type { FoodPost, Profile } from '../lib/supabase'
import { CreditsPill } from '../lib/ui'

const STATUS_META: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-success/15 text-success' },
  matched: { label: 'Claimed', color: 'bg-amber-400/20 text-amber-700' },
  completed: { label: 'Completed', color: 'bg-cream-200 text-charcoal-700' },
  cancelled: { label: 'Cancelled', color: 'bg-danger/10 text-danger' },
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

export function PostCard({
  post,
  author,
  onOpen,
}: {
  post: FoodPost
  author: Profile
  onOpen: () => void
}) {
  const isMine = post.user_id === author.id
  const status = STATUS_META[post.status] ?? STATUS_META.open
  const isOffer = post.type === 'offer'

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      whileHover={{ y: -3 }}
      onClick={onOpen}
      className="card group flex flex-col overflow-hidden text-left transition-shadow hover:shadow-warm"
    >
      <div className="bg-charcoal-900/90 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-300">{post.subject || 'Other'}</span>
          <span className={`badge ${isOffer ? 'bg-amber-500 text-white' : 'bg-olive-500 text-white'}`}>
            {isOffer ? 'Teaching' : 'Learning'}
          </span>
        </div>
        <h3 className="mt-3 font-display text-xl font-semibold leading-snug text-cream-50 line-clamp-2">{post.title}</h3>
        {post.description && (
          <p className="mt-2 text-sm leading-6 text-cream-200/80 line-clamp-3">{post.description}</p>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-cream-200/80">
          <span className="inline-flex items-center gap-1 rounded-full bg-charcoal-900/60 px-3 py-1">{author.avatar_emoji} {isMine ? 'You' : (author.full_name ?? author.display_name)}</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-charcoal-900/60 px-3 py-1">
            <Clock className="h-3 w-3" /> {timeAgo(post.created_at)}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="rounded-2xl bg-charcoal-900/80 px-4 py-2 text-sm font-semibold text-cream-100 transition-all group-hover:bg-charcoal-800">
            {isOffer ? '⭐ Connect' : `⭐ ${post.credit_price} Credits`}
          </div>
          <div className="rounded-full bg-amber-500 px-4 py-2 text-sm font-semibold text-charcoal-950 transition duration-200 group-hover:bg-amber-600">
            Claim / Connect
          </div>
        </div>
      </div>
    </motion.button>
  )
}
