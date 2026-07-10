'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { HandHeart, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useAuth } from '../lib/auth'
import { useMyMatches, useTablePosts } from '../lib/hooks'
import type { Match, PostType, Profile, StudyPost, TableWithMember } from '../lib/types'
import { EmptyState } from '../lib/ui'
import { ChatModal } from './ChatModal'
import { PostCard } from './PostCard'
import { PostDetailModal } from './PostDetailModal'
import { PostFormModal } from './PostFormModal'

type Filter = 'all' | 'offers' | 'requests' | 'mine'
const SUBJECTS = ['Math', 'Physics', 'Chemistry', 'English', 'Programming', 'Other']

export function Dashboard({
  table,
  onTablesChanged,
}: {
  table: TableWithMember
  onTablesChanged: () => void
}) {
  const { user } = useAuth()
  const { posts, loading, refresh } = useTablePosts(table.id)
  const { matches, refresh: refreshMatches } = useMyMatches()

  const [formKind, setFormKind] = useState<PostType | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [subjectFilter, setSubjectFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [detailPost, setDetailPost] = useState<StudyPost | null>(null)
  const [chat, setChat] = useState<{ match: Match; post: StudyPost; other: Profile } | null>(null)

  const authorMap = useMemo(() => {
    const m = new Map<string, Profile>()
    posts.forEach((p) => { if (p.author) m.set(p.user_id, p.author) })
    return m
  }, [posts])

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (filter === 'offers'   && p.type !== 'offer_to_teach') return false
      if (filter === 'requests' && p.type !== 'request_to_learn') return false
      if (filter === 'mine'     && p.user_id !== user?.id) return false
      if (subjectFilter !== 'all' && p.subject !== subjectFilter) return false
      if (query.trim() && !(`${p.subject} ${p.title} ${p.description}`).toLowerCase().includes(query.toLowerCase())) return false
      return true
    })
  }, [posts, filter, query, subjectFilter, user?.id])

  const openChatForPost = (post: StudyPost) => {
    const match = matches.find((m) => m.post_id === post.id)
    if (!match) return
    const other = match.other ?? authorMap.get(
      match.provider_id === user?.id ? match.receiver_id : match.provider_id
    )
    if (other) setChat({ match, post, other })
  }

  const handleAccept = (match: Match, post: StudyPost, other: Profile) => {
    setDetailPost(null)
    setChat({ match, post, other })
    refresh()
    refreshMatches()
    onTablesChanged() // credit balance may change
  }

  const activeMatches = matches.filter((m) => m.status === 'pending' || m.status === 'ongoing')

  return (
    <div className="flex h-full flex-col text-cream-50" style={{ background: '#141209' }}>
      {/* Header */}
      <div className="border-b border-white/6 px-4 py-4 backdrop-blur sm:px-6"
        style={{ background: 'rgba(32,30,26,0.95)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 text-2xl">
            {table.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-bold text-cream-50">{table.name}</h1>
            <p className="text-sm text-cream-200/50">
              🪙 {table.member.credits} credits · {activeMatches.length} active session{activeMatches.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setFormKind('offer_to_teach')}
              className="btn-primary gap-2 px-4 py-2 text-sm">
              <Plus className="h-4 w-4" /> Teach
            </button>
            <button onClick={() => setFormKind('request_to_learn')}
              className="btn-ghost gap-2 px-4 py-2 text-sm border border-white/10">
              <HandHeart className="h-4 w-4" /> Learn
            </button>
          </div>
        </div>
      </div>

      {/* Feed controls */}
      <div className="border-b border-white/6 px-4 py-3 sm:px-6"
        style={{ background: 'rgba(32,30,26,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex flex-wrap gap-3">
          {/* Filter tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-white/5 p-1">
            {([
              ['all', 'All'],
              ['offers', 'Teaching'],
              ['requests', 'Learning'],
              ['mine', 'Mine'],
            ] as [Filter, string][]).map(([f, label]) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                  filter === f ? 'bg-amber-500 text-charcoal-950' : 'text-cream-200/60 hover:text-cream-50'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[180px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-200/40" />
            <input className="input pl-10 text-sm py-2" placeholder="Search topics…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>

        {/* Subject chips */}
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {['all', ...SUBJECTS].map((s) => (
            <button key={s} onClick={() => setSubjectFilter(s)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                subjectFilter === s ? 'bg-amber-500 text-charcoal-950' : 'bg-white/5 text-cream-200/60 hover:bg-white/10'
              }`}>
              {s === 'all' ? '✦ All Subjects' : s}
            </button>
          ))}
        </div>
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-amber-500" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<span className="text-3xl">📚</span>}
            title="No posts here"
            subtitle={filter === 'all' ? 'Be the first to post in this table!' : 'Try a different filter.'}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((post) => {
                const author = post.author ?? authorMap.get(post.user_id)
                if (!author) return null
                const myMatch = matches.find((m) => m.post_id === post.id)
                const hasChat  = !!myMatch && (myMatch.status === 'ongoing' || myMatch.status === 'pending')

                return (
                  <div key={post.id} className="relative">
                    <PostCard
                      post={post}
                      author={author}
                      myUserId={user?.id ?? ''}
                      onOpen={() => setDetailPost(post)}
                    />
                    {hasChat && (
                      <button
                        onClick={() => openChatForPost(post)}
                        className="absolute bottom-3 right-3 rounded-xl bg-amber-500 px-3 py-1.5 text-xs font-bold text-charcoal-950 shadow-warm hover:bg-amber-400 transition"
                      >
                        💬 Chat
                      </button>
                    )}
                  </div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modals */}
      <PostFormModal
        kind={formKind}
        table={table}
        onClose={() => setFormKind(null)}
        onCreated={() => { setFormKind(null); refresh() }}
      />

      <PostDetailModal
        open={!!detailPost}
        post={detailPost}
        author={detailPost ? (detailPost.author ?? authorMap.get(detailPost.user_id) ?? null) : null}
        myCredits={table.member.credits}
        onClose={() => setDetailPost(null)}
        onAccept={handleAccept}
        onDelete={() => { setDetailPost(null); refresh() }}
      />

      <ChatModal
        open={!!chat}
        post={chat?.post ?? null}
        other={chat?.other ?? null}
        match={chat?.match ?? null}
        onClose={() => setChat(null)}
        onSettled={() => { setChat(null); refresh(); refreshMatches(); onTablesChanged() }}
      />
    </div>
  )
}
