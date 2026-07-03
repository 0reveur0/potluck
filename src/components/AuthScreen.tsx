import { motion } from 'framer-motion'
import { ChefHat, Loader as Loader2, Lock, Mail, User } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { useToast } from '../lib/toast'

const AVATARS = ['🧑‍🍳', '👩‍🍳', '👨‍🍳', '🧑‍🌾', '🥖', '🥑', '🍅', '🧄', '🌶️', '🫑', '🥕', '🍯']

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
      if (password.length < 6) {
        setErr('Password must be at least 6 characters.')
        setBusy(false)
        return
      }
      const { error } = await signUp(email.trim(), password, name.trim() || 'Neighbor')
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
    <div className="bg-paper flex min-h-screen items-center justify-center p-4">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl border border-cream-200 bg-white/70 shadow-warm md:grid-cols-2">
        {/* Left: brand panel */}
        <div className="relative hidden flex-col justify-between bg-gradient-to-br from-amber-500 via-amber-600 to-olive-600 p-10 text-white md:flex">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/20 backdrop-blur">
                <ChefHat className="h-6 w-6" />
              </div>
              <span className="font-display text-2xl font-semibold">Potluck</span>
            </div>
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="mt-10 font-display text-4xl font-semibold leading-tight"
            >
              Share the feast,<br />one table at a time.
            </motion.h1>
            <p className="mt-4 max-w-sm text-white/85">
              A private, credit-based sharing network for homemade meals, extra
              groceries, and culinary help — inside invite-only Potluck Tables.
            </p>
          </div>
          <ul className="space-y-3 text-sm text-white/90">
            <li className="flex items-center gap-2"><span>🍲</span> Swap homemade dishes with neighbors</li>
            <li className="flex items-center gap-2"><span>🥕</span> Pass along excess groceries, no waste</li>
            <li className="flex items-center gap-2"><span>🧑‍🍳</span> Trade culinary help for credit bounties</li>
          </ul>
        </div>

        {/* Right: form */}
        <div className="p-6 sm:p-10">
          <div className="mb-6 flex items-center gap-2 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-500 text-white">
              <ChefHat className="h-5 w-5" />
            </div>
            <span className="font-display text-xl font-semibold text-charcoal-900">Potluck</span>
          </div>

          <h2 className="font-display text-2xl font-semibold text-charcoal-900">
            {mode === 'signup' ? 'Create your profile' : 'Welcome back'}
          </h2>
          <p className="mt-1 text-sm text-charcoal-700/70">
            {mode === 'signup'
              ? 'A global profile lets you join many Potluck Tables.'
              : 'Sign in to your sharing network.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Display name</label>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-700/40" />
                    <input
                      className="input pl-10"
                      placeholder="Chef Alex"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Pick an avatar</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATARS.map((a) => (
                      <button
                        type="button"
                        key={a}
                        onClick={() => setAvatar(a)}
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xl transition-all ${
                          avatar === a ? 'bg-amber-400/20 ring-2 ring-amber-500' : 'bg-cream-100 hover:bg-cream-200'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Email</label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-700/40" />
                <input
                  type="email"
                  className="input pl-10"
                  placeholder="you@kitchen.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Password</label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-700/40" />
                <input
                  type="password"
                  className="input pl-10"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            {err && (
              <div className="rounded-2xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">
                {err}
              </div>
            )}

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
              {mode === 'signup' ? 'Create profile' : 'Sign in'}
            </button>
          </form>

          <p className="mt-5 text-center text-sm text-charcoal-700/70">
            {mode === 'signup' ? 'Already have a profile?' : "Don't have one yet?"}{' '}
            <button
              onClick={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setErr(null) }}
              className="font-semibold text-amber-600 hover:text-amber-700"
            >
              {mode === 'signup' ? 'Sign in' : 'Create one'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
