-- ──────────────────────────────────────────────────────────────────────────────
-- Enable Row Level Security on all user-data tables.
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query).
-- ──────────────────────────────────────────────────────────────────────────────


-- ── plays ─────────────────────────────────────────────────────────────────────
ALTER TABLE plays ENABLE ROW LEVEL SECURITY;

-- Drop any stale policies before recreating
DROP POLICY IF EXISTS "plays_owner" ON plays;

-- Users can only see, create, update, and delete their own plays
CREATE POLICY "plays_owner" ON plays
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── signal_assignments ────────────────────────────────────────────────────────
ALTER TABLE signal_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "signals_owner" ON signal_assignments;

CREATE POLICY "signals_owner" ON signal_assignments
  FOR ALL
  USING  (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);


-- ── profiles ──────────────────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_owner" ON profiles;

-- The profiles.id column equals auth.uid() (set at insert time)
CREATE POLICY "profiles_owner" ON profiles
  FOR ALL
  USING  (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
