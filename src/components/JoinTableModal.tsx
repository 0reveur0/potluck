import { motion } from 'framer-motion'
import { KeyRound, Loader as Loader2 } from 'lucide-react'
import { useState } from 'react'
import { supabase, type PotluckTable } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Modal } from '../lib/ui'
import { useToast } from '../lib/toast'

export function JoinTableModal({ open, onClose, onJoined }: { open: boolean; onClose: () => void; onJoined: (t: PotluckTable) => void }) {
  const { user } = useAuth()
  const { push } = useToast()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setErr(null)
    setBusy(true)
    const clean = code.trim().toUpperCase()
    if (clean.length < 4) {
      setErr('Enter a valid join code.')
      setBusy(false)
      return
    }
    // Look up the table by join_code so we can show its name on success.
    const { data: table, error: tErr } = await supabase
      .from('tables')
      .select('*')
      .eq('join_code', clean)
      .maybeSingle()
    if (tErr || !table) {
      setErr('No table found with that code.')
      setBusy(false)
      return
    }
    const { error } = await supabase.from('table_members').insert({
      table_id: (table as PotluckTable).id,
      user_id: user.id,
      join_code: clean,
      credits: 50,
    })
    if (error) {
      if (error.code === '23505') setErr('You already belong to this table.')
      else setErr(error.message)
      setBusy(false)
      return
    }
    setCode('')
    onJoined(table as PotluckTable)
    setBusy(false)
  }

  return (
    <Modal open={open} onClose={onClose} title="Join a Potluck Table" maxWidth="max-w-md">
      <div className="flex flex-col items-center gap-4 text-center">
        <motion.div
          initial={{ scale: 0.8, rotate: -10 }}
          animate={{ scale: 1, rotate: 0 }}
          className="flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-400/20 text-amber-600"
        >
          <KeyRound className="h-8 w-8" />
        </motion.div>
        <p className="text-sm text-charcoal-700/80">
          Enter the alphanumeric join code a host shared with you (e.g. <span className="font-mono font-bold text-amber-700">TASTY77</span>).
          You'll start with 50 Food Credits at this table.
        </p>
      </div>
      <form onSubmit={submit} className="mt-5 space-y-3">
        <input
          className="input text-center font-mono text-lg font-bold uppercase tracking-[0.3em]"
          placeholder="TASTY77"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          maxLength={10}
          autoFocus
        />
        {err && <div className="rounded-2xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">{err}</div>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          Take a seat
        </button>
      </form>
    </Modal>
  )
}
