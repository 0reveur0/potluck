import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, Check, CheckCheck, Loader as Loader2, Send, ShieldCheck, Circle as XCircle, Sparkles, Star } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { supabase, type FoodPost, type Match, type Message, type Profile } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import { Modal, Spinner } from '../lib/ui'
import { useToast } from '../lib/toast'

type ChatModalProps = {
  open: boolean
  onClose: () => void
  post: FoodPost | null
  other: Profile | null
  match: Match | null
  onSettled: () => void
}

export function ChatModal({ open, onClose, post, other, match, onSettled }: ChatModalProps) {
  const { user } = useAuth()
  const { push } = useToast()
  const [messages, setMessages] = useState<Message[]>([])
  const [body, setBody] = useState('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [localMatch, setLocalMatch] = useState<Match | null>(match)
  const [celebrate, setCelebrate] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => { setLocalMatch(match) }, [match])

  const loadMessages = async () => {
    if (!localMatch) return
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('match_id', localMatch.id)
      .order('created_at', { ascending: true })
    if (!error) setMessages(data ?? [])
    setLoading(false)
  }

  const refreshMatch = async () => {
    if (!localMatch) return
    const { data } = await supabase.from('matches').select('*').eq('id', localMatch.id).maybeSingle()
    if (data) setLocalMatch(data as Match)
  }

  useEffect(() => {
    if (!open || !localMatch) return
    setLoading(true)
    loadMessages()
    const channel = supabase
      .channel(`chat-${localMatch.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `match_id=eq.${localMatch.id}` }, (payload) => {
        setMessages((m) => [...m, payload.new as Message])
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'matches', filter: `id=eq.${localMatch.id}` }, (payload) => {
        setLocalMatch(payload.new as Match)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, localMatch?.id])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!localMatch || !open) return
    if (localMatch.status === 'completed') {
      setCelebrate(true)
      const timer = window.setTimeout(() => {
        setCelebrate(false)
        onSettled()
      }, 2200)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [localMatch?.status, open, onSettled])

  if (!open || !post || !other || !localMatch) return null

  const isProvider = user?.id === localMatch.provider_id
  const myConfirmed = isProvider ? localMatch.provider_confirmed : localMatch.receiver_confirmed
  const otherConfirmed = isProvider ? localMatch.receiver_confirmed : localMatch.provider_confirmed
  const settled = localMatch.status === 'completed' || localMatch.status === 'disputed'
  const chatOpen = localMatch.status === 'pending' || localMatch.status === 'ongoing'
  const escrowAmount = localMatch.credits

  const send = async () => {
    if (!body.trim() || !user || !chatOpen) return
    const text = body.trim()
    setBody('')
    const { data, error } = await supabase.from('messages').insert({
      match_id: localMatch.id,
      sender_id: user.id,
      content: text,
    }).select('*').single()
    if (error) { push('error', error.message); setBody(text); return }
    setMessages((m) => [...m, data as Message])
  }

  const confirmExchange = async () => {
    if (!user || settled) return
    setBusy(true)
    const { error } = await supabase.rpc('settle_match', { p_match: localMatch.id, p_as_provider: isProvider })
    if (error) { push('error', error.message); setBusy(false); return }
    await refreshMatch()
    push('success', 'Confirmed! 🤝')
    if ((await supabase.from('matches').select('*').eq('id', localMatch.id).maybeSingle()).data?.status === 'completed') {
      onSettled()
    }
    setBusy(false)
  }

  const cancel = async () => {
    if (!user || settled) return
    if (!confirm('Cancel this exchange? Escrow will be released.')) return
    setBusy(true)
    const { error } = await supabase.rpc('cancel_match', { p_match: localMatch.id })
    if (error) { push('error', error.message); setBusy(false); return }
    await refreshMatch()
    push('info', 'Exchange cancelled.')
    onSettled()
    setBusy(false)
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg">
      {/* Header */}
      <div className="-m-5 mb-0 grid gap-3 rounded-t-3xl border-b border-cream-200 bg-cream-50 p-4 md:grid-cols-[280px_minmax(0,1fr)]">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="rounded-full p-1.5 text-charcoal-700/60 hover:bg-cream-200 md:hidden">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex h-12 w-12 items-center justify-center rounded-3xl bg-cream-100 text-2xl shadow-card">
            {other.avatar_emoji}
          </div>
          <div className="min-w-0">
            <div className="truncate font-display text-lg font-semibold text-charcoal-900">{other.full_name ?? other.display_name}</div>
            <div className="truncate text-xs text-charcoal-700/60">{post.type === 'offer' ? 'Tutor available' : 'Help requested'}</div>
          </div>
        </div>
        <div className="rounded-3xl bg-charcoal-900/90 p-4 text-cream-50 shadow-card">
          <div className="text-[11px] uppercase tracking-[0.25em] text-amber-300/80">Match info</div>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/10 px-3 py-2">
              <span>Tutor</span>
              <span className="font-semibold">{post.type === 'offer' ? (post.user_id === other.id ? other.full_name ?? other.display_name : 'You') : (isProvider ? other.full_name ?? other.display_name : 'You')}</span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/10 px-3 py-2">
              <span>Topic</span>
              <span className="font-semibold">{post.title}</span>
            </div>
            <div className="flex items-center justify-between gap-2 rounded-2xl bg-white/10 px-3 py-2">
              <span>Bounty</span>
              <span className="font-semibold">🪙 {escrowAmount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Escrow status banner */}
      <div className="mt-3">
        <EscrowBanner
          status={localMatch.status}
          myConfirmed={myConfirmed}
          otherConfirmed={otherConfirmed}
          escrowAmount={escrowAmount}
        />
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="mt-3 h-72 overflow-y-auto rounded-2xl bg-cream-100/60 p-3">
        {loading ? (
          <div className="flex h-full items-center justify-center"><Spinner /></div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-charcoal-700/60">
            <ShieldCheck className="h-8 w-8 text-olive-500" />
            Say hello and arrange the handoff. Credits stay in escrow until you both confirm.
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence initial={false}>
              {messages.map((m) => {
                const mine = m.sender_id === user?.id
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    className={`flex ${mine ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm ${
                      mine ? 'bg-amber-500 text-white' : 'bg-white text-charcoal-900 shadow-card'
                    }`}>
                      {m.content}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 space-y-2">
        {chatOpen && (
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={confirmExchange}
              disabled={busy || myConfirmed}
              className={`btn-primary ${myConfirmed ? 'opacity-60' : ''}`}
            >
              {myConfirmed ? <CheckCheck className="h-4 w-4" /> : <Check className="h-4 w-4" />}
              {myConfirmed ? 'You confirmed' : 'Mark Session Completed'}
            </button>
            <button onClick={cancel} disabled={busy} className="btn-outline text-danger hover:bg-danger/10">
              <XCircle className="h-4 w-4" /> Cancel
            </button>
          </div>
        )}
        {settled && (
          <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${
            localMatch.status === 'completed' ? 'bg-success/15 text-success' : 'bg-danger/10 text-danger'
          }`}>
            {localMatch.status === 'completed' ? <CheckCheck className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {localMatch.status === 'completed'
              ? 'Session complete — credits transferred.'
              : 'Session cancelled — escrow released.'}
          </div>
        )}

        {/* Composer */}
        <div className="flex items-center gap-2">
          <input
            className="input flex-1"
            placeholder={settled ? 'Exchange closed' : 'Type a message…'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            disabled={settled}
          />
          <button onClick={send} disabled={settled || !body.trim()} className="btn-primary !px-3 !py-3">
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </Modal>
  )
}

function EscrowBanner({
  status, myConfirmed, otherConfirmed, escrowAmount,
}: { status: string; myConfirmed: boolean; otherConfirmed: boolean; escrowAmount: number }) {
  if (status === 'completed' || status === 'disputed') return null
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-amber-400/10 px-4 py-3 text-sm text-amber-700">
      <div className="flex items-center justify-between gap-3">
        <span className="font-semibold">Status: {status === 'ongoing' ? 'Ongoing' : 'Pending'}</span>
        <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-semibold text-amber-900">{escrowAmount} Credits Frozen</span>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs text-cream-100">
          {myConfirmed ? 'You confirmed' : 'Awaiting your confirmation'}
        </div>
        <div className="rounded-2xl bg-white/10 px-3 py-2 text-xs text-cream-100">
          {otherConfirmed ? 'Neighbor confirmed' : 'Awaiting neighbor'}
        </div>
      </div>
    </div>
  )
}
