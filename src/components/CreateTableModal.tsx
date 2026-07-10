'use client'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import type { PotluckTable } from '../lib/types'
import { Modal } from '../lib/ui'

export function CreateTableModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (table: PotluckTable) => void
}) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('🍲')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const table = await api.post<PotluckTable>('/api/admin/tables', { name: name.trim(), emoji })
      setName('')
      setEmoji('🍲')
      onCreated(table)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Create Potluck Table">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-[1fr_72px] gap-3">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200/70">Table Name</label>
            <input className="input" placeholder="Advanced Physics Crew" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200/70">Emoji</label>
            <input className="input text-center text-2xl" value={emoji} onChange={(e) => setEmoji(e.target.value.trim() || '🍲')} maxLength={4} />
          </div>
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={busy || !name.trim()} className="btn-primary w-full py-3">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Generate Table Code'}
        </button>
      </form>
    </Modal>
  )
}
