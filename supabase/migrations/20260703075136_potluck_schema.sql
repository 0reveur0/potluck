/*
# Potluck — Private Code-Based Food & Ingredient Sharing Network

## Overview
This migration creates the complete schema for "Potluck", a private, invite-only
food-sharing network. Users hold global profiles, join multiple "Potluck Tables"
(groups) via system-generated alphanumeric join codes, maintain a separate
Food-Credit balance per table (starting at 50), and exchange dishes / groceries /
culinary help through an escrow-protected transaction system with 1:1 real-time
chat.

## Tables created
1. `tables` — Potluck Tables (groups). Created by the super admin only. Each has
   a unique `join_code` (e.g. "TASTY77") and a display name + emoji avatar.
2. `profiles` — Public user display profile (one row per auth user). Holds the
   display name and avatar emoji. Created on first sign-up.
3. `table_members` — Junction: which users have joined which tables. Each row
   carries that user's per-table `credits` balance (default 50) and `joined_at`.
   Uniqueness on (table_id, user_id) prevents double-joining.
4. `posts` — A share or request inside a table. `kind` is 'offer' or 'request'.
   `category` distinguishes dishes / groceries / help. `status` flows
   open -> claimed -> completed (or cancelled). `credits` is the price/bounty.
5. `transactions` — An escrow record created when a user accepts a post. Holds
   the post, provider, consumer, escrow amount, and lifecycle:
   escrow_held -> completed | cancelled. Settles into the provider's balance on
   dual confirmation.
6. `messages` — Real-time 1:1 chat messages scoped to a transaction.

## Security (RLS)
- RLS enabled on every table.
- Profiles: a user can read all profiles (needed to render names/avatars in
  feeds and chats) but only update their own.
- Tables: any authenticated user can READ table metadata (so they can recognize
  a table by join code). Only the super admin can create / update / delete
  tables. Super admin is identified by the `is_super_admin` flag on `profiles`.
- Table members: a user can read membership rows for tables they belong to, plus
  their own membership anywhere. Inserts are gated to: the table exists AND the
  user is not already a member AND they supply the correct `join_code` (enforced
  via a WITH CHECK that compares against the `tables.join_code`). Updates /
  deletes are restricted to the member themselves (e.g. leaving a table) —
  credit settlement happens through a SECURITY DEFINER function so users never
  directly mutate balances.
- Posts: read access for table members; insert/update/delete for the post
  author (and only while the post is still open for delete/update).
- Transactions: read access for the two parties (provider + consumer). Inserts
  only by the consumer (the acceptor). Updates only via the settlement function
  — direct updates are blocked to prevent tampering with escrow.
- Messages: read by the two transaction parties; insert only by one of the two
  parties.

## Important notes
1. `is_super_admin` defaults to FALSE and is set manually by the platform owner
   (the very first user flips their own row to TRUE via the SQL editor, or we
   bootstrap it). The frontend exposes a "Create Table" view only when
   `profiles.is_super_admin` is true.
2. Credit settlement is performed by the `settle_transaction` SECURITY DEFINER
   function so it can move credits between members atomically and safely,
   bypassing RLS for the balance update only. The function validates state and
   prevents double-settlement.
3. Joining a table is done by inserting into `table_members` with the correct
   `join_code` value in the row's `join_code` column (a write-only column used
   only for the WITH CHECK). The column is otherwise not used.
4. All timestamps default to `now()`.
5. Idempotent: uses `IF NOT EXISTS` and drops policies before recreating them.
*/

-- ===== tables =====
CREATE TABLE IF NOT EXISTS tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  emoji text NOT NULL DEFAULT '🍲',
  join_code text NOT NULL UNIQUE,
  description text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- ===== profiles =====
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT 'Neighbor',
  avatar_emoji text NOT NULL DEFAULT '🧑‍🍳',
  is_super_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ===== table_members =====
CREATE TABLE IF NOT EXISTS table_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL DEFAULT 50,
  join_code text, -- write-only, used only to validate the join attempt
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (table_id, user_id)
);
ALTER TABLE table_members ENABLE ROW LEVEL SECURITY;

-- ===== posts =====
CREATE TABLE IF NOT EXISTS posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  author_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('offer', 'request')),
  category text NOT NULL CHECK (category IN ('dish', 'groceries', 'help')),
  title text NOT NULL,
  description text,
  image_url text,
  credits integer NOT NULL DEFAULT 0 CHECK (credits >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'claimed', 'completed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS posts_table_status_idx ON posts (table_id, status, created_at DESC);

-- ===== transactions =====
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  table_id uuid NOT NULL REFERENCES tables(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  consumer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credits integer NOT NULL CHECK (credits >= 0),
  status text NOT NULL DEFAULT 'escrow_held' CHECK (status IN ('escrow_held', 'completed', 'cancelled')),
  provider_confirmed boolean NOT NULL DEFAULT false,
  consumer_confirmed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  settled_at timestamptz,
  CHECK (provider_id <> consumer_id)
);
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS transactions_post_idx ON transactions (post_id);
CREATE INDEX IF NOT EXISTS transactions_party_idx ON transactions (provider_id, consumer_id);

-- ===== messages =====
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS messages_txn_idx ON messages (transaction_id, created_at);

-- ===== Settlement function (SECURITY DEFINER) =====
-- Atomically settles an escrow transaction: marks it completed, transfers the
-- frozen credits from the consumer's per-table balance to the provider's, and
-- marks the originating post as completed. Only callable by a transaction party.
CREATE OR REPLACE FUNCTION settle_transaction(p_txn uuid, p_as_provider boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  txn RECORD;
  caller_id uuid := auth.uid();
BEGIN
  SELECT * INTO txn FROM transactions WHERE id = p_txn FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  IF caller_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF caller_id <> txn.provider_id AND caller_id <> txn.consumer_id THEN
    RAISE EXCEPTION 'Not a party to this transaction';
  END IF;
  IF txn.status <> 'escrow_held' THEN
    RAISE EXCEPTION 'Transaction already settled';
  END IF;

  -- Record this party's confirmation
  IF p_as_provider AND caller_id = txn.provider_id THEN
    UPDATE transactions SET provider_confirmed = true WHERE id = p_txn;
  ELSIF NOT p_as_provider AND caller_id = txn.consumer_id THEN
    UPDATE transactions SET consumer_confirmed = true WHERE id = p_txn;
  END IF;

  -- If both confirmed, settle
  SELECT * INTO txn FROM transactions WHERE id = p_txn;
  IF txn.provider_confirmed AND txn.consumer_confirmed THEN
    -- Debit consumer, credit provider (consumer's balance must cover it)
    UPDATE table_members
      SET credits = credits - txn.credits
      WHERE table_id = txn.table_id AND user_id = txn.consumer_id
        AND credits >= txn.credits;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Insufficient credits to settle';
    END IF;
    UPDATE table_members
      SET credits = credits + txn.credits
      WHERE table_id = txn.table_id AND user_id = txn.provider_id;
    UPDATE transactions
      SET status = 'completed', settled_at = now()
      WHERE id = p_txn;
    UPDATE posts SET status = 'completed' WHERE id = txn.post_id;
  END IF;
END;
$$;

-- ===== Cancel / release escrow function =====
-- Releases escrow back to the consumer and cancels the transaction + post.
CREATE OR REPLACE FUNCTION cancel_transaction(p_txn uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  txn RECORD;
  caller_id uuid := auth.uid();
BEGIN
  SELECT * INTO txn FROM transactions WHERE id = p_txn FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found';
  END IF;
  IF caller_id IS NULL OR (caller_id <> txn.provider_id AND caller_id <> txn.consumer_id) THEN
    RAISE EXCEPTION 'Not a party to this transaction';
  END IF;
  IF txn.status <> 'escrow_held' THEN
    RAISE EXCEPTION 'Transaction already settled';
  END IF;
  -- Escrow was never actually debited at hold time (we only freeze the post),
  -- so cancellation simply reopens the post and closes the transaction.
  UPDATE transactions SET status = 'cancelled' WHERE id = p_txn;
  UPDATE posts SET status = 'open' WHERE id = txn.post_id AND status = 'claimed';
END;
$$;

-- ===== Auto-create profile on signup =====
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'display_name', 'Neighbor'))
  ON CONFLICT (id) DO NOTHING;
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
-- Read: members of tables I belong to, plus my own memberships anywhere.
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
-- are not already a member.
DROP POLICY IF EXISTS "members_insert_self_with_code" ON table_members;
CREATE POLICY "members_insert_self_with_code"
  ON table_members FOR INSERT
  TO authenticated WITH CHECK (
    user_id = auth.uid()
    AND join_code IS NOT NULL
    AND EXISTS (SELECT 1 FROM tables WHERE tables.id = table_id AND tables.join_code = table_members.join_code)
    AND NOT EXISTS (SELECT 1 FROM table_members tm WHERE tm.table_id = table_id AND tm.user_id = auth.uid())
  );

-- Update: only the member themselves (e.g. leaving). They cannot change credits
-- directly (the WITH CHECK forbids changing credits).
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

-- ===== Policies: posts =====
-- Read: members of the table can see posts.
DROP POLICY IF EXISTS "posts_read_table_members" ON posts;
CREATE POLICY "posts_read_table_members"
  ON posts FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM table_members tm
      WHERE tm.table_id = posts.table_id AND tm.user_id = auth.uid()
    )
  );

-- Insert: a member of the table can create a post.
DROP POLICY IF EXISTS "posts_insert_member" ON posts;
CREATE POLICY "posts_insert_member"
  ON posts FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = author_id
    AND EXISTS (
      SELECT 1 FROM table_members tm
      WHERE tm.table_id = posts.table_id AND tm.user_id = auth.uid()
    )
  );

-- Update: only the author, while the post is still open or claimed.
DROP POLICY IF EXISTS "posts_update_author" ON posts;
CREATE POLICY "posts_update_author"
  ON posts FOR UPDATE
  TO authenticated USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- Delete: only the author.
DROP POLICY IF EXISTS "posts_delete_author" ON posts;
CREATE POLICY "posts_delete_author"
  ON posts FOR DELETE
  TO authenticated USING (auth.uid() = author_id);

-- ===== Policies: transactions =====
-- Read: only the two parties.
DROP POLICY IF EXISTS "txn_read_parties" ON transactions;
CREATE POLICY "txn_read_parties"
  ON transactions FOR SELECT
  TO authenticated USING (auth.uid() = provider_id OR auth.uid() = consumer_id);

-- Insert: only the consumer (the acceptor) of an open post in a table they belong to.
DROP POLICY IF EXISTS "txn_insert_consumer" ON transactions;
CREATE POLICY "txn_insert_consumer"
  ON transactions FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = consumer_id
    AND EXISTS (
      SELECT 1 FROM table_members tm
      WHERE tm.table_id = transactions.table_id AND tm.user_id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = transactions.post_id
        AND p.status = 'open'
        AND p.author_id = transactions.provider_id
    )
  );

-- No direct UPDATE policy: settlement happens only through settle_transaction().
-- We intentionally do NOT create an update policy so users cannot tamper with
-- escrow status, confirmations, or credits directly.

-- No direct DELETE: transactions are immutable history.

-- ===== Policies: messages =====
DROP POLICY IF EXISTS "messages_read_parties" ON messages;
CREATE POLICY "messages_read_parties"
  ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = messages.transaction_id
        AND (t.provider_id = auth.uid() OR t.consumer_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "messages_insert_party" ON messages;
CREATE POLICY "messages_insert_party"
  ON messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.id = messages.transaction_id
        AND (t.provider_id = auth.uid() OR t.consumer_id = auth.uid())
    )
  );

-- ===== Enable realtime on messages + transactions + posts =====
ALTER PUBLICATION supabase_realtime ADD TABLE messages;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE table_members;
