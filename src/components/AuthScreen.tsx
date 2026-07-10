'use client'
import { motion } from 'framer-motion'
import { BookOpen, Loader2, Lock, Mail, User } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'

const AVATARS = ['🧑‍🍳', '👩‍🏫', '🧑‍🎓', '👨‍💻', '🦸', '🧙', '🥷', '🎓', '🚀', '⚡', '🔬', '📚']

export function AuthScreen() {
  const { signIn, signUp } = useAuth()
  const { push } = useToast()
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [avatar, setAvatar] = useState(AVATARS[0])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    if (mode === 'signup') {
      if (password.length < 6) { setErr('Password must be at least 6 characters.'); setBusy(false); return }
      const { error } = await signUp(email.trim(), password, name.trim() || 'Scholar', avatar)
      if (error) setErr(error)
      else push('success', 'Welcome to Potluck! 🍲')
    } else {
      const { error } = await signIn(email.trim(), password)
      if (error) setErr(error)
      else push('success', 'Welcome back!')
    }
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ background: '#141209' }}>
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-charcoal-900 shadow-warm-lg md:grid-cols-2">
        {/* Left brand panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-amber-600 via-amber-700 to-amber-900 p-10 text-white md:flex">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 text-2xl">🍲</div>
              <span className="text-2xl font-bold">Potluck</span>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="mt-10 text-4xl font-bold leading-tight"
            >
              Share knowledge,<br />one table at a time.
            </motion.h1>
            <p className="mt-4 max-w-sm text-white/80 text-sm leading-relaxed">
              A private, credit-based peer-to-peer tutoring platform. Join invite-only clans, teach what you know, and learn what you don't.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Offer to teach, earn credits</li>
            <li className="flex items-center gap-2"><span>🎓</span> Request help, spend credits</li>
            <li className="flex items-center gap-2"><span>🔒</span> Private clans with join codes</li>
          </ul>
        </div>

        {/* Right form */}
        <div className="p-8 sm:p-10">
          <div className="mb-2 flex items-center gap-2 md:hidden">
            <div className="text-2xl">🍲</div>
            <span className="text-xl font-bold text-cream-50">Potluck</span>
          </div>

          <h2 className="text-2xl font-bold text-cream-50">
            {mode === 'signup' ? 'Create your profile' : 'Welcome back'}
          </h2>
          <p className="mt-1 text-sm text-cream-200/60">
            {mode === 'signup' ? 'Join the knowledge-sharing community.' : 'Sign in to continue.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-cream-200/70">Display name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-200/40" />
                    <input className="input pl-10" placeholder="e.g. Alex Chen" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-cream-200/70">Pick an avatar</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map((a) => (
                      <button type="button" key={a} onClick={() => setAvatar(a)}
                        className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-all ${avatar === a ? 'ring-2 ring-amber-500 bg-amber-500/20' : 'bg-white/5 hover:bg-white/10'}`}>
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-cream-200/70">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-200/40" />
                <input className="input pl-10" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-cream-200/70">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-cream-200/40" />
                <input className="input pl-10" type="password" placeholder="6+ characters" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
            </div>

            {err && <p className="text-sm text-red-400">{err}</p>}

            <button type="submit" disabled={busy} className="btn-primary w-full py-3 text-base">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : mode === 'signup' ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-cream-200/50">
            {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setErr(null) }}
              className="font-semibold text-amber-400 hover:text-amber-300 transition">
              {mode === 'signup' ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
