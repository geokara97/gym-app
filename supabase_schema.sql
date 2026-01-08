-- ============================================
-- Athlete Training Tracker - Supabase Schema
-- PostgreSQL Database
-- ============================================

-- Enable UUID extension (useful for IDs)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Table: athletes
-- Stores information about each athlete
-- ============================================
CREATE TABLE athletes (
    athlete_id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    date_of_birth DATE,
    date_joined DATE DEFAULT CURRENT_DATE,
    current_weight DECIMAL(5,2),
    height DECIMAL(5,2),
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table: splits
-- Stores workout split categories
-- ============================================
CREATE TABLE splits (
    split_id BIGSERIAL PRIMARY KEY,
    split_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- Table: exercises
-- Stores the exercise library with categories
-- ============================================
CREATE TABLE exercises (
    exercise_id BIGSERIAL PRIMARY KEY,
    exercise_name VARCHAR(100) NOT NULL,
    split_id BIGINT NOT NULL REFERENCES splits(split_id) ON DELETE RESTRICT,
    description TEXT,
    instructions TEXT,
    video_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for exercises
CREATE INDEX idx_exercises_split_id ON exercises(split_id);
CREATE INDEX idx_exercises_name ON exercises(exercise_name);
CREATE INDEX idx_exercises_active ON exercises(is_active);

-- ============================================
-- Table: workouts
-- Stores individual workout sessions
-- ============================================
CREATE TABLE workouts (
    workout_id BIGSERIAL PRIMARY KEY,
    athlete_id BIGINT NOT NULL REFERENCES athletes(athlete_id) ON DELETE CASCADE,
    workout_date DATE NOT NULL,
    split_id BIGINT REFERENCES splits(split_id) ON DELETE SET NULL,
    duration_minutes INT,
    notes TEXT,
    trainer_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for workouts
CREATE INDEX idx_workouts_athlete_id ON workouts(athlete_id);
CREATE INDEX idx_workouts_date ON workouts(workout_date);
CREATE INDEX idx_workouts_athlete_date ON workouts(athlete_id, workout_date);

-- ============================================
-- Table: workout_exercises
-- Stores exercises performed in each workout
-- ============================================
CREATE TABLE workout_exercises (
    workout_exercise_id BIGSERIAL PRIMARY KEY,
    workout_id BIGINT NOT NULL REFERENCES workouts(workout_id) ON DELETE CASCADE,
    exercise_id BIGINT NOT NULL REFERENCES exercises(exercise_id) ON DELETE RESTRICT,
    exercise_order INT DEFAULT 1,
    sets INT NOT NULL,
    reps INT NOT NULL,
    weight DECIMAL(6,2),
    rest_seconds INT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for workout_exercises
CREATE INDEX idx_workout_exercises_workout_id ON workout_exercises(workout_id);
CREATE INDEX idx_workout_exercises_exercise_id ON workout_exercises(exercise_id);

-- ============================================
-- Function: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_athletes_updated_at BEFORE UPDATE ON athletes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_splits_updated_at BEFORE UPDATE ON splits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_exercises_updated_at BEFORE UPDATE ON exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workouts_updated_at BEFORE UPDATE ON workouts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_exercises_updated_at BEFORE UPDATE ON workout_exercises
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- Insert default split categories
-- ============================================
INSERT INTO splits (split_name, description) VALUES
('Chest', 'Chest exercises including presses, flyes, and variations'),
('Back', 'Back exercises including rows, pull-ups, and deadlifts'),
('Legs', 'Leg exercises including squats, lunges, and leg presses'),
('Shoulders', 'Shoulder exercises including presses and raises'),
('Arms', 'Arm exercises including biceps and triceps work'),
('Core', 'Core and abdominal exercises'),
('Cardio', 'Cardiovascular exercises'),
('Full Body', 'Full body compound movements');

-- ============================================
-- Insert sample exercises
-- ============================================

-- Chest exercises
INSERT INTO exercises (exercise_name, split_id, description) VALUES
('Barbell Bench Press', 1, 'Classic compound chest exercise'),
('Incline Dumbbell Press', 1, 'Upper chest focus with dumbbells'),
('Cable Flyes', 1, 'Isolation exercise for chest'),
('Push-ups', 1, 'Bodyweight chest exercise'),
('Dumbbell Bench Press', 1, 'Dumbbell variation of bench press'),
('Decline Bench Press', 1, 'Lower chest focus');

-- Back exercises
INSERT INTO exercises (exercise_name, split_id, description) VALUES
('Pull-ups', 2, 'Bodyweight back exercise'),
('Barbell Rows', 2, 'Compound back exercise'),
('Lat Pulldown', 2, 'Lat focused machine exercise'),
('Deadlift', 2, 'Full posterior chain compound movement'),
('Seated Cable Rows', 2, 'Mid-back cable exercise'),
('T-Bar Rows', 2, 'Thickness builder for back');

-- Leg exercises
INSERT INTO exercises (exercise_name, split_id, description) VALUES
('Barbell Squat', 3, 'Compound leg exercise'),
('Leg Press', 3, 'Quad focused machine exercise'),
('Romanian Deadlift', 3, 'Hamstring focused exercise'),
('Walking Lunges', 3, 'Unilateral leg exercise'),
('Leg Curls', 3, 'Hamstring isolation'),
('Leg Extensions', 3, 'Quad isolation exercise'),
('Calf Raises', 3, 'Calf development exercise');

-- Shoulder exercises
INSERT INTO exercises (exercise_name, split_id, description) VALUES
('Overhead Press', 4, 'Compound shoulder exercise'),
('Lateral Raises', 4, 'Medial deltoid isolation'),
('Face Pulls', 4, 'Rear deltoid and upper back'),
('Arnold Press', 4, 'Dumbbell shoulder variation'),
('Front Raises', 4, 'Anterior deltoid isolation'),
('Rear Delt Flyes', 4, 'Posterior deltoid focus');

-- Arm exercises
INSERT INTO exercises (exercise_name, split_id, description) VALUES
('Barbell Curl', 5, 'Classic bicep exercise'),
('Tricep Dips', 5, 'Compound tricep movement'),
('Hammer Curls', 5, 'Bicep and forearm exercise'),
('Overhead Tricep Extension', 5, 'Tricep isolation'),
('Cable Curls', 5, 'Constant tension bicep work'),
('Tricep Pushdowns', 5, 'Cable tricep isolation'),
('Preacher Curls', 5, 'Isolated bicep exercise');

-- Core exercises
INSERT INTO exercises (exercise_name, split_id, description) VALUES
('Plank', 6, 'Core stability exercise'),
('Russian Twists', 6, 'Oblique focused exercise'),
('Hanging Leg Raises', 6, 'Lower abs exercise'),
('Cable Crunches', 6, 'Upper abs exercise'),
('Ab Wheel Rollouts', 6, 'Advanced core exercise'),
('Side Plank', 6, 'Oblique stability');

-- Cardio exercises
INSERT INTO exercises (exercise_name, split_id, description) VALUES
('Treadmill Running', 7, 'Running cardio'),
('Cycling', 7, 'Low impact cardio'),
('Rowing Machine', 7, 'Full body cardio'),
('Elliptical', 7, 'Low impact cardio machine'),
('Jump Rope', 7, 'High intensity cardio'),
('Stair Climber', 7, 'Lower body cardio');

-- Full Body exercises
INSERT INTO exercises (exercise_name, split_id, description) VALUES
('Burpees', 8, 'Full body conditioning'),
('Kettlebell Swings', 8, 'Hip hinge power movement'),
('Thrusters', 8, 'Squat to press combination'),
('Clean and Press', 8, 'Olympic lift variation');

-- ============================================
-- Views for easy data retrieval
-- ============================================

-- View: Complete workout details
CREATE OR REPLACE VIEW workout_details AS
SELECT 
    w.workout_id,
    w.workout_date,
    a.athlete_id,
    a.name AS athlete_name,
    s.split_name,
    w.duration_minutes,
    w.notes AS workout_notes,
    w.trainer_notes,
    COUNT(we.workout_exercise_id) AS total_exercises,
    SUM(we.sets * we.reps) AS total_reps
FROM workouts w
JOIN athletes a ON w.athlete_id = a.athlete_id
LEFT JOIN splits s ON w.split_id = s.split_id
LEFT JOIN workout_exercises we ON w.workout_id = we.workout_id
GROUP BY w.workout_id, w.workout_date, a.athlete_id, a.name, s.split_name, w.duration_minutes, w.notes, w.trainer_notes;

-- View: Exercise performance tracking
CREATE OR REPLACE VIEW exercise_performance AS
SELECT 
    a.athlete_id,
    a.name AS athlete_name,
    e.exercise_name,
    e.exercise_id,
    w.workout_date,
    we.sets,
    we.reps,
    we.weight,
    (we.sets * we.reps * COALESCE(we.weight, 0)) AS total_volume,
    s.split_name
FROM workout_exercises we
JOIN workouts w ON we.workout_id = w.workout_id
JOIN athletes a ON w.athlete_id = a.athlete_id
JOIN exercises e ON we.exercise_id = e.exercise_id
LEFT JOIN splits s ON e.split_id = s.split_id
ORDER BY a.athlete_id, e.exercise_name, w.workout_date;

-- View: Athlete summary statistics
CREATE OR REPLACE VIEW athlete_stats AS
SELECT 
    a.athlete_id,
    a.name AS athlete_name,
    a.email,
    a.current_weight,
    COUNT(DISTINCT w.workout_id) AS total_workouts,
    MAX(w.workout_date) AS last_workout_date,
    MIN(w.workout_date) AS first_workout_date,
    COUNT(DISTINCT DATE_TRUNC('month', w.workout_date)) AS months_active
FROM athletes a
LEFT JOIN workouts w ON a.athlete_id = w.athlete_id
GROUP BY a.athlete_id, a.name, a.email, a.current_weight;

-- View: Recent workouts (last 30 days)
CREATE OR REPLACE VIEW recent_workouts AS
SELECT 
    w.workout_id,
    w.workout_date,
    a.name AS athlete_name,
    s.split_name,
    w.duration_minutes,
    COUNT(we.workout_exercise_id) AS exercises_count
FROM workouts w
JOIN athletes a ON w.athlete_id = a.athlete_id
LEFT JOIN splits s ON w.split_id = s.split_id
LEFT JOIN workout_exercises we ON w.workout_id = we.workout_id
WHERE w.workout_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY w.workout_id, w.workout_date, a.name, s.split_name, w.duration_minutes
ORDER BY w.workout_date DESC;

-- ============================================
-- Row Level Security (RLS) Setup
-- Note: Enable RLS in Supabase dashboard for production
-- ============================================

-- Enable RLS on all tables
ALTER TABLE athletes ENABLE ROW LEVEL SECURITY;
ALTER TABLE splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;

-- Create policies (these are examples - adjust based on your auth setup)
-- For now, allow all operations (you'll secure this with auth later)

CREATE POLICY "Enable read access for all users" ON athletes FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON athletes FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON athletes FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON athletes FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON splits FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON splits FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON splits FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON exercises FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON exercises FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON workouts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON workouts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON workouts FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON workouts FOR DELETE USING (true);

CREATE POLICY "Enable read access for all users" ON workout_exercises FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON workout_exercises FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON workout_exercises FOR UPDATE USING (true);
CREATE POLICY "Enable delete access for all users" ON workout_exercises FOR DELETE USING (true);

-- ============================================
-- Sample Data (Optional)
-- ============================================

-- Add sample athletes
INSERT INTO athletes (name, email, current_weight, height, notes) VALUES
('John Smith', 'john.smith@email.com', 85.5, 180.0, 'Focus on strength training'),
('Sarah Johnson', 'sarah.j@email.com', 62.0, 165.0, 'Training for marathon'),
('Mike Davis', 'mike.d@email.com', 92.0, 185.0, 'Bodybuilding prep');

-- Add sample workout for John Smith
INSERT INTO workouts (athlete_id, workout_date, split_id, duration_minutes, notes) 
VALUES (1, CURRENT_DATE, 1, 60, 'Chest day - felt strong');

-- Add exercises to the workout
INSERT INTO workout_exercises (workout_id, exercise_id, exercise_order, sets, reps, weight, notes) VALUES
(1, 1, 1, 4, 8, 100.0, 'Good form maintained'),
(1, 2, 2, 3, 10, 35.0, 'Increased weight from last week'),
(1, 3, 3, 3, 12, 20.0, 'Great pump');

-- ============================================
-- Useful Functions
-- ============================================

-- Function to get athlete's workout history
CREATE OR REPLACE FUNCTION get_athlete_workout_history(p_athlete_id BIGINT, p_limit INT DEFAULT 10)
RETURNS TABLE (
    workout_id BIGINT,
    workout_date DATE,
    split_name VARCHAR,
    duration_minutes INT,
    total_exercises BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.workout_id,
        w.workout_date,
        s.split_name,
        w.duration_minutes,
        COUNT(we.workout_exercise_id) AS total_exercises
    FROM workouts w
    LEFT JOIN splits s ON w.split_id = s.split_id
    LEFT JOIN workout_exercises we ON w.workout_id = we.workout_id
    WHERE w.athlete_id = p_athlete_id
    GROUP BY w.workout_id, w.workout_date, s.split_name, w.duration_minutes
    ORDER BY w.workout_date DESC
    LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Function to get exercise progress for an athlete
CREATE OR REPLACE FUNCTION get_exercise_progress(p_athlete_id BIGINT, p_exercise_id BIGINT)
RETURNS TABLE (
    workout_date DATE,
    sets INT,
    reps INT,
    weight DECIMAL,
    total_volume DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.workout_date,
        we.sets,
        we.reps,
        we.weight,
        (we.sets * we.reps * COALESCE(we.weight, 0)) AS total_volume
    FROM workout_exercises we
    JOIN workouts w ON we.workout_id = w.workout_id
    WHERE w.athlete_id = p_athlete_id 
    AND we.exercise_id = p_exercise_id
    ORDER BY w.workout_date DESC;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- End of Schema
-- ============================================