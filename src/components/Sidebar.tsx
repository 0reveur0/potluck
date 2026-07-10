'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, LogOut, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import type { TableWithMember } from '../lib/types'
import { CreateTableModal } from './CreateTableModal'
import { JoinTableModal } from './JoinTableModal'

export function Sidebar({
  tables,
  activeId,
  onSelect,
  onJoined,
}: {
  tables: TableWithMember[]
  activeId: number | null
  onSelect: (id: number) => void
  onJoined: () => void
}) {
  const { user, signOut } = useAuth()
  const { push } = useToast()
  const [joinOpen, setJoinOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const content = (
    <div className="flex h-full flex-col bg-charcoal-900 border-r border-white/8"
      style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500/20 text-xl">🍲</div>
        <div>
          <div className="font-bold text-cream-50">Potluck</div>
          <div className="text-xs text-cream-200/40">Knowledge sharing</div>
        </div>
        <button onClick={() => setMobileOpen(false)} className="ml-auto rounded-full p-1.5 text-cream-200/40 hover:bg-white/10 md:hidden">
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tables list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <div className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-cream-200/30">
          Your Tables
        </div>
        <div className="space-y-1">
          <AnimatePresence initial={false}>
            {tables.map((t) => {
              const active = t.id === activeId
              return (
                <motion.button
                  key={t.id}
                  layout
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  onClick={() => { onSelect(t.id); setMobileOpen(false) }}
                  className={`group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all ${
                    active
                      ? 'ring-1 ring-amber-500/50'
                      : 'hover:bg-white/5'
                  }`}
                  style={active ? { background: 'rgba(245,158,11,0.12)' } : {}}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${
                    active ? '' : 'bg-white/5'
                  }`} style={active ? { background: 'rgba(245,158,11,0.15)' } : {}}>
                    {t.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-semibold ${active ? 'text-amber-300' : 'text-cream-100'}`}>
                      {t.name}
                    </div>
                    <div className="text-xs text-cream-200/40">🪙 {t.member.credits} credits</div>
                  </div>
                </motion.button>
              )
            })}
          </AnimatePresence>

          {tables.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-cream-200/30">
              No tables yet
            </div>
          )}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="space-y-2 border-t border-white/6 p-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <button
          onClick={() => setJoinOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-amber-400/30 bg-amber-400/8 px-3 py-3 text-left text-sm font-medium text-amber-300 transition hover:bg-amber-400/15"
          style={{ background: 'rgba(245,158,11,0.05)' }}
        >
          <BookOpen className="h-4 w-4" />
          Enter Join Code
        </button>

        {user?.isAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-white/5 px-3 py-3 text-left text-sm font-medium text-cream-200/60 transition hover:bg-white/10 hover:text-cream-50"
          >
            <Plus className="h-4 w-4" />
            Create Table (Admin)
          </button>
        )}

        <div className="flex items-center gap-2 px-1 pt-1">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/15 text-lg">
            {user?.avatarEmoji ?? '🧑'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-cream-100">{user?.displayName}</div>
            {user?.isAdmin && <div className="text-[10px] text-amber-400">Super Admin</div>}
          </div>
          <button onClick={signOut} className="rounded-lg p-1.5 text-cream-200/30 hover:bg-white/10 hover:text-cream-200 transition">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-64 shrink-0 md:block">{content}</aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex items-center gap-3 border-b border-white/6 bg-charcoal-900/95 px-4 py-3 backdrop-blur md:hidden"
        style={{ background: 'rgba(32,30,26,0.95)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <button onClick={() => setMobileOpen(true)} className="rounded-xl bg-white/10 p-2 text-cream-200">
          🍲
        </button>
        <span className="font-bold text-cream-50">Potluck</span>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.aside initial={{ x: -280 }} animate={{ x: 0 }} exit={{ x: -280 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute left-0 top-0 h-full w-72">
              {content}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <JoinTableModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={(t) => { onJoined(); setJoinOpen(false); push('success', `Joined ${t.name} ${t.emoji} · 50 credits added!`) }}
      />
      <CreateTableModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(t) => { setCreateOpen(false); push('success', `Table created! Code: ${t.join_code}`) }}
      />
    </>
  )
}
