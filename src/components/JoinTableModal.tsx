'use client'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import type { TableWithMember } from '../lib/types'
import { Modal } from '../lib/ui'

export function JoinTableModal({
  open,
  onClose,
  onJoined,
}: {
  open: boolean
  onClose: () => void
  onJoined: (table: TableWithMember) => void
}) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const table = await api.post<TableWithMember>('/api/clans/join', { join_code: code.trim().toUpperCase() })
      setCode('')
      onJoined(table)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Join a Potluck Table">
      <p className="text-sm text-cream-200/60 mb-5">
        Enter the 6-character code your clan admin shared with you.
      </p>
      <form onSubmit={submit} className="space-y-4">
        <input
          className="input text-center font-mono text-2xl uppercase tracking-[0.3em]"
          placeholder="ABC123"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 6))}
          maxLength={6}
          required
        />
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={busy || code.length < 6} className="btn-primary w-full py-3">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Join Table'}
        </button>
      </form>
    </Modal>
  )
}
