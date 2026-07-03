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
  full_name: string
  avatar_url: string | null
  bio: string | null
  // UX extras (kept from v1)
  display_name: string
  avatar_emoji: string
  is_super_admin: boolean
  created_at: string
}

export type PotluckTable = {
  id: number
  name: string
  join_code: string
  emoji: string
  description: string | null
  created_by: string | null
  created_at: string
}

export type TableMember = {
  id: number
  user_id: string
  table_id: number
  role: 'member' | 'table_admin'
  credits: number
  joined_at: string
}

export type PostType = 'offer' | 'request'
export type FoodType = 'cooked_meal' | 'ingredients' | 'baking_supplies' | 'other'
export type StudySubject = 'Math' | 'Physics' | 'Chemistry' | 'English' | 'Programming' | 'Other' | string
export type PostStatus = 'open' | 'matched' | 'completed' | 'cancelled'

export type StudyPost = {
  id: number
  user_id: string
  table_id: number
  type: PostType
  title: string
  description: string
  subject: StudySubject
  credit_price: number
  status: PostStatus
  image_url: string | null
  food_type: FoodType
  created_at: string
}

export type FoodPost = StudyPost

export type MatchStatus = 'pending' | 'ongoing' | 'completed' | 'disputed'

export type Match = {
  id: number
  post_id: number
  table_id: number
  provider_id: string
  receiver_id: string
  credits: number
  status: MatchStatus
  provider_confirmed: boolean
  receiver_confirmed: boolean
  created_at: string
  settled_at: string | null
}

export type Message = {
  id: number
  match_id: number
  sender_id: string
  content: string
  created_at: string
}
