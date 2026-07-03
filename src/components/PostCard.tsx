import { motion } from 'framer-motion'
import { Carrot, ChefHat, Clock, HandHeart, MapPin, MessageCircle } from 'lucide-react'
import { useState } from 'react'
import type { Post, Profile } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { CreditsPill } from '../lib/ui'

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  dish: { label: 'Freshly Cooked', icon: ChefHat, color: 'bg-amber-400/20 text-amber-700' },
  groceries: { label: 'Extra Groceries', icon: Carrot, color: 'bg-olive-400/20 text-olive-700' },
  help: { label: 'Culinary Help', icon: HandHeart, color: 'bg-cream-300/40 text-charcoal-800' },
}

const STATUS_META: Record<string, { label: string; color: string }> = {
  open: { label: 'Open', color: 'bg-success/15 text-success' },
  claimed: { label: 'Claimed', color: 'bg-amber-400/20 text-amber-700' },
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
  post: Post
  author: Profile
  onOpen: () => void
}) {
  const { user } = useAuth()
  const isMine = post.author_id === user?.id
  const cat = CATEGORY_META[post.category]
  const status = STATUS_META[post.status]
  const CatIcon = cat.icon
  const isOffer = post.kind === 'offer'

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
      {/* Image */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-cream-100">
        {post.image_url ? (
          <img
            src={post.image_url}
            alt={post.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-cream-100 to-cream-200 text-5xl">
            {post.category === 'dish' ? '🍽️' : post.category === 'groceries' ? '🧺' : '🧑‍🍳'}
          </div>
        )}
        {/* Status badge */}
        <div className="absolute left-3 top-3 flex gap-1.5">
          <span className={`badge ${status.color}`}>{status.label}</span>
        </div>
        {/* Kind badge */}
        <div className="absolute right-3 top-3">
          <span className={`badge ${isOffer ? 'bg-olive-400/90 text-white' : 'bg-amber-500 text-white'}`}>
            {isOffer ? 'Offer' : 'Request'}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-charcoal-700/70">
          <CatIcon className="h-3.5 w-3.5" />
          {cat.label}
        </div>
        <h3 className="mt-1 font-display text-lg font-semibold leading-snug text-charcoal-900 line-clamp-2">
          {post.title}
        </h3>
        {post.description && (
          <p className="mt-1 text-sm text-charcoal-700/70 line-clamp-2">{post.description}</p>
        )}

        {/* Footer */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cream-100 text-sm">
              {author.avatar_emoji}
            </div>
            <div className="text-xs">
              <div className="font-semibold text-charcoal-800">{isMine ? 'You' : author.display_name}</div>
              <div className="flex items-center gap-1 text-charcoal-700/50">
                <Clock className="h-2.5 w-2.5" /> {timeAgo(post.created_at)}
              </div>
            </div>
          </div>
          {isOffer ? (
            <span className="text-xs font-semibold text-olive-600">Free share</span>
          ) : (
            <CreditsPill amount={post.credits} />
          )}
        </div>
      </div>
    </motion.button>
  )
}
