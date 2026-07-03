import { useEffect, useState } from 'react'
import { supabase, type PotluckTable, type TableMember, type Post, type Profile } from './supabase'
import { useAuth } from './auth'

export type TableWithMember = PotluckTable & { member: TableMember }

export function useJoinedTables() {
  const { user } = useAuth()
  const [tables, setTables] = useState<TableWithMember[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!user) { setTables([]); setLoading(false); return }
    const { data, error } = await supabase
      .from('table_members')
      .select('id, table_id, credits, joined_at, tables!inner(id, name, emoji, join_code, description, created_by, created_at)')
      .eq('user_id', user.id)
      .order('joined_at', { ascending: false })
    if (error) {
      // eslint-disable-next-line no-console
      console.error('joined tables', error)
      setLoading(false)
      return
    }
    const rows = (data ?? []).map((r: any) => ({
      ...r.tables,
      member: { id: r.id, table_id: r.table_id, user_id: user.id, credits: r.credits, joined_at: r.joined_at },
    }))
    setTables(rows)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    if (!user) return
    const channel = supabase
      .channel(`members-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'table_members', filter: `user_id=eq.${user.id}` }, () => refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return { tables, loading, refresh }
}

export function useTablePosts(tableId: string | null) {
  const [posts, setPosts] = useState<(Post & { author: Profile })[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!tableId) { setPosts([]); setLoading(false); return }
    const { data, error } = await supabase
      .from('posts')
      .select('*, author:profiles!posts_author_id_fkey(id, display_name, avatar_emoji, is_super_admin)')
      .eq('table_id', tableId)
      .order('created_at', { ascending: false })
    if (error) {
      // eslint-disable-next-line no-console
      console.error('posts', error)
      setLoading(false)
      return
    }
    setPosts((data ?? []) as any)
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    if (!tableId) return
    const channel = supabase
      .channel(`posts-${tableId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts', filter: `table_id=eq.${tableId}` }, () => refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId])

  return { posts, loading, refresh }
}

export function useMyTransactions() {
  const { user } = useAuth()
  const [txns, setTxns] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!user) { setTxns([]); setLoading(false); return }
    const { data, error } = await supabase
      .from('transactions')
      .select('*, post:posts(*), other:profiles!transactions_provider_id_fkey(id, display_name, avatar_emoji)')
      .or(`provider_id.eq.${user.id},consumer_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    if (error) {
      // eslint-disable-next-line no-console
      console.error('txns', error)
      setLoading(false)
      return
    }
    setTxns(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    if (!user) return
    const channel = supabase
      .channel(`txns-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return { txns, loading, refresh }
}
