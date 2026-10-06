-- ============================================
-- Rep-based vs duration-based exercises
-- Run in the Supabase SQL Editor. Safe to re-run.
-- ============================================

-- 1. How each exercise is measured: 'reps' (count) or 'duration' (seconds)
ALTER TABLE exercises
    ADD COLUMN IF NOT EXISTS measurement_type VARCHAR(10) NOT NULL DEFAULT 'reps';

ALTER TABLE exercises DROP CONSTRAINT IF EXISTS exercises_measurement_type_check;
ALTER TABLE exercises
    ADD CONSTRAINT exercises_measurement_type_check CHECK (measurement_type IN ('reps', 'duration'));

-- 2. Logged sets store either reps or seconds
ALTER TABLE workout_exercises ADD COLUMN IF NOT EXISTS duration_seconds INT;
ALTER TABLE workout_exercises ALTER COLUMN reps DROP NOT NULL;

-- 3. Exercises that are timed rather than counted
UPDATE exercises
SET measurement_type = 'duration'
WHERE exercise_name IN (
    -- Core
    'Plank', 'Side Plank', 'Hollow Body Hold', 'Mountain Climbers',
    -- Cardio
    'Treadmill Running', 'Cycling', 'Rowing Machine', 'Elliptical', 'Jump Rope',
    'Stair Climber', 'Incline Walking', 'Assault Bike', 'Sprints', 'Swimming', 'Battle Ropes',
    -- Full Body
    'Farmer''s Walk', 'Sled Push'
);

-- 4. The Exercise Library delete button needs a delete policy
--    (without it Supabase silently deletes nothing)
DROP POLICY IF EXISTS "Enable delete access for all users" ON exercises;
CREATE POLICY "Enable delete access for all users" ON exercises FOR DELETE USING (true);

-- Check
SELECT measurement_type, COUNT(*) FROM exercises GROUP BY measurement_type;
