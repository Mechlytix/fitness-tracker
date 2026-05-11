-- ──────────────────────────────────────────────
-- User Profile (body stats for AI)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profile (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  weight_kg       NUMERIC(6,2),
  height_cm       NUMERIC(6,2),
  age             INTEGER,
  sex             TEXT CHECK (sex IN ('male', 'female')),
  activity_level  NUMERIC(4,3) DEFAULT 1.55,
  goal            TEXT CHECK (goal IN ('lose', 'maintain', 'gain')) DEFAULT 'maintain',
  onboarded       BOOLEAN DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own profile" ON user_profile
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- Weight Log (manual weight entries)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS weight_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  weight_kg   NUMERIC(6,2) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS weight_log_user_date_idx ON weight_log (user_id, log_date);

ALTER TABLE weight_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own weight log" ON weight_log
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
