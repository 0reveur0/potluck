'use client'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, CheckCheck, Loader2, Send, Shield, XCircle } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useChatPoll } from '../lib/hooks'
import type { Match, Profile, StudyPost } from '../lib/types'
import { Modal, Spinner } from '../lib/ui'
import { useToast } from '../lib/toast'

export function ChatModal({
  open,
  onClose,
  post,
  other,
  match: initialMatch,
  onSettled,
}: {
  open: boolean
  onClose: () => void
  post: StudyPost | null
  other: Profile | null
  match: Match | null
  onSettled: () => void
}) {
  const { user } = useAuth()
  const { push } = useToast()
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [celebrate, setCelebrate] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const matchId = initialMatch?.id ?? null
  const { messages, match, loading } = useChatPoll(matchId, open)

  // Auto-scroll on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  // Celebrate + close when match completes
  useEffect(() => {
    if (!match || !open) return
    if (match.status === 'completed') {
      setCelebrate(true)
      const t = setTimeout(() => { setCelebrate(false); onSettled() }, 2400)
      return () => clearTimeout(t)
    }
    return undefined
  }, [match?.status, open, onSettled])

  if (!open || !post || !other || !initialMatch) return null

  const liveMatch: Match = match ?? initialMatch
  const isProvider  = user?.id === liveMatch.provider_id
  const myConfirmed = isProvider ? liveMatch.provider_confirmed : liveMatch.receiver_confirmed
  const otherConfirmed = isProvider ? liveMatch.receiver_confirmed : liveMatch.provider_confirmed
  const settled  = liveMatch.status === 'completed' || liveMatch.status === 'cancelled'
  const chatOpen = !settled
  const isOffer  = post.type === 'offer_to_teach'

  const send = async () => {
    if (!body.trim() || !chatOpen || !matchId) return
    const text = body.trim()
    setBody('')
    setSending(true)
    try {
      await api.post(`/api/chat/${matchId}/send`, { content: text })
    } catch (err) {
      push('error', (err as Error).message)
      setBody(text)
    } finally {
      setSending(false)
    }
  }

  const confirm = async () => {
    if (!matchId) return
    setConfirming(true)
    try {
      await api.post(`/api/matches/${matchId}/confirm`, {})
      push('success', 'Confirmation recorded!')
    } catch (err) {
      push('error', (err as Error).message)
    } finally {
      setConfirming(false)
    }
  }

  const cancel = async () => {
    if (!matchId || !confirm) return
    if (!window.confirm('Cancel this session? Escrow will be released.')) return
    try {
      await api.post(`/api/matches/${matchId}/cancel`, {})
      onSettled()
    } catch (err) {
      push('error', (err as Error).message)
    }
  }

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-lg"
      title={
        <div className="flex items-center gap-3">
          <span className="text-xl">{other.avatar_emoji}</span>
          <div>
            <div className="font-bold text-cream-50">{other.display_name || other.full_name}</div>
            <div className="text-xs text-amber-400/80 font-normal">
              {isOffer ? '📖 Teaching session' : '🙋 Learning session'} · {liveMatch.credits} credits
            </div>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        {/* Celebrate overlay */}
        <AnimatePresence>
          {celebrate && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-3xl text-center"
              style={{ background: 'rgba(20,18,9,0.92)' }}>
              <div className="text-6xl mb-4">🎉</div>
              <p className="text-xl font-bold text-amber-400">Session Complete!</p>
              <p className="mt-2 text-sm text-cream-200/60">{liveMatch.credits} credits transferred.</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Escrow banner */}
        {!settled && (
          <div className="rounded-2xl border border-amber-400/20 px-4 py-3 text-sm" style={{ background: 'rgba(245,158,11,0.08)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 font-semibold text-amber-300">
                <Shield className="h-4 w-4" />
                {liveMatch.credits} credits in escrow
              </div>
              <span className="text-xs text-amber-400/60 capitalize">{liveMatch.status}</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`rounded-xl px-3 py-2 ${myConfirmed ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-cream-200/50'}`}>
                {myConfirmed ? <span>✓ You confirmed</span> : <span>Awaiting your confirmation</span>}
              </div>
              <div className={`rounded-xl px-3 py-2 ${otherConfirmed ? 'bg-green-500/15 text-green-400' : 'bg-white/5 text-cream-200/50'}`}>
                {otherConfirmed ? <span>✓ {other.display_name} confirmed</span> : <span>Awaiting {other.display_name}</span>}
              </div>
            </div>
            {!myConfirmed && (
              <div className="flex gap-2 mt-3">
                <button onClick={confirm} disabled={confirming} className="btn-primary flex-1 py-2 text-xs">
                  {confirming ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <><CheckCheck className="h-3.5 w-3.5" /> Confirm Completion</>}
                </button>
                <button onClick={cancel} className="btn-ghost flex-1 py-2 text-xs text-red-400 hover:text-red-300">
                  <XCircle className="h-3.5 w-3.5" /> Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Settled banner */}
        {settled && (
          <div className={`flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium ${
            liveMatch.status === 'completed' ? 'bg-green-500/15 text-green-400' : 'bg-red-500/10 text-red-400'
          }`}>
            {liveMatch.status === 'completed'
              ? <><CheckCheck className="h-4 w-4" /> Session complete — credits transferred.</>
              : <><XCircle className="h-4 w-4" /> Session cancelled — escrow released.</>}
          </div>
        )}

        {/* Messages */}
        <div ref={scrollRef} className="flex max-h-72 flex-col gap-2 overflow-y-auto pr-1">
          {loading && <div className="flex justify-center py-8"><Spinner /></div>}
          {!loading && messages.length === 0 && (
            <p className="py-8 text-center text-sm text-cream-200/40">No messages yet. Say hello!</p>
          )}
          {messages.map((msg) => {
            const mine = msg.sender_id === user?.id
            return (
              <motion.div key={msg.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-4 py-2 text-sm ${
                  mine ? 'rounded-br-sm bg-amber-500 text-charcoal-950 font-medium' : 'rounded-bl-sm bg-white/8 text-cream-50'
                }`} style={mine ? {} : { background: 'rgba(255,255,255,0.08)' }}>
                  {msg.content}
                </div>
              </motion.div>
            )
          })}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-white/8 pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <input
            className="input flex-1"
            placeholder={chatOpen ? 'Type a message…' : 'Chat closed'}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), send())}
            disabled={!chatOpen || sending}
          />
          <button onClick={send} disabled={!chatOpen || !body.trim() || sending}
            className="btn-primary !px-3 !py-3">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </Modal>
  )
}
