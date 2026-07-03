import { AnimatePresence, motion } from 'framer-motion'
import { Carrot, ChefHat, Filter, HandHeart, MessageCircle, Plus, Search, Utensils } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useMyTransactions, useTablePosts, type TableWithMember } from '../lib/hooks'
import { supabase, type Post, PostKind, Profile, Transaction } from '../lib/supabase'
import { EmptyState } from '../lib/ui'
import { ChatModal } from './ChatModal'
import { PostCard } from './PostCard'
import { PostDetailModal } from './PostDetailModal'
import { PostFormModal } from './PostFormModal'

type Filter = 'all' | 'offers' | 'requests' | 'mine'

export function Dashboard({
  table,
  onTablesChanged,
}: {
  table: TableWithMember
  onTablesChanged: () => void
}) {
  const { user } = useAuth()
  const { posts, loading, refresh } = useTablePosts(table.id)
  const { txns, refresh: refreshTxns } = useMyTransactions()
  const [formKind, setFormKind] = useState<PostKind | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [detailPost, setDetailPost] = useState<Post | null>(null)
  const [chat, setChat] = useState<{ txn: Transaction; post: Post; other: Profile } | null>(null)

  const authorMap = useMemo(() => {
    const m = new Map<string, Profile>()
    posts.forEach((p: any) => { if (p.author) m.set(p.author.id, p.author) })
    return m
  }, [posts])

  const filtered = useMemo(() => {
    return posts.filter((p: any) => {
      if (filter === 'offers' && p.kind !== 'offer') return false
      if (filter === 'requests' && p.kind !== 'request') return false
      if (filter === 'mine' && p.author_id !== user?.id) return false
      if (query.trim() && !(`${p.title} ${p.description ?? ''}`.toLowerCase().includes(query.toLowerCase()))) return false
      return true
    })
  }, [posts, filter, query, user?.id])

  const openChatForPost = async (post: Post) => {
    const txn = txns.find((t: any) => t.post_id === post.id) as Transaction | undefined
    if (!txn) return
    const otherId = txn.provider_id === user?.id ? txn.consumer_id : txn.provider_id
    const other = authorMap.get(otherId) as Profile | undefined
    if (!other) {
      const { data } = await supabase
        .from('profiles').select('*').eq('id', otherId).maybeSingle()
      if (data) setChat({ txn, post, other: data as Profile })
      return
    }
    setChat({ txn, post, other })
  }

  const handleAccept = (txn: Transaction, post: Post, other: Profile) => {
    setDetailPost(null)
    setChat({ txn, post, other })
    refresh()
    refreshTxns()
  }

  const activeChats = txns.filter((t: any) => t.status === 'escrow_held') as Transaction[]

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b border-cream-200 bg-cream-50/80 px-4 py-4 backdrop-blur sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400/20 text-2xl">
            {table.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl font-semibold text-charcoal-900">{table.name}</h1>
            <p className="text-sm text-charcoal-700/60">
              {table.description ?? 'A private Potluck Table'} · Code <span className="font-mono font-bold text-amber-700">{table.join_code}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl bg-amber-400/15 px-4 py-2">
            <span className="text-lg">🪙</span>
            <div>
              <div className="text-xs font-medium text-charcoal-700/60">Your credits</div>
              <div className="font-display text-lg font-bold leading-none text-amber-700">{table.member.credits}</div>
            </div>
          </div>
        </div>

        {/* Active chats strip */}
        {activeChats.length > 0 && (
          <div className="mt-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-charcoal-700/50">Active exchanges</span>
            {activeChats.map((t) => {
              const otherId = t.provider_id === user?.id ? t.consumer_id : t.provider_id
              const other = authorMap.get(otherId)
              if (!other) return null
              const post = posts.find((p: any) => p.id === t.post_id) as Post | undefined
              return (
                <button
                  key={t.id}
                  onClick={() => post && openChatForPost(post)}
                  className="flex shrink-0 items-center gap-2 rounded-full bg-white px-3 py-1.5 text-sm shadow-card ring-1 ring-cream-200 transition-all hover:ring-amber-400"
                >
                  <span>{other.avatar_emoji}</span>
                  <span className="font-medium text-charcoal-800">{other.display_name}</span>
                  <span className="text-amber-700">🪙{t.credits}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto bg-paper px-4 py-5 sm:px-6">
        {/* Dual CTAs */}
        <div className="grid gap-3 sm:grid-cols-2">
          <DualCTA
            kind="offer"
            onClick={() => setFormKind('offer')}
            title="Share a Dish"
            subtitle="Offer homemade meals, extra groceries, or baking supplies"
            icon={<Utensils className="h-6 w-6" />}
            tone="olive"
          />
          <DualCTA
            kind="request"
            onClick={() => setFormKind('request')}
            title="Request a Bite"
            subtitle="Ask for a meal, a missing ingredient, or culinary help"
            icon={<HandHeart className="h-6 w-6" />}
            tone="amber"
          />
        </div>

        {/* Feed controls */}
        <div className="mt-6 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1 rounded-2xl bg-white p-1 shadow-card">
            {([
              ['all', 'All'],
              ['offers', 'Offers'],
              ['requests', 'Requests'],
              ['mine', 'Mine'],
            ] as [Filter, string][]).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition-all ${
                  filter === f ? 'bg-amber-500 text-white shadow-warm' : 'text-charcoal-700/70 hover:bg-cream-100'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="relative flex-1 min-w-[180px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-700/40" />
            <input
              className="input pl-9"
              placeholder="Search the feast…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Feed */}
        <div className="mt-4">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="card animate-pulse overflow-hidden">
                  <div className="aspect-[4/3] bg-cream-200" />
                  <div className="space-y-2 p-4">
                    <div className="h-3 w-20 rounded bg-cream-200" />
                    <div className="h-4 w-3/4 rounded bg-cream-200" />
                    <div className="h-3 w-1/2 rounded bg-cream-200" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<ChefHat className="h-7 w-7" />}
              title={query || filter !== 'all' ? 'Nothing matches that filter' : 'The table is quiet…'}
              subtitle={query || filter !== 'all'
                ? 'Try a different filter or search.'
                : 'Be the first to share a dish or request a bite!'}
            />
          ) : (
            <motion.div layout className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence>
                {filtered.map((p: any) => (
                  <PostCard
                    key={p.id}
                    post={p as Post}
                    author={p.author as Profile}
                    onOpen={() => setDetailPost(p as Post)}
                  />
                ))}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      <div className="pointer-events-none fixed bottom-5 right-5 z-20 flex flex-col gap-2 md:hidden">
        <button onClick={() => setFormKind('offer')} className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-olive-500 text-white shadow-warm active:scale-95">
          <Utensils className="h-6 w-6" />
        </button>
        <button onClick={() => setFormKind('request')} className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-warm active:scale-95">
          <HandHeart className="h-6 w-6" />
        </button>
      </div>

      {/* Modals */}
      <PostFormModal
        open={formKind !== null}
        kind={formKind ?? 'offer'}
        tableId={table.id}
        onClose={() => setFormKind(null)}
        onCreated={() => { setFormKind(null); refresh(); onTablesChanged() }}
      />
      <PostDetailModal
        open={!!detailPost}
        post={detailPost}
        author={detailPost ? authorMap.get(detailPost.author_id) ?? null : null}
        myCredits={table.member.credits}
        onClose={() => setDetailPost(null)}
        onAccept={handleAccept}
        onDelete={() => { setDetailPost(null); refresh() }}
      />
      <ChatModal
        open={!!chat}
        txn={chat?.txn ?? null}
        post={chat?.post ?? null}
        other={chat?.other ?? null}
        onClose={() => setChat(null)}
        onSettled={() => { refresh(); refreshTxns(); onTablesChanged() }}
      />
    </div>
  )
}

function DualCTA({
  kind, onClick, title, subtitle, icon, tone,
}: {
  kind: PostKind
  onClick: () => void
  title: string
  subtitle: string
  icon: React.ReactNode
  tone: 'olive' | 'amber'
}) {
  return (
    <motion.button
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`group relative overflow-hidden rounded-3xl p-5 text-left shadow-card transition-shadow hover:shadow-warm ${
        tone === 'olive'
          ? 'bg-gradient-to-br from-olive-400 to-olive-600 text-white'
          : 'bg-gradient-to-br from-amber-400 to-amber-600 text-white'
      }`}
    >
      <div className="relative z-10 flex items-start gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
          {icon}
        </div>
        <div className="flex-1">
          <div className="font-display text-xl font-semibold">{title}</div>
          <p className="mt-0.5 text-sm text-white/85">{subtitle}</p>
        </div>
        <Plus className="h-5 w-5 text-white/70 transition-transform group-hover:rotate-90" />
      </div>
      <div className="absolute -right-6 -bottom-6 h-24 w-24 rounded-full bg-white/10" />
    </motion.button>
  )
}
