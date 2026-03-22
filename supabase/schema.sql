-- ─────────────────────────────────────────────────────────────────
-- Personal Finance App — Supabase Schema
-- Run this once in the Supabase SQL Editor (Dashboard → SQL Editor)
-- ─────────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── 1. PROFILES ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email      text NOT NULL,
  name       text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles: own row only" ON profiles FOR ALL USING (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
EXCEPTION WHEN OTHERS THEN
  -- Never block user creation even if profile insert fails
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ─── 2. STATEMENTS ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS statements (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  file_name    text NOT NULL,
  file_path    text,
  bank         text NOT NULL,
  month        text NOT NULL,
  parse_status text NOT NULL DEFAULT 'pending',
  parse_error  text,
  raw_text     text,
  tx_count     int DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE statements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "statements: own rows" ON statements FOR ALL USING (auth.uid() = user_id);

-- ─── 3. TRANSACTIONS ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS transactions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  statement_id   uuid REFERENCES statements(id) ON DELETE CASCADE,
  date           date NOT NULL,
  description    text NOT NULL,
  debit          numeric(14,2),
  credit         numeric(14,2),
  balance        numeric(14,2),
  category       text NOT NULL DEFAULT 'other',
  is_recurring   boolean DEFAULT false,
  merchant_clean text,
  month          text NOT NULL,
  raw_row        jsonb,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "transactions: own rows" ON transactions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS transactions_month_idx ON transactions (user_id, month);
CREATE INDEX IF NOT EXISTS transactions_category_idx ON transactions (user_id, category);

-- ─── 4. RECURRING EXPENSES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  merchant_clean    text NOT NULL,
  avg_amount        numeric(14,2),
  min_amount        numeric(14,2),
  max_amount        numeric(14,2),
  frequency         text DEFAULT 'monthly',
  last_seen_month   text,
  first_seen_month  text,
  occurrence_count  int DEFAULT 1,
  is_confirmed      boolean DEFAULT false,
  is_dismissed      boolean DEFAULT false,
  category          text DEFAULT 'other',
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now(),
  UNIQUE (user_id, merchant_clean)
);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "recurring: own rows" ON recurring_expenses FOR ALL USING (auth.uid() = user_id);

-- ─── 5. PLANNED EXPENSES ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS planned_expenses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month         text NOT NULL,
  label         text NOT NULL,
  amount        numeric(14,2) NOT NULL,
  category      text DEFAULT 'other',
  recurring_ref uuid REFERENCES recurring_expenses(id) ON DELETE SET NULL,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE planned_expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "planned: own rows" ON planned_expenses FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS planned_month_idx ON planned_expenses (user_id, month);

-- ─── 6. CLAUDE SESSIONS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS claude_sessions (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  month            text NOT NULL,
  generated_prompt text NOT NULL,
  pasted_response  text,
  parsed_analysis  jsonb,
  status           text NOT NULL DEFAULT 'pending',
  created_at       timestamptz DEFAULT now(),
  responded_at     timestamptz
);

ALTER TABLE claude_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "sessions: own rows" ON claude_sessions FOR ALL USING (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS sessions_month_idx ON claude_sessions (user_id, month);

-- ─── STORAGE (run in Supabase Storage dashboard) ──────────────────
-- Create a private bucket named "statements"
-- Add policy: users can only access files in their own folder (user_id prefix)
