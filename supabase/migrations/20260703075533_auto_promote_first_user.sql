/*
# Auto-promote the first user to super admin

## Why
The spec says only the platform owner can create Potluck Tables, but there is
no separate "owner" account in this single-tenant demo. To make the app fully
functional out of the box (so a brand-new visitor can immediately create a
table and try the flow), the very first user to sign up is automatically
promoted to `is_super_admin = true`. Every subsequent user remains a regular
member who must join tables via a join code.

## Changes
- Replaces the `handle_new_user` trigger function so that, after inserting the
  profile, it checks whether the new profile is the only one in the table. If
  so, it sets `is_super_admin = true` on that row.
- The trigger itself is unchanged (already attached to `auth.users`).

## Security
- This is a one-time, idempotent bootstrap. Once any second user exists, no
  further auto-promotion occurs. The platform owner can later demote the first
  user or promote others via SQL if desired.
- The function is SECURITY DEFINER so it can write to `profiles` regardless of
  the caller's RLS context (the trigger runs as the new user, who cannot yet
  read/write other profiles).
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first boolean;
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, coalesce(NEW.raw_user_meta_data->>'display_name', 'Neighbor'))
  ON CONFLICT (id) DO NOTHING;

  SELECT (count(*) = 0) INTO is_first FROM profiles WHERE id <> NEW.id;
  IF is_first THEN
    UPDATE profiles SET is_super_admin = true WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
