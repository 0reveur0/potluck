import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.error('Missing Supabase env vars. Check .env')
}

export const supabase = createClient(url, anon, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: { params: { eventsPerSecond: 10 } },
})

export type Profile = {
  id: string
  display_name: string
  avatar_emoji: string
  is_super_admin: boolean
  created_at: string
}

export type PotluckTable = {
  id: string
  name: string
  emoji: string
  join_code: string
  description: string | null
  created_by: string | null
  created_at: string
}

export type TableMember = {
  id: string
  table_id: string
  user_id: string
  credits: number
  joined_at: string
}

export type PostKind = 'offer' | 'request'
export type PostCategory = 'dish' | 'groceries' | 'help'
export type PostStatus = 'open' | 'claimed' | 'completed' | 'cancelled'

export type Post = {
  id: string
  table_id: string
  author_id: string
  kind: PostKind
  category: PostCategory
  title: string
  description: string | null
  image_url: string | null
  credits: number
  status: PostStatus
  created_at: string
}

export type TxnStatus = 'escrow_held' | 'completed' | 'cancelled'

export type Transaction = {
  id: string
  post_id: string
  table_id: string
  provider_id: string
  consumer_id: string
  credits: number
  status: TxnStatus
  provider_confirmed: boolean
  consumer_confirmed: boolean
  created_at: string
  settled_at: string | null
}

export type Message = {
  id: string
  transaction_id: string
  sender_id: string
  body: string
  created_at: string
}
