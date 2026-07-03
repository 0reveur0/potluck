import { motion } from 'framer-motion'
import { ChefHat, KeyRound, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../lib/auth'
import { CreateTableModal } from './CreateTableModal'
import { JoinTableModal } from './JoinTableModal'

export function EmptyTableState({ onJoined }: { onJoined: () => void }) {
  const { profile } = useAuth()
  const [joinOpen, setJoinOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const isSuperAdmin = profile?.is_super_admin

  return (
    <div className="bg-paper flex flex-1 items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0.8, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: 'spring', stiffness: 200, damping: 14 }}
          className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400/20 text-4xl"
        >
          🍲
        </motion.div>
        <h1 className="mt-5 font-display text-3xl font-semibold text-charcoal-900">
          Welcome, {profile?.full_name ?? profile?.display_name ?? 'Neighbor'}!
        </h1>
        <p className="mt-2 text-charcoal-700/70">
          You haven't taken a seat at any Potluck Tables yet. Join one with a
          code from a host to start sharing meals and credits.
        </p>

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button onClick={() => setJoinOpen(true)} className="btn-primary">
            <KeyRound className="h-4 w-4" /> Join a Table
          </button>
          {isSuperAdmin && (
            <button onClick={() => setCreateOpen(true)} className="btn-outline">
              <Sparkles className="h-4 w-4" /> Create a Table
            </button>
          )}
        </div>

        <div className="mt-8 grid grid-cols-3 gap-3 text-left">
          <Step n="1" icon={<KeyRound className="h-4 w-4" />} title="Get a code" body="A host shares a join code like TASTY77." />
          <Step n="2" icon={<Plus className="h-4 w-4" />} title="Take a seat" body="Join the table and get 50 Food Credits." />
          <Step n="3" icon={<ChefHat className="h-4 w-4" />} title="Share & request" body="Post dishes, groceries, or culinary help." />
        </div>
      </motion.div>

      <JoinTableModal open={joinOpen} onClose={() => setJoinOpen(false)} onJoined={(t) => { onJoined(); setJoinOpen(false) }} />
      <CreateTableModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => { setCreateOpen(false); onJoined() }} />
    </div>
  )
}

function Step({ n, icon, title, body }: { n: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white/70 p-3 shadow-card">
      <div className="flex items-center gap-1.5 text-amber-600">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20 text-xs font-bold">{n}</span>
        {icon}
      </div>
      <div className="mt-1.5 text-sm font-semibold text-charcoal-900">{title}</div>
      <div className="text-xs text-charcoal-700/60">{body}</div>
    </div>
  )
}
