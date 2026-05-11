-- ──────────────────────────────────────────────
-- Workout Plans (rolling weekly template)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workout_plans (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS workout_plans_user_idx ON workout_plans (user_id, is_active);

ALTER TABLE workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own plans" ON workout_plans
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- Plan Days (slots in the weekly rotation)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_days (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id     UUID NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  day_name    TEXT NOT NULL,
  day_order   INT NOT NULL DEFAULT 0,
  weekday     INT,
  notes       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plan_days_plan_idx ON plan_days (plan_id, day_order);

ALTER TABLE plan_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own plan days" ON plan_days
  USING (
    EXISTS (SELECT 1 FROM workout_plans p WHERE p.id = plan_id AND p.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workout_plans p WHERE p.id = plan_id AND p.user_id = auth.uid())
  );

-- ──────────────────────────────────────────────
-- Plan Exercises (exercises in a plan day)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_exercises (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_day_id    UUID NOT NULL REFERENCES plan_days(id) ON DELETE CASCADE,
  exercise_id    UUID NOT NULL REFERENCES exercises(id),
  exercise_order INT NOT NULL DEFAULT 0,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plan_exercises_day_idx ON plan_exercises (plan_day_id, exercise_order);

ALTER TABLE plan_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own plan exercises" ON plan_exercises
  USING (
    EXISTS (
      SELECT 1 FROM plan_days d
      JOIN workout_plans p ON p.id = d.plan_id
      WHERE d.id = plan_day_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_days d
      JOIN workout_plans p ON p.id = d.plan_id
      WHERE d.id = plan_day_id AND p.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────
-- Plan Sets (target sets with prescribed weight/reps)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS plan_sets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_exercise_id UUID NOT NULL REFERENCES plan_exercises(id) ON DELETE CASCADE,
  set_order        INT NOT NULL DEFAULT 0,
  target_weight_kg NUMERIC(7,2),
  target_reps      INT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS plan_sets_exercise_idx ON plan_sets (plan_exercise_id, set_order);

ALTER TABLE plan_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own plan sets" ON plan_sets
  USING (
    EXISTS (
      SELECT 1 FROM plan_exercises pe
      JOIN plan_days d ON d.id = pe.plan_day_id
      JOIN workout_plans p ON p.id = d.plan_id
      WHERE pe.id = plan_exercise_id AND p.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plan_exercises pe
      JOIN plan_days d ON d.id = pe.plan_day_id
      JOIN workout_plans p ON p.id = d.plan_id
      WHERE pe.id = plan_exercise_id AND p.user_id = auth.uid()
    )
  );

-- ──────────────────────────────────────────────
-- Link workouts back to plan days
-- ──────────────────────────────────────────────
ALTER TABLE workouts ADD COLUMN IF NOT EXISTS plan_day_id UUID REFERENCES plan_days(id) ON DELETE SET NULL;

-- ──────────────────────────────────────────────
-- User Goals (long-term targets for AI planning)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_goals (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_type    TEXT NOT NULL CHECK (goal_type IN ('strength', 'hypertrophy', 'endurance', 'weight_loss', 'general', 'custom')),
  title        TEXT NOT NULL,
  description  TEXT,
  target_value NUMERIC(10,2),
  target_unit  TEXT,
  exercise_id  UUID REFERENCES exercises(id) ON DELETE SET NULL,
  deadline     DATE,
  is_achieved  BOOLEAN DEFAULT FALSE,
  achieved_at  TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_goals_user_idx ON user_goals (user_id, is_achieved);

ALTER TABLE user_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own goals" ON user_goals
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
