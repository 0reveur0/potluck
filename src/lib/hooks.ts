import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import { useAuth } from './auth'
import type { Match, StudyPost, TableWithMember } from './types'

// ── useJoinedTables ───────────────────────────────────────────────────────────

export type { TableWithMember }

export function useJoinedTables() {
  const { user } = useAuth()
  const [tables, setTables] = useState<TableWithMember[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) { setTables([]); setLoading(false); return }
    try {
      const data = await api.get<TableWithMember[]>('/api/clans')
      setTables(data)
    } catch {
      setTables([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
    if (!user) return
    // Poll every 8s for new clan memberships
    const id = setInterval(refresh, 8_000)
    return () => clearInterval(id)
  }, [user, refresh])

  return { tables, loading, refresh }
}

// ── useTablePosts ─────────────────────────────────────────────────────────────

export function useTablePosts(tableId: number | null) {
  const { user } = useAuth()
  const [posts, setPosts] = useState<StudyPost[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user || !tableId) { setPosts([]); setLoading(false); return }
    try {
      const data = await api.get<StudyPost[]>(`/api/posts?table_id=${tableId}`)
      setPosts(data)
    } catch {
      setPosts([])
    } finally {
      setLoading(false)
    }
  }, [user, tableId])

  useEffect(() => {
    setLoading(true)
    refresh()
    if (!user || !tableId) return
    // Poll every 4s for new posts
    const id = setInterval(refresh, 4_000)
    return () => clearInterval(id)
  }, [user, tableId, refresh])

  return { posts, loading, refresh }
}

// ── useMyMatches ──────────────────────────────────────────────────────────────

export function useMyMatches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    if (!user) { setMatches([]); setLoading(false); return }
    try {
      const data = await api.get<Match[]>('/api/matches')
      setMatches(data)
    } catch {
      setMatches([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    refresh()
    if (!user) return
    // Poll every 4s for match status updates
    const id = setInterval(refresh, 4_000)
    return () => clearInterval(id)
  }, [user, refresh])

  return { matches, loading, refresh }
}

// ── useChatPoll ───────────────────────────────────────────────────────────────
// 2-second short-polling for messages + match state inside ChatModal.

export function useChatPoll(matchId: number | null, open: boolean) {
  const [messages, setMessages] = useState<import('./types').Message[]>([])
  const [match, setMatch] = useState<Match | null>(null)
  const [loading, setLoading] = useState(true)
  const lastIdRef = useRef(0)

  const poll = useCallback(async () => {
    if (!matchId) return
    try {
      const data = await api.get<{ messages: import('./types').Message[]; match: Match }>(
        `/api/chat/${matchId}/poll?since=${lastIdRef.current}`
      )
      if (data.messages.length > 0) {
        const newMax = Math.max(...data.messages.map((m) => m.id))
        lastIdRef.current = newMax
        setMessages((prev) => {
          // Deduplicate by id
          const ids = new Set(prev.map((m) => m.id))
          const fresh = data.messages.filter((m) => !ids.has(m.id))
          return fresh.length ? [...prev, ...fresh] : prev
        })
      }
      setMatch(data.match)
      setLoading(false)
    } catch {
      // silently ignore poll errors
    }
  }, [matchId])

  // Reset when match changes or modal opens
  useEffect(() => {
    if (!open || !matchId) return
    lastIdRef.current = 0
    setMessages([])
    setMatch(null)
    setLoading(true)
    poll() // immediate first fetch
  }, [matchId, open, poll])

  // Interval polling
  useEffect(() => {
    if (!open || !matchId) return
    const id = setInterval(poll, 2_000)
    return () => clearInterval(id)
  }, [open, matchId, poll])

  return { messages, match, loading }
}
