import { AnimatePresence, motion } from 'framer-motion'
import { ChefHat, LogOut, Plus, Settings, Sparkles, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'
import type { TableWithMember } from '../lib/hooks'
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
  const { profile, signOut } = useAuth()
  const { push } = useToast()
  const [joinOpen, setJoinOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  const isSuperAdmin = profile?.is_super_admin

  const content = (
    <div className="flex h-full flex-col">
      {/* Brand */}
      <div className="flex items-center gap-2 px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-warm">
          <ChefHat className="h-5 w-5" />
        </div>
        <div>
          <div className="font-display text-lg font-semibold leading-none text-charcoal-900">Potluck</div>
          <div className="text-xs text-charcoal-700/60">Share the feast</div>
        </div>
        <button
          onClick={() => setMobileOpen(false)}
          className="ml-auto rounded-full p-1.5 text-charcoal-700/60 hover:bg-cream-200 md:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Tables list */}
      <div className="px-3">
        <div className="px-2 pb-2 text-xs font-semibold uppercase tracking-wider text-charcoal-700/50">
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
                    active ? 'bg-amber-400/20 ring-1 ring-amber-400' : 'hover:bg-cream-100'
                  }`}
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xl ${
                    active ? 'bg-amber-500/20' : 'bg-cream-100'
                  }`}>
                    {t.emoji}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-semibold ${active ? 'text-charcoal-900' : 'text-charcoal-800'}`}>
                      {t.name}
                    </div>
                    <div className="text-xs text-charcoal-700/60">
                      🪙 {t.member.credits} credits
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </AnimatePresence>
          {tables.length === 0 && (
            <div className="px-3 py-6 text-center text-sm text-charcoal-700/60">
              You haven't joined a table yet.
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="mt-auto space-y-2 p-3">
        <button
          onClick={() => setJoinOpen(true)}
          className="flex w-full items-center gap-3 rounded-2xl border-2 border-dashed border-amber-400/60 bg-amber-400/10 px-3 py-3 text-left text-sm font-semibold text-amber-700 transition-all hover:bg-amber-400/20"
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/30">
            <Plus className="h-4 w-4" />
          </div>
          Join a Table
        </button>

        {isSuperAdmin && (
          <button
            onClick={() => setCreateOpen(true)}
            className="flex w-full items-center gap-3 rounded-2xl bg-charcoal-900 px-3 py-3 text-left text-sm font-semibold text-cream-50 transition-all hover:bg-charcoal-800"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/10">
              <Sparkles className="h-4 w-4" />
            </div>
            Create a Table
            <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">Admin</span>
          </button>
        )}

        {/* Profile footer */}
        <div className="mt-2 flex items-center gap-3 rounded-2xl bg-cream-100 px-3 py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-lg">
            {profile?.avatar_emoji ?? '🧑‍🍳'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-charcoal-900">{profile?.full_name ?? profile?.display_name ?? 'Neighbor'}</div>
            <div className="flex items-center gap-1 text-xs text-charcoal-700/60">
              <Settings className="h-3 w-3" /> Profile
            </div>
          </div>
          <button
            onClick={() => { signOut(); push('info', 'Signed out') }}
            className="rounded-xl p-2 text-charcoal-700/60 hover:bg-cream-200 hover:text-danger"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-72 shrink-0 border-r border-cream-200 bg-cream-50/80 backdrop-blur md:block">
        {content}
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex items-center gap-2 border-b border-cream-200 bg-cream-50/90 px-4 py-3 backdrop-blur md:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-xl bg-cream-100 p-2 text-charcoal-800"
        >
          <ChefHat className="h-5 w-5" />
        </button>
        <span className="font-display text-lg font-semibold text-charcoal-900">Potluck</span>
        {activeId && (
          <span className="ml-auto text-sm font-medium text-charcoal-700/70">
            {tables.find((t) => t.id === activeId)?.emoji} {tables.find((t) => t.id === activeId)?.name}
          </span>
        )}
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 md:hidden"
          >
            <div className="absolute inset-0 bg-charcoal-900/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: 'spring', stiffness: 320, damping: 32 }}
              className="absolute left-0 top-0 h-full w-72 border-r border-cream-200 bg-cream-50"
            >
              {content}
            </motion.aside>
          </motion.div>
        )}
      </AnimatePresence>

      <JoinTableModal
        open={joinOpen}
        onClose={() => setJoinOpen(false)}
        onJoined={(t) => { onJoined(); setJoinOpen(false); push('success', `Joined ${t.name} ${t.emoji}`) }}
      />
      <CreateTableModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(t) => { setCreateOpen(false); push('success', `Table ${t.name} created! Code: ${t.join_code}`) }}
      />
    </>
  )
}
