// Canonical types for the self-hosted Potluck backend.
// All field names are snake_case, matching PostgreSQL column names directly.

export type PostType    = 'offer_to_teach' | 'request_to_learn'
export type PostStatus  = 'open' | 'matched' | 'completed' | 'cancelled'
export type MatchStatus = 'pending' | 'ongoing' | 'completed' | 'cancelled'
export type MemberRole  = 'member' | 'table_admin'

export interface SessionUser {
  id: string
  email: string
  displayName: string
  avatarEmoji: string
  isAdmin: boolean
}

export interface Profile {
  id: string
  email: string
  full_name: string
  display_name: string
  avatar_emoji: string
  avatar_url: string | null
  bio: string | null
  is_super_admin: boolean
  created_at: string
}

export interface PotluckTable {
  id: number
  name: string
  join_code: string
  emoji: string
  description: string | null
  created_at: string
}

export interface TableMember {
  id: number
  user_id: string
  table_id: number
  role: MemberRole
  credits: number
  joined_at: string
}

export interface TableWithMember extends PotluckTable {
  member: TableMember
}

export interface StudyPost {
  id: number
  user_id: string
  table_id: number
  type: PostType
  title: string
  description: string
  subject: string
  credit_price: number
  status: PostStatus
  created_at: string
  author?: Profile
}

export interface Match {
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
  other?: Profile
}

export interface Message {
  id: number
  match_id: number
  sender_id: string
  content: string
  created_at: string
}
