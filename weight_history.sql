-- ============================================
-- Table: weight_history
-- Weight / BMI entries per athlete, used by the
-- "Weight & BMI Tracking" section of athlete-profile-page.js
-- Run in the Supabase SQL Editor. Safe to re-run.
-- ============================================
CREATE TABLE IF NOT EXISTS weight_history (
    weight_history_id BIGSERIAL PRIMARY KEY,
    athlete_id BIGINT NOT NULL REFERENCES athletes(athlete_id) ON DELETE CASCADE,
    weight DECIMAL(5,2) NOT NULL,
    recorded_date DATE NOT NULL DEFAULT CURRENT_DATE,
    bmi DECIMAL(4,1),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_weight_history_athlete_date ON weight_history(athlete_id, recorded_date);

DROP TRIGGER IF EXISTS update_weight_history_updated_at ON weight_history;
CREATE TRIGGER update_weight_history_updated_at BEFORE UPDATE ON weight_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE weight_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON weight_history;
DROP POLICY IF EXISTS "Enable insert access for all users" ON weight_history;
DROP POLICY IF EXISTS "Enable update access for all users" ON weight_history;
DROP POLICY IF EXISTS "Enable delete access for all users" ON weight_history;
CREATE POLICY "Enable read access for all users" ON weight_history FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON weight_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON weight_history FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON weight_history FOR DELETE USING (true);

-- Starting entry for athletes that already have a weight, so the
-- charts aren't empty (height is in cm, same as calculateBMI in the app)
INSERT INTO weight_history (athlete_id, weight, recorded_date, bmi, notes)
SELECT a.athlete_id,
       a.current_weight,
       COALESCE(a.date_joined, CURRENT_DATE),
       CASE WHEN a.height > 0
            THEN ROUND(a.current_weight / ((a.height / 100) * (a.height / 100)), 1)
       END,
       'Starting weight'
FROM athletes a
WHERE a.current_weight IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM weight_history w WHERE w.athlete_id = a.athlete_id);
