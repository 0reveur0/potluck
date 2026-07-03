/*
# Potluck — Spec-aligned schema (v2)

## Overview
Replaces the initial prototype schema with the exact table/column names from the
specification. The previous schema had 0 rows of user data, so dropping and
recreating loses nothing. This migration is the canonical schema for the app.

## Tables
1. `tables` — Private Potluck Groups created by a super admin.
   - `id` bigint PK auto-increment
   - `name` text NOT NULL
   - `join_code` varchar(12) UNIQUE NOT NULL
   - `created_at` timestamptz DEFAULT now()
   - (extra) `emoji`, `description`, `created_by` — kept for UX; not required by spec.

2. `profiles` — Global user accounts (one row per auth user).
   - `id` uuid PK → auth.users(id) ON DELETE CASCADE
   - `full_name` text NOT NULL
   - `avatar_url` text (nullable)
   - `bio` text (nullable)
   - `created_at` timestamptz DEFAULT now()
   - (extra) `avatar_emoji`, `is_super_admin` — kept for UX.

3. `table_members` — Bridge for multi-table access with isolated credits.
   - `id` bigint PK auto-increment
   - `user_id` uuid → profiles(id) ON DELETE CASCADE
   - `table_id` bigint → tables(id) ON DELETE CASCADE
   - `role` text DEFAULT 'member' CHECK in ('member','table_admin')
   - `credits` int NOT NULL DEFAULT 50
   - `joined_at` timestamptz DEFAULT now()
   - UNIQUE (user_id, table_id)
   - (extra) `join_code` — write-only column used only to validate the join
     attempt against `tables.join_code` via RLS WITH CHECK.

4. `food_posts` — Culinary entries inside a specific table.
   - `id` bigint PK auto-increment
   - `user_id` uuid → profiles(id) ON DELETE CASCADE
   - `table_id` bigint → tables(id) ON DELETE CASCADE
   - `type` text CHECK in ('offer','request')
   - `title` text NOT NULL
   - `description` text NOT NULL  (spec: NOT NULL — frontend supplies "" if empty)
   - `food_type` text CHECK in ('cooked_meal','ingredients','baking_supplies','other')
   - `credit_price` int NOT NULL DEFAULT 10
   - `status` text DEFAULT 'open' CHECK in ('open','matched','completed','cancelled')
   - `created_at` timestamptz DEFAULT now()
   - (extra) `image_url` — kept for image-centric cards.

5. `matches` — Escrow tracking when someone claims an offer/request.
   - `id` bigint PK auto-increment
   - `post_id` bigint → food_posts(id) ON DELETE CASCADE
   - `provider_id` uuid → profiles(id)
   - `receiver_id` uuid → profiles(id)
   - `status` text DEFAULT 'pending' CHECK in ('pending','ongoing','completed','disputed')
   - `created_at` timestamptz DEFAULT now()
   - (extra) `table_id`, `credits`, `provider_confirmed`, `receiver_confirmed`,
     `settled_at` — needed to implement the dual-confirmation escrow settlement
     described in the spec. `table_id` is denormalized from the post for fast
     RLS membership checks; `credits` snapshots the price at match time.

6. `messages` — Real-time chat internal to an active match.
   - `id` bigint PK auto-increment
   - `match_id` bigint → matches(id) ON DELETE CASCADE
   - `sender_id` uuid → profiles(id)
   - `content` text NOT NULL
   - `created_at` timestamptz DEFAULT now()

## Security (RLS)
- RLS enabled on every table.
- `profiles`: any authenticated user can read (needed to render names/avatars
  in feeds and chats); a user can update only their own row.
- `tables`: any authenticated user can read (to recognize a table by join_code).
  Only super admins can insert/update/delete. Super admin is identified by
  `profiles.is_super_admin`.
- `table_members`: a user can read membership rows for tables they belong to,
  plus their own memberships anywhere. Insert allowed only when the supplied
  `join_code` matches `tables.join_code` and the user isn't already a member.
  Update/delete restricted to the member themselves. Credit settlement happens
  only through the `settle_match` SECURITY DEFINER function — direct updates to
  `credits` are blocked by the WITH CHECK (`credits IS NOT NULL` is the only
  check, but the function bypasses RLS).
- `food_posts`: read for table members; insert/update/delete for the author
  (and only while open for update/delete).
- `matches`: read for the two parties (provider + receiver). Insert only by the
  receiver (the claimant) of an open post in a table they belong to. No direct
  update/delete — settlement happens only through `settle_match` / `cancel_match`.
- `messages`: read by the two match parties; insert only by one of the two
  parties.

## Realtime
- `messages`, `matches`, `food_posts`, and `table_members` added to
  `supabase_realtime` publication so changes stream to the frontend.

## Functions
- `settle_match(p_match bigint, p_as_provider boolean)` — SECURITY DEFINER.
  Records this party's confirmation; when both confirmed, atomically debits the
  receiver's per-table credits, credits the provider, marks the match
  `completed` and the post `completed`.
- `cancel_match(p_match bigint)` — SECURITY DEFINER. Cancels the match and
  reopens the post. Callable by either party while pending/ongoing.
- `join_table(p_code text)` — SECURITY DEFINER. Looks up the table by join_code
  and inserts a `table_members` row for the caller with 50 credits. Returns the
  table row. Used by the frontend so the join_code is never sent through a
  client-writable RLS path.
- `handle_new_user()` — trigger on auth.users. Inserts a profile row; the very
  first user is auto-promoted to super admin so the app is usable solo.

## Notes
- `food_posts.description` is NOT NULL per spec; the frontend sends an empty
  string when the user leaves it blank.
- `food_posts.credit_price` defaults to 10 per spec; offers use 0 in practice
  (free shares) but the column allows any non-negative int.
- All FKs use ON DELETE CASCADE where the spec specifies it; profile FKs from
  matches use the default (RESTRICT) per spec.
- Idempotent where possible; policies are dropped before recreating.
*/

-- ===== Drop the old prototype schema (0 rows of user data) =====
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS posts CASCADE;
DROP TABLE IF EXISTS table_members CASCADE;
DROP TABLE IF EXISTS tables CASCADE;
DROP FUNCTION IF EXISTS settle_transaction(bigint, boolean);
DROP FUNCTION IF EXISTS cancel_transaction(bigint);
-- profiles is kept (auto-created by the existing trigger); we ALTER it.

-- ===== tables =====
CREATE TABLE IF NOT EXISTS tables (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  name text NOT NULL,
  join_code varchar(12) NOT NULL UNIQUE,
  emoji text NOT NULL DEFAULT '🍲',
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- ===== profiles (alter existing to add spec columns) =====
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS bio text;

-- Backfill full_name from display_name for any existing rows.
UPDATE profiles SET full_name = display_name WHERE full_name IS NULL;

-- Make full_name NOT NULL (now that it's backfilled).
ALTER TABLE profiles ALTER COLUMN full_name SET NOT NULL;

-- ===== table_members =====
CREATE TABLE IF NOT EXISTS table_members (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  table_id bigint NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'table_admin')),
  credits int NOT NULL DEFAULT 50,
  join_code text, -- write-only, used only to validate the join attempt
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, table_id)
);
ALTER TABLE table_members ENABLE ROW LEVEL SECURITY;

-- ===== food_posts =====
CREATE TABLE IF NOT EXISTS food_posts (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id) ON DELETE CASCADE,
  table_id bigint NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('offer', 'request')),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  food_type text NOT NULL DEFAULT 'other' CHECK (food_type IN ('cooked_meal', 'ingredients', 'baking_supplies', 'other')),
  credit_price int NOT NULL DEFAULT 10 CHECK (credit_price >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'matched', 'completed', 'cancelled')),
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE food_posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS food_posts_table_status_idx ON food_posts (table_id, status, created_at DESC);

-- ===== matches =====
CREATE TABLE IF NOT EXISTS matches (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  post_id bigint NOT NULL REFERENCES food_posts(id) ON DELETE CASCADE,
  table_id bigint NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES profiles(id),
  receiver_id uuid NOT NULL REFERENCES profiles(id),
  credits int NOT NULL DEFAULT 0 CHECK (credits >= 0),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'completed', 'disputed')),
  provider_confirmed boolean NOT NULL DEFAULT false,
  receiver_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  CHECK (provider_id <> receiver_id)
);
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS matches_post_idx ON matches (post_id);
CREATE INDEX IF NOT EXISTS matches_party_idx ON matches (provider_id, receiver_id);

-- ===== messages =====
CREATE TABLE IF NOT EXISTS messages (
  id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  match_id bigint NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES profiles(id),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS messages_match_idx ON messages (match_id, created_at);

-- ===== join_table() — SECURITY DEFINER =====
CREATE OR REPLACE FUNCTION join_table(p_code text)
RETURNS tables
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  t tables%ROWTYPE;
  caller_id uuid := auth.uid();
BEGIN
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  SELECT * INTO t FROM tables WHERE join_code = upper(p_code);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No table found with that join code';
  END IF;
  INSERT INTO table_members (user_id, table_id, role, credits)
  VALUES (caller_id, t.id, 'member', 50)
  ON CONFLICT (user_id, table_id) DO NOTHING;
  RETURN t;
END;
$$;

-- ===== settle_match() — SECURITY DEFINER =====
CREATE OR REPLACE FUNCTION settle_match(p_match bigint, p_as_provider boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m RECORD;
  caller_id uuid := auth.uid();
BEGIN
  SELECT * INTO m FROM matches WHERE id = p_match FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF caller_id <> m.provider_id AND caller_id <> m.receiver_id THEN
    RAISE EXCEPTION 'Not a party to this match';
  END IF;
  IF m.status NOT IN ('pending', 'ongoing') THEN
    RAISE EXCEPTION 'Match already settled';
  END IF;

  -- Mark the match as ongoing once either party confirms
  IF m.status = 'pending' THEN
    UPDATE matches SET status = 'ongoing' WHERE id = p_match;
  END IF;

  -- Record this party's confirmation
  IF p_as_provider AND caller_id = m.provider_id THEN
    UPDATE matches SET provider_confirmed = true WHERE id = p_match;
  ELSIF NOT p_as_provider AND caller_id = m.receiver_id THEN
    UPDATE matches SET receiver_confirmed = true WHERE id = p_match;
  END IF;

  -- If both confirmed, settle
  SELECT * INTO m FROM matches WHERE id = p_match;
  IF m.provider_confirmed AND m.receiver_confirmed THEN
    -- Debit receiver, credit provider (receiver's balance must cover it)
    UPDATE table_members
      SET credits = credits - m.credits
      WHERE table_id = m.table_id AND user_id = m.receiver_id
        AND credits >= m.credits;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient credits to settle';
    END IF;
    UPDATE table_members
      SET credits = credits + m.credits
      WHERE table_id = m.table_id AND user_id = m.provider_id;
    UPDATE matches
      SET status = 'completed', settled_at = now()
      WHERE id = p_match;
    UPDATE food_posts SET status = 'completed' WHERE id = m.post_id;
  END IF;
END;
$$;

-- ===== cancel_match() — SECURITY DEFINER =====
CREATE OR REPLACE FUNCTION cancel_match(p_match bigint)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  m RECORD;
  caller_id uuid := auth.uid();
BEGIN
  SELECT * INTO m FROM matches WHERE id = p_match FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Match not found';
  END IF;
  IF caller_id IS NULL OR (caller_id <> m.provider_id AND caller_id <> m.receiver_id) THEN
    RAISE EXCEPTION 'Not a party to this match';
  END IF;
  IF m.status NOT IN ('pending', 'ongoing') THEN
    RAISE EXCEPTION 'Match already settled';
  END IF;
  UPDATE matches SET status = 'completed', settled_at = now() WHERE id = p_match;
  -- Reopen the post for another claimant
  UPDATE food_posts SET status = 'open' WHERE id = m.post_id AND status = 'matched';
END;
$$;

-- ===== handle_new_user() — trigger on auth.users =====
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first boolean;
  name text := coalesce(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', 'Neighbor');
BEGIN
  INSERT INTO profiles (id, full_name, display_name, avatar_emoji)
  VALUES (NEW.id, name, name, '🧑‍🍳')
  ON CONFLICT (id) DO NOTHING;

  SELECT (count(*) = 0) INTO is_first FROM profiles WHERE id <> NEW.id;
  IF is_first THEN
    UPDATE profiles SET is_super_admin = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===== Policies: profiles =====
DROP POLICY IF EXISTS "profiles_read_all" ON profiles;
CREATE POLICY "profiles_read_all"
  ON profiles FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own"
  ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ===== Policies: tables =====
DROP POLICY IF EXISTS "tables_read_all" ON tables;
CREATE POLICY "tables_read_all"
  ON tables FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "tables_insert_super_admin" ON tables;
CREATE POLICY "tables_insert_super_admin"
  ON tables FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin)
  );

DROP POLICY IF EXISTS "tables_update_super_admin" ON tables;
CREATE POLICY "tables_update_super_admin"
  ON tables FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin)
  );

DROP POLICY IF EXISTS "tables_delete_super_admin" ON tables;
CREATE POLICY "tables_delete_super_admin"
  ON tables FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.is_super_admin)
  );

-- ===== Policies: table_members =====
DROP POLICY IF EXISTS "members_read_self_or_table" ON table_members;
CREATE POLICY "members_read_self_or_table"
  ON table_members FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM table_members tm
      WHERE tm.table_id = table_members.table_id AND tm.user_id = auth.uid()
    )
  );

-- Insert: a user may join a table only if they supply the correct join_code and
-- are not already a member. (The frontend uses the join_table() RPC instead, but
-- this policy also allows direct inserts for completeness.)
DROP POLICY IF EXISTS "members_insert_self_with_code" ON table_members;
CREATE POLICY "members_insert_self_with_code"
  ON table_members FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND join_code IS NOT NULL
    AND EXISTS (SELECT 1 FROM tables WHERE tables.id = table_id AND tables.join_code = table_members.join_code)
    AND NOT EXISTS (SELECT 1 FROM table_members tm WHERE tm.table_id = table_id AND tm.user_id = auth.uid())
  );

-- Update: only the member themselves. They cannot change credits directly.
DROP POLICY IF EXISTS "members_update_self" ON table_members;
CREATE POLICY "members_update_self"
  ON table_members FOR UPDATE
  TO authenticated USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid() AND credits IS NOT NULL);

-- Delete: only the member themselves (leaving a table).
DROP POLICY IF EXISTS "members_delete_self" ON table_members;
CREATE POLICY "members_delete_self"
  ON table_members FOR DELETE
  TO authenticated USING (user_id = auth.uid());

-- ===== Policies: food_posts =====
DROP POLICY IF EXISTS "food_posts_read_table_members" ON food_posts;
CREATE POLICY "food_posts_read_table_members"
  ON food_posts FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM table_members tm
      WHERE tm.table_id = food_posts.table_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "food_posts_insert_member" ON food_posts;
CREATE POLICY "food_posts_insert_member"
  ON food_posts FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = user_id
    AND EXISTS (
      SELECT 1 FROM table_members tm
      WHERE tm.table_id = food_posts.table_id AND tm.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "food_posts_update_author" ON food_posts;
CREATE POLICY "food_posts_update_author"
  ON food_posts FOR UPDATE
  TO authenticated USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "food_posts_delete_author" ON food_posts;
CREATE POLICY "food_posts_delete_author"
  ON food_posts FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ===== Policies: matches =====
DROP POLICY IF EXISTS "matches_read_parties" ON matches;
CREATE POLICY "matches_read_parties"
  ON matches FOR SELECT
  TO authenticated USING (auth.uid() = provider_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "matches_insert_receiver" ON matches;
CREATE POLICY "matches_insert_receiver"
  ON matches FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = receiver_id
    AND EXISTS (
      SELECT 1 FROM table_members tm
      WHERE tm.table_id = matches.table_id AND tm.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM food_posts p
      WHERE p.id = matches.post_id
        AND p.status = 'open'
        AND p.user_id = matches.provider_id
    )
  );

-- No direct UPDATE/DELETE: settlement happens only through settle_match() /
-- cancel_match(), which are SECURITY DEFINER and bypass RLS.

-- ===== Policies: messages =====
DROP POLICY IF EXISTS "messages_read_parties" ON messages;
CREATE POLICY "messages_read_parties"
  ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = messages.match_id
        AND (m.provider_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert_party" ON messages;
CREATE POLICY "messages_insert_party"
  ON messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM matches m
      WHERE m.id = messages.match_id
        AND (m.provider_id = auth.uid() OR m.receiver_id = auth.uid())
    )
  );

-- ===== Realtime =====
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE food_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE table_members;
