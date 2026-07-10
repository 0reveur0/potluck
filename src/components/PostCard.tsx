'use client'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import type { Profile, StudyPost } from '../lib/types'
import { CreditsPill } from '../lib/ui'

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

export function PostCard({
  post,
  author,
  myUserId,
  onOpen,
}: {
  post: StudyPost
  author: Profile
  myUserId: string
  onOpen: () => void
}) {
  const isMine = post.user_id === myUserId
  const isOffer = post.type === 'offer_to_teach'

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
      <div className="bg-charcoal-900 p-4" style={{ background: 'rgba(32,30,26,0.9)' }}>
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-amber-300/80">{post.subject}</span>
          <span className={`badge text-white ${isOffer ? 'bg-amber-600' : 'bg-green-700'}`}>
            {isOffer ? '📖 Teaching' : '🙋 Learning'}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-bold leading-snug text-cream-50 line-clamp-2">{post.title}</h3>
        {post.description && (
          <p className="mt-2 text-sm leading-relaxed text-cream-200/70 line-clamp-3">{post.description}</p>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-4">
        <div className="flex flex-wrap items-center gap-2 text-xs text-cream-200/60">
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
            {author.avatar_emoji} {isMine ? 'You' : (author.display_name || author.full_name)}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1">
            <Clock className="h-3 w-3" /> {timeAgo(post.created_at)}
          </span>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <CreditsPill amount={post.credit_price} />
          {!isMine && post.status === 'open' && (
            <span className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-charcoal-950 transition group-hover:bg-amber-400">
              {isOffer ? 'Connect →' : 'Claim →'}
            </span>
          )}
          {post.status !== 'open' && (
            <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-cream-200/60 capitalize">
              {post.status}
            </span>
          )}
        </div>
      </div>
    </motion.button>
  )
}
