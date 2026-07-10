'use client'
import { BookOpen, Hash } from 'lucide-react'
import { useState } from 'react'
import { JoinTableModal } from './JoinTableModal'
import type { TableWithMember } from '../lib/types'

export function EmptyTableState({ onJoined }: { onJoined: () => void }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-3xl text-5xl" style={{ background: 'rgba(245,158,11,0.1)' }}>
        🍲
      </div>
      <div>
        <h2 className="text-2xl font-bold text-cream-50">No tables yet</h2>
        <p className="mt-2 max-w-sm text-sm text-cream-200/50">
          You haven't joined any Potluck Tables. Enter a join code from your clan admin to get started.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          onClick={() => setOpen(true)}
          className="btn-primary gap-2 px-6 py-3"
        >
          <Hash className="h-4 w-4" />
          Enter Join Code
        </button>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-cream-200/50">
        <BookOpen className="h-4 w-4 shrink-0 text-amber-400" />
        You start with <strong className="text-amber-400 mx-1">50 credits</strong> per clan you join.
      </div>

      <JoinTableModal
        open={open}
        onClose={() => setOpen(false)}
        onJoined={() => { setOpen(false); onJoined() }}
      />
    </div>
  )
}
