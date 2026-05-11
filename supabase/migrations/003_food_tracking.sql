-- ──────────────────────────────────────────────
-- Food Items (user's food library)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  brand         TEXT,
  serving_size  NUMERIC(8,2) NOT NULL DEFAULT 100,
  serving_unit  TEXT NOT NULL DEFAULT 'g',
  calories      NUMERIC(8,2) NOT NULL DEFAULT 0,
  protein_g     NUMERIC(8,2) NOT NULL DEFAULT 0,
  carbs_g       NUMERIC(8,2) NOT NULL DEFAULT 0,
  fat_g         NUMERIC(8,2) NOT NULL DEFAULT 0,
  barcode       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS food_items_user_idx ON food_items (user_id);

ALTER TABLE food_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own food items" ON food_items
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- Food Log (daily food entries)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS food_log (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  food_item_id  UUID NOT NULL REFERENCES food_items(id) ON DELETE CASCADE,
  log_date      DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type     TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snacks')),
  servings      NUMERIC(6,2) NOT NULL DEFAULT 1,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS food_log_user_date_idx ON food_log (user_id, log_date);

ALTER TABLE food_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own food log" ON food_log
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ──────────────────────────────────────────────
-- Nutrition Targets (daily macro goals)
-- ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS nutrition_targets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calories    NUMERIC(8,2) NOT NULL DEFAULT 2000,
  protein_g   NUMERIC(8,2) NOT NULL DEFAULT 150,
  carbs_g     NUMERIC(8,2) NOT NULL DEFAULT 250,
  fat_g       NUMERIC(8,2) NOT NULL DEFAULT 65,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id)
);

ALTER TABLE nutrition_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can CRUD own nutrition targets" ON nutrition_targets
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
