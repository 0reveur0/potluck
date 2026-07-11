'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { CircleCheck as CheckCircle2, Loader2, TriangleAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

// ── Onboarding: Invite-Code Entry ───────────────────────────────────────────
// Standalone entry point for joining a Potluck Table via its 6-character
// join_code. Hooks directly into the existing POST /api/clans/join route.

const CODE_LENGTH = 6

export default function OnboardingPage() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shake, setShake] = useState(0)
  const [success, setSuccess] = useState<{ tableId: number; name: string; emoji: string } | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length < CODE_LENGTH || busy) return

    setBusy(true)
    setError(null)

    try {
      const res = await fetch('/api/clans/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ join_code: code }),
      })
      const data = await res.json().catch(() => ({}))

      if (res.status === 401) {
        router.push('/')
        return
      }

      if (!res.ok) {
        setError(
          res.status === 404
            ? "That code doesn't match any active tables. Please double-check it."
            : (data.error ?? 'Something went wrong. Please try again.')
        )
        setShake((n) => n + 1)
        return
      }

      setSuccess({ tableId: data.id, name: data.name, emoji: data.emoji ?? '🍲' })
      setTimeout(() => router.push('/'), 1600)
    } catch {
      setError('Could not reach the server. Please try again.')
      setShake((n) => n + 1)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-charcoal-950 px-4">
      {/* soft amber glow behind the card */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-500/10 blur-[100px]" />

      <AnimatePresence mode="wait">
        {success ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.04 }}
            transition={{ type: 'spring', stiffness: 340, damping: 26 }}
            className="relative z-10 w-full max-w-sm rounded-3xl border border-amber-500/20 bg-charcoal-900/90 p-10 text-center shadow-warm-lg backdrop-blur"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 18 }}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/15 text-3xl"
            >
              {success.emoji}
            </motion.div>
            <h2 className="mt-5 flex items-center justify-center gap-2 text-xl font-bold text-cream-50">
              <CheckCircle2 className="h-5 w-5 text-success" />
              Joined successfully!
            </h2>
            <p className="mt-2 text-sm text-cream-200/60">
              +50 Credits granted in <span className="font-semibold text-cream-100">{success.name}</span>
            </p>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            className="relative z-10 w-full max-w-sm rounded-3xl border border-white/8 bg-charcoal-900/80 p-8 shadow-warm-lg backdrop-blur"
          >
            <div className="text-center">
              <h1 className="text-2xl font-bold text-cream-50">Welcome to Potluck! 🍲</h1>
              <p className="mt-2 text-sm text-cream-200/60">
                Enter your private Table Code to join your learning community.
              </p>
            </div>

            <form onSubmit={submit} className="mt-8 space-y-4">
              <motion.input
                key={shake}
                animate={
                  shake
                    ? { x: [0, -10, 10, -8, 8, -4, 4, 0] }
                    : {}
                }
                transition={{ duration: 0.45 }}
                autoFocus
                inputMode="text"
                autoCapitalize="characters"
                autoComplete="off"
                spellCheck={false}
                value={code}
                onChange={(e) => {
                  setError(null)
                  setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH))
                }}
                placeholder="ABC123"
                maxLength={CODE_LENGTH}
                className={`input text-center font-mono text-3xl tracking-[0.4em] ${
                  error ? 'border-red-500/60 focus:!ring-red-500/20' : ''
                }`}
              />

              <AnimatePresence>
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-start gap-1.5 text-sm text-red-400"
                  >
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
                    {error}
                  </motion.p>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={busy || code.length < CODE_LENGTH}
                whileHover={{ scale: busy || code.length < CODE_LENGTH ? 1 : 1.02 }}
                whileTap={{ scale: busy || code.length < CODE_LENGTH ? 1 : 0.97 }}
                className="btn-primary w-full py-3 text-base"
              >
                {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Join Table'}
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
