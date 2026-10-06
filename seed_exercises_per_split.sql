-- ============================================
-- Exercises per split
-- Run in the Supabase SQL Editor. Safe to re-run.
--
-- The app links exercises to splits through the exercise_splits junction
-- table (an exercise can belong to several splits), but that table was
-- never created, so every exercise shows up as "Uncategorized".
-- ============================================

-- 1. Junction table used by exercise-library-page.js and log-workout-page.js
CREATE TABLE IF NOT EXISTS exercise_splits (
    exercise_id BIGINT NOT NULL REFERENCES exercises(exercise_id) ON DELETE CASCADE,
    split_id BIGINT NOT NULL REFERENCES splits(split_id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (exercise_id, split_id)
);

CREATE INDEX IF NOT EXISTS idx_exercise_splits_split_id ON exercise_splits(split_id);

ALTER TABLE exercise_splits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for all users" ON exercise_splits;
DROP POLICY IF EXISTS "Enable insert access for all users" ON exercise_splits;
DROP POLICY IF EXISTS "Enable delete access for all users" ON exercise_splits;
CREATE POLICY "Enable read access for all users" ON exercise_splits FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON exercise_splits FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable delete access for all users" ON exercise_splits FOR DELETE USING (true);

-- 2. The "Add Exercise" form inserts exercises without a split_id
--    (splits go into exercise_splits instead), so it must be nullable.
ALTER TABLE exercises ALTER COLUMN split_id DROP NOT NULL;

-- 3. More exercises for each split (skips names that already exist)
INSERT INTO exercises (exercise_name, split_id, description)
SELECT v.exercise_name, s.split_id, v.description
FROM (VALUES
    -- Chest
    ('Chest',     'Incline Barbell Bench Press', 'Barbell press on a 30-45 degree incline bench'),
    ('Chest',     'Machine Chest Press',         'Seated machine press for the chest'),
    ('Chest',     'Pec Deck',                    'Machine fly for chest isolation'),
    ('Chest',     'Dumbbell Flyes',              'Flat bench dumbbell fly'),
    ('Chest',     'Low-to-High Cable Flyes',     'Cable fly targeting the upper chest'),
    ('Chest',     'Chest Dips',                  'Forward-leaning dips for the lower chest'),
    -- Back
    ('Back',      'Chin-ups',                    'Underhand-grip pull-up'),
    ('Back',      'Single-Arm Dumbbell Row',     'One-arm row supported on a bench'),
    ('Back',      'Chest-Supported Row',         'Row on an incline bench or machine'),
    ('Back',      'Straight-Arm Pulldown',       'Cable pulldown with straight arms for the lats'),
    ('Back',      'Rack Pulls',                  'Partial-range deadlift from pins'),
    ('Back',      'Hyperextensions',             'Back extensions for the lower back'),
    -- Legs
    ('Legs',      'Front Squat',                 'Barbell squat with the bar on the front delts'),
    ('Legs',      'Bulgarian Split Squat',       'Rear-foot-elevated single-leg squat'),
    ('Legs',      'Hack Squat',                  'Machine squat on an angled sled'),
    ('Legs',      'Hip Thrust',                  'Barbell hip thrust for the glutes'),
    ('Legs',      'Goblet Squat',                'Squat holding a dumbbell or kettlebell at the chest'),
    ('Legs',      'Seated Calf Raises',          'Calf raise with bent knees for the soleus'),
    -- Shoulders
    ('Shoulders', 'Seated Dumbbell Press',       'Seated overhead dumbbell press'),
    ('Shoulders', 'Cable Lateral Raises',        'Single-arm lateral raise on a cable'),
    ('Shoulders', 'Upright Rows',                'Barbell or cable row to chest height'),
    ('Shoulders', 'Machine Shoulder Press',      'Seated machine overhead press'),
    ('Shoulders', 'Reverse Pec Deck',            'Machine reverse fly for the rear delts'),
    ('Shoulders', 'Barbell Shrugs',              'Shrugs for the upper traps'),
    -- Arms
    ('Arms',      'Incline Dumbbell Curl',       'Curl on an incline bench for a long biceps stretch'),
    ('Arms',      'Concentration Curl',          'Seated single-arm curl'),
    ('Arms',      'EZ-Bar Curl',                 'Biceps curl with an EZ bar'),
    ('Arms',      'Skull Crushers',              'Lying EZ-bar triceps extension'),
    ('Arms',      'Close-Grip Bench Press',      'Narrow-grip bench press for the triceps'),
    ('Arms',      'Tricep Kickbacks',            'Bent-over dumbbell triceps extension'),
    -- Core
    ('Core',      'Crunches',                    'Basic floor crunch'),
    ('Core',      'Bicycle Crunches',            'Alternating elbow-to-knee crunch'),
    ('Core',      'Dead Bug',                    'Anti-extension core drill lying on the back'),
    ('Core',      'Mountain Climbers',           'Alternating knee drives from a plank'),
    ('Core',      'Pallof Press',                'Anti-rotation cable press'),
    ('Core',      'Hollow Body Hold',            'Isometric hold with arms and legs extended'),
    -- Cardio
    ('Cardio',    'Incline Walking',             'Treadmill walking on a steep incline'),
    ('Cardio',    'Assault Bike',                'Air bike intervals'),
    ('Cardio',    'Sprints',                     'Short maximal-effort runs'),
    ('Cardio',    'Swimming',                    'Lap swimming'),
    ('Cardio',    'Box Jumps',                   'Explosive jumps onto a box'),
    ('Cardio',    'Battle Ropes',                'Rope waves for conditioning'),
    -- Full Body
    ('Full Body', 'Power Clean',                 'Explosive pull from the floor to the front rack'),
    ('Full Body', 'Farmer''s Walk',              'Loaded carry with heavy weights in each hand'),
    ('Full Body', 'Turkish Get-up',              'Kettlebell get-up from lying to standing'),
    ('Full Body', 'Man Makers',                  'Push-up, row and thruster with dumbbells'),
    ('Full Body', 'Sled Push',                   'Pushing a weighted sled'),
    ('Full Body', 'Wall Balls',                  'Squat and throw a medicine ball to a target')
) AS v(split_name, exercise_name, description)
JOIN splits s ON s.split_name = v.split_name
WHERE NOT EXISTS (
    SELECT 1 FROM exercises e WHERE lower(e.exercise_name) = lower(v.exercise_name)
);

-- 4. Link every exercise to its split in the junction table
--    (covers the 48 existing exercises and the new ones above)
INSERT INTO exercise_splits (exercise_id, split_id)
SELECT exercise_id, split_id
FROM exercises
WHERE split_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- Check: exercise count per split
SELECT s.split_name, COUNT(es.exercise_id) AS exercises
FROM splits s
LEFT JOIN exercise_splits es ON es.split_id = s.split_id
GROUP BY s.split_id, s.split_name
ORDER BY s.split_id;
