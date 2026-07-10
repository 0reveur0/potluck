'use client'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { api } from '../lib/api'
import type { PostType, StudyPost, TableWithMember } from '../lib/types'
import { Modal } from '../lib/ui'
import { useToast } from '../lib/toast'

const SUBJECTS = ['Math', 'Physics', 'Chemistry', 'English', 'Programming', 'Other']

export function PostFormModal({
  kind,
  table,
  onClose,
  onCreated,
}: {
  kind: PostType | null
  table: TableWithMember
  onClose: () => void
  onCreated: (post: StudyPost) => void
}) {
  const { push } = useToast()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('Math')
  const [creditPrice, setCreditPrice] = useState(10)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isOffer = kind === 'offer_to_teach'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    try {
      const post = await api.post<StudyPost>('/api/posts/create', {
        table_id: table.id,
        type: kind,
        title: title.trim(),
        description: description.trim(),
        subject,
        credit_price: creditPrice,
      })
      push('success', isOffer ? 'Teaching offer posted! 📖' : 'Learning request posted! 🙋')
      setTitle('')
      setDescription('')
      setCreditPrice(10)
      onCreated(post)
    } catch (e) {
      setErr((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      open={kind !== null}
      onClose={onClose}
      title={isOffer ? '📖 Offer to Teach' : '🙋 Request to Learn'}
    >
      <form onSubmit={submit} className="space-y-5">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-cream-200/70">Title <span className="text-amber-400">*</span></label>
          <input className="input" placeholder={isOffer ? 'e.g. "I can teach Calculus Derivatives"' : 'e.g. "Need help with Organic Chemistry"'} value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-cream-200/70">Description <span className="text-cream-200/30">(optional)</span></label>
          <textarea className="input resize-none" rows={3} placeholder="Add more details about what you need or can offer…" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={800} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200/70">Subject</label>
            <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-cream-200/70">
              {isOffer ? 'Earn (credits)' : 'Bounty (credits)'}
            </label>
            <input className="input" type="number" min={1} max={500} value={creditPrice}
              onChange={(e) => setCreditPrice(Math.max(1, Math.min(500, parseInt(e.target.value) || 1)))} />
          </div>
        </div>

        {/* Credit balance info */}
        {!isOffer && (
          <div className="rounded-xl bg-amber-500/8 border border-amber-500/20 px-4 py-3 text-sm text-amber-300/80"
            style={{ background: 'rgba(245,158,11,0.06)' }}>
            Your balance in this table: <strong className="text-amber-300">{table.member.credits} credits</strong>
            {table.member.credits < creditPrice && (
              <span className="ml-2 text-red-400">(insufficient)</span>
            )}
          </div>
        )}

        {err && <p className="text-sm text-red-400">{err}</p>}

        <button type="submit" disabled={busy || !title.trim() || (!isOffer && table.member.credits < creditPrice)}
          className="btn-primary w-full py-3 gap-2">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : isOffer ? '📖 Post Teaching Offer' : '🙋 Post Learning Request'}
        </button>
      </form>
    </Modal>
  )
}
