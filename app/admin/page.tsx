'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  BookOpen,
  Check,
  ChevronRight,
  ClipboardCopy,
  Loader2,
  Plus,
  Shield,
  Sparkles,
  Users,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

// ── Types ─────────────────────────────────────────────────────────────────────

interface PotluckTable {
  id: number
  name: string
  join_code: string
  emoji: string
  description: string | null
  created_at: string
  member_count: number
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-amber-300 transition hover:border-amber-500/40 hover:bg-amber-500/10"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <ClipboardCopy className="h-3.5 w-3.5" />}
      {copied ? 'Copied!' : (label ?? 'Copy')}
    </button>
  )
}

// ── Success Modal ─────────────────────────────────────────────────────────────

function SuccessModal({
  table,
  onClose,
}: {
  table: PotluckTable
  onClose: () => void
}) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* backdrop */}
      <div className="absolute inset-0 bg-charcoal-950/70 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 24 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 12 }}
        transition={{ type: 'spring', stiffness: 340, damping: 28 }}
        className="relative z-10 w-full max-w-md overflow-hidden rounded-3xl border border-amber-500/25 bg-charcoal-900 shadow-warm-lg"
      >
        {/* amber glow top */}
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />

        <div className="p-8 text-center">
          {/* sparkle icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 400, damping: 18 }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-3xl"
          >
            {table.emoji}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
          >
            <h2 className="mt-5 font-bold text-xl text-cream-50">Table Created!</h2>
            <p className="mt-1 text-sm text-cream-200/60">
              Share this join code with students to let them enter{' '}
              <span className="font-semibold text-cream-100">{table.name}</span>.
            </p>
          </motion.div>

          {/* join code display */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-500/8 p-5"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400/70">
              Join Code
            </p>
            <p className="mt-2 font-mono text-4xl font-bold tracking-[0.25em] text-gradient-amber">
              {table.join_code}
            </p>
            <div className="mt-4 flex justify-center">
              <CopyButton text={table.join_code} label="Copy Join Code" />
            </div>
          </motion.div>

          <button
            onClick={onClose}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-white/5 py-3 text-sm font-medium text-cream-200/70 transition hover:bg-white/10 hover:text-cream-50"
          >
            Done <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-cream-200/30 transition hover:bg-white/10 hover:text-cream-200"
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </motion.div>
  )
}

// ── Table Row Card ────────────────────────────────────────────────────────────

function TableCard({ table, index }: { table: PotluckTable; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group relative overflow-hidden rounded-2xl border border-white/8 bg-charcoal-900/80 p-5 transition-all hover:border-amber-500/20 hover:shadow-warm"
    >
      {/* subtle top line on hover */}
      <div className="absolute inset-x-0 top-0 h-px scale-x-0 bg-gradient-to-r from-transparent via-amber-400/50 to-transparent transition-transform duration-300 group-hover:scale-x-100" />

      <div className="flex items-start justify-between gap-4">
        {/* left: emoji + info */}
        <div className="flex min-w-0 items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-2xl">
            {table.emoji}
          </div>
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-cream-50">{table.name}</h3>
            {table.description && (
              <p className="mt-0.5 truncate text-xs text-cream-200/50">{table.description}</p>
            )}
            <p className="mt-1 text-xs text-cream-200/40">Created {formatDate(table.created_at)}</p>
          </div>
        </div>

        {/* right: code + members */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-bold tracking-widest text-amber-300">
              {table.join_code}
            </span>
            <CopyButton text={table.join_code} />
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-white/5 px-3 py-1 text-xs text-cream-200/60">
            <Users className="h-3.5 w-3.5" />
            {table.member_count} {table.member_count === 1 ? 'member' : 'members'}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [tables, setTables] = useState<PotluckTable[]>([])
  const [loadingTables, setLoadingTables] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🍲')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newTable, setNewTable] = useState<PotluckTable | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)

  // ── fetch tables ───────────────────────────────────────────────────────────

  const fetchTables = useCallback(async () => {
    setFetchError(null)
    try {
      const res = await fetch('/api/admin/tables')
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        setFetchError(j.error ?? `Error ${res.status}`)
        return
      }
      setTables(await res.json())
    } catch {
      setFetchError('Could not reach the server.')
    } finally {
      setLoadingTables(false)
    }
  }, [])

  useEffect(() => {
    fetchTables()
  }, [fetchTables])

  // ── create table ───────────────────────────────────────────────────────────

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch('/api/admin/tables', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), emoji, description: description.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        setCreateError(data.error ?? `Error ${res.status}`)
        return
      }
      // prepend to list
      setTables((prev) => [{ ...data, member_count: 0 }, ...prev])
      setNewTable({ ...data, member_count: 0 })
      setName('')
      setEmoji('🍲')
      setDescription('')
    } catch {
      setCreateError('Could not reach the server.')
    } finally {
      setCreating(false)
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Success Modal ── */}
      <AnimatePresence>
        {newTable && (
          <SuccessModal table={newTable} onClose={() => setNewTable(null)} />
        )}
      </AnimatePresence>

      <div className="min-h-screen bg-charcoal-950">
        {/* ── Top bar ── */}
        <header className="sticky top-0 z-30 border-b border-white/6 bg-charcoal-950/90 backdrop-blur">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500/15 text-xl">
                🍲
              </div>
              <div>
                <span className="font-bold text-cream-50">Potluck</span>
                <span className="ml-2 text-cream-200/40 text-sm">/</span>
                <span className="ml-2 text-sm text-cream-200/60">Super Admin</span>
              </div>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300">
              <Shield className="h-3.5 w-3.5" />
              Admin Console
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-5xl px-6 py-10 space-y-10">

          {/* ── Section A: Create Table ── */}
          <section>
            <div className="mb-5 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <h2 className="font-bold text-lg text-cream-50">Create New Potluck Table</h2>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-amber-500/15 bg-charcoal-900/80 p-6">
              {/* decorative glow */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-amber-500/8 blur-3xl" />

              <form onSubmit={handleCreate} className="relative space-y-5">
                <div className="grid gap-4 sm:grid-cols-[1fr_80px]">
                  {/* Table name */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-cream-200/70">
                      Group Name <span className="text-amber-400">*</span>
                    </label>
                    <input
                      ref={nameRef}
                      className="input"
                      placeholder="e.g. Advanced Physics Crew"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                      required
                    />
                  </div>

                  {/* Emoji */}
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-cream-200/70">Emoji</label>
                    <input
                      className="input text-center text-2xl"
                      value={emoji}
                      onChange={(e) => setEmoji(e.target.value.trim() || '🍲')}
                      maxLength={4}
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-cream-200/70">
                    Description <span className="text-cream-200/30">(optional)</span>
                  </label>
                  <input
                    className="input"
                    placeholder="What's this table about?"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={200}
                  />
                </div>

                {createError && (
                  <motion.p
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-400"
                  >
                    {createError}
                  </motion.p>
                )}

                {/* Animated submit button */}
                <motion.button
                  type="submit"
                  disabled={creating || !name.trim()}
                  whileHover={{ scale: creating ? 1 : 1.02 }}
                  whileTap={{ scale: creating ? 1 : 0.97 }}
                  className="btn-primary relative w-full overflow-hidden py-3 text-base shadow-warm disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {/* shimmer sweep on idle */}
                  {!creating && (
                    <motion.span
                      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent"
                      animate={{ translateX: ['−100%', '200%'] }}
                      transition={{ duration: 2.2, repeat: Infinity, repeatDelay: 1.5 }}
                    />
                  )}
                  {creating ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Plus className="h-5 w-5" />
                      Generate Table Code
                    </>
                  )}
                </motion.button>
              </form>
            </div>
          </section>

          {/* ── Section B: Active Tables Inventory ── */}
          <section>
            <div className="mb-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-amber-400" />
                <h2 className="font-bold text-lg text-cream-50">Active Tables Inventory</h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-cream-200/60">
                {tables.length} {tables.length === 1 ? 'table' : 'tables'}
              </span>
            </div>

            {loadingTables ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-7 w-7 animate-spin text-amber-400/50" />
              </div>
            ) : fetchError ? (
              <div className="flex flex-col items-center gap-3 py-16 text-center">
                <p className="text-sm text-red-400">{fetchError}</p>
                <button onClick={fetchTables} className="btn-ghost text-xs">
                  Retry
                </button>
              </div>
            ) : tables.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-white/10 py-20 text-center"
              >
                <span className="text-5xl opacity-30">🍲</span>
                <p className="text-sm text-cream-200/40">No tables yet. Create the first one above.</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {tables.map((t, i) => (
                    <TableCard key={t.id} table={t} index={i} />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  )
}
