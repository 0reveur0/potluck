import { HandHeart, Loader as Loader2, Sparkles, Utensils } from 'lucide-react'
import { useState } from 'react'
import { supabase, type PostType, type StudySubject } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Modal } from '../lib/ui'
import { useToast } from '../lib/toast'

const SUBJECTS: { id: StudySubject; label: string }[] = [
  { id: 'Math', label: 'Math' },
  { id: 'Physics', label: 'Physics' },
  { id: 'Chemistry', label: 'Chemistry' },
  { id: 'English', label: 'English' },
  { id: 'Programming', label: 'Programming' },
  { id: 'Other', label: 'Other' },
]

export function PostFormModal({
  open,
  kind,
  tableId,
  memberCredits,
  onClose,
  onCreated,
}: {
  open: boolean
  kind: PostType
  tableId: number | null
  memberCredits: number
  onClose: () => void
  onCreated: () => void
}) {
  const { user } = useAuth()
  const { push } = useToast()
  const [subject, setSubject] = useState<StudySubject>('Math')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [credits, setCredits] = useState(10)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const isOffer = kind === 'offer'
  const verb = isOffer ? 'Share' : 'Request'
  const noun = isOffer ? 'a Dish' : 'a Bite'

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || !tableId) return
    setErr(null)
    if (subject.trim().length === 0) { setErr('Pick a subject.'); return }
    if (title.trim().length < 3) { setErr('Add a short title.'); return }
    if (description.trim().length < 10) { setErr('Add a bit more detail so tutors can help.'); return }
    if (!isOffer && credits <= 0) { setErr('Set a credit bounty for your request.'); return }
    if (!isOffer && credits > memberCredits) { setErr('You do not have enough study credits for this request.'); return }
    setBusy(true)
    const { error } = await supabase.from('food_posts').insert({
      table_id: tableId,
      user_id: user.id,
      type: kind,
      title: title.trim(),
      description: description.trim(),
      subject,
      food_type: 'other',
      credit_price: isOffer ? 0 : credits,
      image_url: null,
      status: 'open',
    })
    if (error) { setErr(error.message); setBusy(false); return }
    setTitle(''); setDescription(''); setCredits(10)
    push('success', isOffer ? 'Posted to your table! 🎓' : 'Request posted! 🙌')
    onCreated()
    setBusy(false)
  }

  return (
    <Modal open={open} onClose={onClose} title={`${verb} ${noun}`} maxWidth="max-w-lg">
      <div className="space-y-4">
        {/* Kind banner */}
        <div className={`flex items-center gap-3 rounded-2xl px-4 py-3 ${isOffer ? 'bg-olive-400/15 text-olive-700' : 'bg-amber-400/15 text-amber-700'}`}>
          {isOffer ? <Utensils className="h-5 w-5" /> : <HandHeart className="h-5 w-5" />}
          <p className="text-sm font-medium">
            {isOffer
              ? 'Offer a study session, explain a concept, or guide a peer through a tough topic.'
              : 'Ask for help with homework, exam prep, or a concept you are stuck on.'}
          </p>
        </div>

        {/* Subject selector */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Choose a subject</label>
          <div className="flex flex-wrap gap-2">
            {SUBJECTS.map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setSubject(item.id)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  subject === item.id
                    ? 'bg-amber-500 text-charcoal-950'
                    : 'bg-white/10 text-cream-100 hover:bg-white/20'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Title</label>
          <input
            className="input"
            placeholder={isOffer ? 'Lead a Calculus review session' : 'Need help with Calculus integrals'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={80}
            autoFocus
          />
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Details</label>
          <textarea
            className="input min-h-[90px] resize-none"
            placeholder={isOffer ? 'Walk learners through limits, derivatives, and exam-style problems.' : 'Exam is next week, struggling with integration by parts.'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={400}
          />
        </div>


        {/* Credits (requests) */}
        {!isOffer && (
          <div>
            <label className="mb-1.5 block text-sm font-medium text-charcoal-800">Credit bounty</label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={50}
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                className="flex-1 accent-amber-500"
              />
              <div className="flex w-20 items-center justify-center gap-1 rounded-2xl bg-amber-400/15 px-3 py-2 font-bold text-amber-700">
                🪙 {credits}
              </div>
            </div>
            <p className="mt-1.5 text-xs text-charcoal-700/60">Frozen in escrow when someone accepts; released on dual confirmation.</p>
            <p className="mt-2 text-xs text-charcoal-700/70">Available: {memberCredits} credits</p>
          </div>
        )}

        {err && <div className="rounded-2xl bg-danger/10 px-4 py-2.5 text-sm font-medium text-danger">{err}</div>}

        <button onClick={submit} disabled={busy} className="btn-primary w-full">
          {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isOffer ? 'Create offer' : 'Create request'}
        </button>
      </div>
    </Modal>
  )
}
