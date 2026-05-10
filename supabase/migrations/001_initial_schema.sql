-- FitTrack Phase 1 Schema
-- Apply this in your NEW Supabase project via the SQL editor

-- ──────────────────────────────────────────────
-- Extensions
-- ──────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ──────────────────────────────────────────────
-- Profiles (extends Supabase auth.users)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name    TEXT,
  preferences     JSONB DEFAULT '{"weight_unit": "kg", "distance_unit": "km"}'::jsonb,
  withings_tokens JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ──────────────────────────────────────────────
-- Exercise Categories
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercise_categories (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE exercise_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read categories" ON exercise_categories FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert categories" ON exercise_categories
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Seed standard categories
INSERT INTO exercise_categories (name) VALUES
  ('Chest'), ('Back'), ('Shoulders'), ('Arms'), ('Legs'),
  ('Core'), ('Cardio'), ('Olympic'), ('Other')
ON CONFLICT (name) DO NOTHING;

-- ──────────────────────────────────────────────
-- Exercises
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS exercises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  category_id UUID REFERENCES exercise_categories(id),
  equipment   TEXT,
  notes       TEXT,
  is_custom   BOOLEAN NOT NULL DEFAULT FALSE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS exercises_name_idx ON exercises (lower(name));
CREATE INDEX IF NOT EXISTS exercises_category_idx ON exercises (category_id);

ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
-- Shared exercises (no user_id) are visible to all authenticated users
CREATE POLICY "View shared exercises" ON exercises
  FOR SELECT USING (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "Create own exercises" ON exercises
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);
CREATE POLICY "Update own exercises" ON exercises
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Delete own exercises" ON exercises
  FOR DELETE USING (user_id = auth.uid());

-- ──────────────────────────────────────────────
-- Workouts
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workouts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_date     DATE NOT NULL,
  notes            TEXT,
  duration_seconds INT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workouts_user_date_idx ON workouts (user_id, workout_date DESC);

ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own workouts" ON workouts
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- Workout Sets
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_sets (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id    UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id   UUID NOT NULL REFERENCES exercises(id),
  set_order     INT NOT NULL DEFAULT 0,
  weight_kg     NUMERIC(7, 2),
  reps          INT,
  distance      NUMERIC(7, 2),
  distance_unit TEXT,
  time_seconds  INT,
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workout_sets_workout_idx ON workout_sets (workout_id, set_order);
CREATE INDEX IF NOT EXISTS workout_sets_exercise_idx ON workout_sets (exercise_id);

ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
-- Inherit security from the workout
CREATE POLICY "Users can CRUD own workout sets" ON workout_sets
  USING (
    EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid())
  );

-- ──────────────────────────────────────────────
-- Body Measurements
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS body_measurements (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  measured_at     TIMESTAMPTZ NOT NULL,
  weight_kg       NUMERIC(6, 2),
  fat_pct         NUMERIC(5, 2),
  muscle_mass_kg  NUMERIC(6, 2),
  bone_mass_kg    NUMERIC(5, 2),
  fat_free_mass_kg NUMERIC(6, 2),
  source          TEXT NOT NULL DEFAULT 'manual',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, measured_at, source)
);

CREATE INDEX IF NOT EXISTS body_measurements_user_idx ON body_measurements (user_id, measured_at DESC);

ALTER TABLE body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own measurements" ON body_measurements
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- Foods (cache of USDA / OFF lookups)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foods (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT NOT NULL,
  brand              TEXT,
  barcode            TEXT,
  source             TEXT NOT NULL DEFAULT 'manual',
  source_id          TEXT,
  calories_per_100g  NUMERIC(8, 2),
  protein_per_100g   NUMERIC(7, 3),
  carbs_per_100g     NUMERIC(7, 3),
  fat_per_100g       NUMERIC(7, 3),
  fiber_per_100g     NUMERIC(7, 3),
  full_nutrients     JSONB,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (source, source_id)
);

CREATE INDEX IF NOT EXISTS foods_name_idx ON foods (lower(name));
CREATE INDEX IF NOT EXISTS foods_barcode_idx ON foods (barcode);

ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read foods" ON foods FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Authenticated can insert foods" ON foods FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- ──────────────────────────────────────────────
-- Food Logs (one per meal per day)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_logs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  log_date   DATE NOT NULL,
  meal_type  TEXT NOT NULL CHECK (meal_type IN ('breakfast','lunch','dinner','snack')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, log_date, meal_type)
);

CREATE INDEX IF NOT EXISTS food_logs_user_date_idx ON food_logs (user_id, log_date DESC);

ALTER TABLE food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own food logs" ON food_logs
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- Food Log Items
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_log_items (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  food_log_id         UUID NOT NULL REFERENCES food_logs(id) ON DELETE CASCADE,
  food_id             UUID NOT NULL REFERENCES foods(id),
  quantity_g          NUMERIC(8, 2) NOT NULL,
  serving_description TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS food_log_items_log_idx ON food_log_items (food_log_id);

ALTER TABLE food_log_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own food log items" ON food_log_items
  USING (
    EXISTS (SELECT 1 FROM food_logs fl WHERE fl.id = food_log_id AND fl.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM food_logs fl WHERE fl.id = food_log_id AND fl.user_id = auth.uid())
  );

-- ──────────────────────────────────────────────
-- LLM Conversations
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS llm_conversations (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_type   TEXT NOT NULL,
  messages            JSONB NOT NULL DEFAULT '[]'::jsonb,
  context_snapshot    JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS llm_conversations_user_idx ON llm_conversations (user_id, created_at DESC);

ALTER TABLE llm_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own conversations" ON llm_conversations
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
