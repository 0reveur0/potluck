import { useEffect, useState } from 'react'
import { supabase, type PotluckTable, type TableMember, type FoodPost, type Profile } from './supabase'
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
      .select('id, table_id, user_id, role, credits, joined_at, tables!inner(id, name, join_code, emoji, description, created_by, created_at)')
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
      member: { id: r.id, table_id: r.table_id, user_id: r.user_id, role: r.role, credits: r.credits, joined_at: r.joined_at },
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

export function useTablePosts(tableId: number | null) {
  const [posts, setPosts] = useState<(FoodPost & { author: Profile })[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!tableId) { setPosts([]); setLoading(false); return }
    const { data, error } = await supabase
      .from('food_posts')
      .select('*, author:profiles!food_posts_user_id_fkey(id, full_name, avatar_url, avatar_emoji, is_super_admin)')
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'food_posts', filter: `table_id=eq.${tableId}` }, () => refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableId])

  return { posts, loading, refresh }
}

export function useMyMatches() {
  const { user } = useAuth()
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = async () => {
    if (!user) { setMatches([]); setLoading(false); return }
    const { data, error } = await supabase
      .from('matches')
      .select('*, post:food_posts(*), other:profiles!matches_provider_id_fkey(id, full_name, avatar_url, avatar_emoji)')
      .or(`provider_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
    if (error) {
      // eslint-disable-next-line no-console
      console.error('matches', error)
      setLoading(false)
      return
    }
    setMatches(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    if (!user) return
    const channel = supabase
      .channel(`matches-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, () => refresh())
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  return { matches, loading, refresh }
}
