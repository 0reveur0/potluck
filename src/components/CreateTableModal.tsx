import { motion } from 'framer-motion'
import { Loader as Loader2, Sparkles, Wand as Wand2 } from 'lucide-react'
import { useState } from 'react'
import { supabase, type PotluckTable } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Modal } from '../lib/ui'
import { useToast } from '../lib/toast'

const EMOJIS = ['🍲', '🥘', '🍝', '🥗', '🍜', '🍱', '🧺', '🥖', '🫕', '🍳', '🌮', '🍰']
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no confusing chars

function genCode(len = 6) {
  let s = ''
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  return s
}

export function CreateTableModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (t: PotluckTable) => void }) {
  const { user } = useAuth()
  const { push } = useToast()
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState(EMOJIS[0])
  const [description, setDescription] = useState('')
  const [code, setCode] = useState(genCode())
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setErr(null)
    if (name.trim().length < 2) { setErr('Give your table a name.'); return }
    setBusy(true)
    const { data, error } = await supabase
      .from('tables')
      .insert({
        name: name.trim(),
        emoji,
        description: description.trim() || null,
        join_code: code,
        created_by: user.id,
      })
      .select('*')
      .single()
    if (error) {
      if (error.code === '23505') {
        setErr('Code collision — try another code.')
      } else {
        setErr(error.message)
      }
      setBusy(false)
      return
    }
    // Auto-join the creator as a member with 50 credits.
    await supabase.from('table_members').insert({
      table_id: (data as PotluckTable).id,
      user_id: user.id,
      join_code: code,
      credits: 50,
    })
    setName(''); setDescription(''); setCode(genCode())
    onCreated(data as PotluckTable)
    setBusy(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Create a Potluck Table" maxWidth="max-w-lg">
      <div className="flex flex-col gap-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Table name</label>
          <input className="input" placeholder="The Co-op Kitchen" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} autoFocus />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Icon</label>
          <div className="flex flex-wrap gap-2">
            {EMOJIS.map((e) => (
              <button
                type="button"
                key={e}
                onClick={() => setEmoji(e)}
                className={`flex h-10 w-10 items-center justify-center rounded-2xl text-xl transition-all ${
                  emoji === e ? 'bg-amber-400/20 ring-2 ring-amber-500' : 'bg-cream-100 hover:bg-cream-200'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Description (optional)</label>
          <textarea className="input min-h-[80px] resize-none" placeholder="A short note for your neighbors…" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Join code</label>
          <div className="flex items-center gap-2">
            <div className="flex flex-1 items-center justify-center rounded-2xl border-2 border-dashed border-amber-400/60 bg-amber-400/10 px-4 py-3 font-mono text-2xl font-bold tracking-[0.4em] text-amber-700">
              {code}
            </div>
            <button type="button" onClick={() => setCode(genCode())} className="btn-ghost" title="Regenerate">
              <Wand2 className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1.5 text-xs text-charcoal-700/60">Share this code with neighbors so they can join.</p>
        </div>
        {err && <div className="rounded-2xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">{err}</div>}
        <button onClick={submit} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Create table
        </button>
      </div>
    </Modal>
  )
}
