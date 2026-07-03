import { motion } from 'framer-motion'
import { Carrot, ChefHat, Clock, HandHeart, Wheat } from 'lucide-react'
import type { FoodPost, Profile } from '../lib/supabase'
import { CreditsPill } from '../lib/ui'

const FOOD_TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  cooked_meal: { label: 'Freshly Cooked', icon: ChefHat, color: 'bg-amber-400/20 text-amber-700' },
  ingredients: { label: 'Extra Groceries', icon: Carrot, color: 'bg-olive-400/20 text-olive-700' },
  baking_supplies: { label: 'Baking Supplies', icon: Wheat, color: 'bg-cream-300/40 text-charcoal-800' },
  other: { label: 'Culinary Help', icon: HandHeart, color: 'bg-cream-300/40 text-charcoal-800' },
}

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
  const cat = FOOD_TYPE_META[post.food_type] ?? FOOD_TYPE_META.other
  const status = STATUS_META[post.status] ?? STATUS_META.open
  const CatIcon = cat.icon
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
            {post.food_type === 'cooked_meal' ? '🍽️' : post.food_type === 'ingredients' ? '🧺' : post.food_type === 'baking_supplies' ? '🥖' : '🧑‍🍳'}
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
              <div className="font-semibold text-charcoal-800">{isMine ? 'You' : (author.full_name ?? author.display_name)}</div>
              <div className="flex items-center gap-1 text-charcoal-700/50">
                <Clock className="h-2.5 w-2.5" /> {timeAgo(post.created_at)}
              </div>
            </div>
          </div>
          {isOffer ? (
            <span className="text-xs font-semibold text-olive-600">Free share</span>
          ) : (
            <CreditsPill amount={post.credit_price} />
          )}
        </div>
      </div>
    </motion.button>
  )
}
