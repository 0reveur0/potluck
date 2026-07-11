-- Potluck schema for Replit's built-in PostgreSQL.
-- Matches the queries used in app/api/**; run once against a fresh database.
-- (The old supabase/migrations/*.sql files are leftover from the pre-migration
-- Supabase setup and reference auth.users / RLS features that don't apply here.)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ===== profiles =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  full_name text NOT NULL DEFAULT '',
  display_name text NOT NULL DEFAULT 'Neighbor',
  avatar_emoji text NOT NULL DEFAULT '🧑‍🍳',
  avatar_url text,
  bio text,
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== tables (Potluck Tables / clans) =====
CREATE TABLE IF NOT EXISTS tables (
  id serial PRIMARY KEY,
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🍲',
  join_code text NOT NULL UNIQUE,
  description text,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ===== table_members =====
CREATE TABLE IF NOT EXISTS table_members (
  id serial PRIMARY KEY,
  table_id integer NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  credits integer NOT NULL DEFAULT 50,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_id, user_id)
);

-- ===== study_posts =====
CREATE TABLE IF NOT EXISTS study_posts (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  table_id integer NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('offer_to_teach', 'request_to_learn')),
  title text NOT NULL,
  description text,
  subject text NOT NULL DEFAULT 'Other',
  credit_price integer NOT NULL CHECK (credit_price >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_posts_table_status_idx ON study_posts (table_id, status, created_at DESC);

-- ===== matches (escrow) =====
CREATE TABLE IF NOT EXISTS matches (
  id serial PRIMARY KEY,
  post_id integer NOT NULL REFERENCES study_posts(id) ON DELETE CASCADE,
  table_id integer NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits >= 0),
  status text NOT NULL DEFAULT 'ongoing' CHECK (status IN ('pending', 'ongoing', 'completed', 'cancelled')),
  provider_confirmed boolean NOT NULL DEFAULT false,
  receiver_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  CHECK (provider_id <> receiver_id)
);
CREATE INDEX IF NOT EXISTS matches_post_idx ON matches (post_id);
CREATE INDEX IF NOT EXISTS matches_party_idx ON matches (provider_id, receiver_id);

-- ===== messages =====
CREATE TABLE IF NOT EXISTS messages (
  id serial PRIMARY KEY,
  match_id integer NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_match_idx ON messages (match_id, created_at);
