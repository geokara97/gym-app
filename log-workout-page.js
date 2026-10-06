// ============================================
// Log Workout Page Logic
// ============================================

let currentAthletes = [];
let currentSplits = [];
let currentExercises = [];
let exerciseCounter = 0;

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
});

async function initializeApp() {
    await loadAthletes();
    await loadSplits();
    await loadExercises();
    
    // Set today's date and current time as default
    document.getElementById('workout-date').valueAsDate = new Date();
    const now = new Date();
    document.getElementById('workout-time').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

function setupEventListeners() {
    document.getElementById('add-exercise-btn').addEventListener('click', addExerciseEntry);
    document.getElementById('workout-form').addEventListener('submit', handleSaveWorkout);
    document.getElementById('workout-splits').addEventListener('change', refreshExerciseSelects);
}

async function loadAthletes() {
    try {
        const { data, error } = await db
            .from('athletes')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        currentAthletes = data;
        displayAthleteCheckboxes(data);
    } catch (error) {
        showToast('Error loading athletes: ' + error.message, 'error');
    }
}

function displayAthleteCheckboxes(athletes) {
    const container = document.getElementById('athlete-checkboxes');
    
    if (athletes.length === 0) {
        container.innerHTML = '<p class="text-muted">No athletes available. <a href="athletes.html">Add athletes first</a>.</p>';
        return;
    }

    container.innerHTML = athletes.map(athlete => `
        <label class="checkbox-label">
            <input type="checkbox" name="selected-athletes" value="${athlete.athlete_id}">
            <span class="checkbox-text">${athlete.name}</span>
        </label>
    `).join('');
}

async function loadSplits() {
    try {
        const { data, error } = await db
            .from('splits')
            .select('*')
            .order('split_name');

        if (error) throw error;

        currentSplits = data;
        displaySplitCheckboxes(data);
    } catch (error) {
        showToast('Error loading splits: ' + error.message, 'error');
    }
}

function displaySplitCheckboxes(splits) {
    const container = document.getElementById('workout-splits');
    
    container.innerHTML = splits.map(split => `
        <label class="checkbox-label">
            <input type="checkbox" name="workout-split" value="${split.split_id}">
            <span class="checkbox-text">${split.split_name}</span>
        </label>
    `).join('');
}

async function loadExercises() {
    try {
        // Load exercises with their splits via junction table
        const { data: exercises, error: exercisesError } = await db
            .from('exercises')
            .select('*')
            .eq('is_active', true)
            .order('exercise_name');

        if (exercisesError) throw exercisesError;

        // Load exercise-split relationships
        const { data: exerciseSplits, error: splitsError } = await db
            .from('exercise_splits')
            .select('exercise_id, split_id, splits(split_name)');

        if (splitsError) throw splitsError;

        // Combine exercises with their splits
        currentExercises = exercises.map(exercise => {
            const splits = exerciseSplits
                .filter(es => es.exercise_id === exercise.exercise_id);

            return {
                ...exercise,
                split_ids: splits.map(es => es.split_id),
                split_names: splits.map(es => es.splits.split_name).join(', ') || 'Uncategorized'
            };
        });

    } catch (error) {
        showToast('Error loading exercises: ' + error.message, 'error');
    }
}

// Exercises belonging to the checked splits (all exercises when no split is checked)
function getExerciseOptions() {
    const selectedSplitIds = Array.from(document.querySelectorAll('input[name="workout-split"]:checked'))
        .map(checkbox => parseInt(checkbox.value));

    const exercises = selectedSplitIds.length === 0
        ? currentExercises
        : currentExercises.filter(exercise =>
            exercise.split_ids.some(splitId => selectedSplitIds.includes(splitId)));

    return exercises.map(exercise =>
        `<option value="${exercise.exercise_id}">${exercise.exercise_name} (${exercise.split_names})</option>`
    ).join('');
}

// Re-filter the exercise dropdowns already on the form when the split selection changes
function refreshExerciseSelects() {
    const exerciseOptions = getExerciseOptions();

    document.querySelectorAll('.exercise-select').forEach(select => {
        const previousValue = select.value;
        select.innerHTML = `<option value="">-- Select Exercise --</option>${exerciseOptions}`;
        // Keeps the chosen exercise if it still matches; otherwise falls back to the placeholder
        select.value = previousValue;
        if (select.value !== previousValue) {
            select.value = '';
            updateSetInputs(select.closest('.exercise-entry'));
        }
    });
}

function isDurationExercise(exerciseId) {
    const exercise = currentExercises.find(ex => ex.exercise_id === exerciseId);
    return exercise ? exercise.measurement_type === 'duration' : false;
}

// Switch an exercise entry's set inputs between reps and seconds
function updateSetInputs(entry) {
    const isDuration = isDurationExercise(parseInt(entry.querySelector('.exercise-select').value));

    entry.querySelectorAll('.set-entry').forEach(setEntry => {
        setEntry.querySelector('.amount-label').textContent = isDuration ? 'Seconds' : 'Reps';
        setEntry.querySelector('.amount-input').placeholder = isDuration ? '30' : '12';
    });
}

function addExerciseEntry() {
    exerciseCounter++;
    const container = document.getElementById('exercise-entries');

    const exerciseOptions = getExerciseOptions();

    const entryHTML = `
        <div class="exercise-entry" id="exercise-${exerciseCounter}">
            <div class="exercise-entry-header">
                <span class="exercise-number">Exercise ${exerciseCounter}</span>
                <button type="button" class="remove-exercise" onclick="removeExerciseEntry(${exerciseCounter})">×</button>
            </div>
            
            <div class="form-group">
                <label>Select Exercise</label>
                <select class="exercise-select" required onchange="updateSetInputs(this.closest('.exercise-entry'))">
                    <option value="">-- Select Exercise --</option>
                    ${exerciseOptions}
                </select>
            </div>

            <div class="sets-container" id="sets-container-${exerciseCounter}">
                <!-- Sets will be added here -->
            </div>

            <button type="button" class="btn btn-secondary btn-sm" onclick="addSet(${exerciseCounter})">
                + Add Set
            </button>
        </div>
    `;

    container.insertAdjacentHTML('beforeend', entryHTML);
    addSet(exerciseCounter);
}

function addSet(exerciseId) {
    const container = document.getElementById(`sets-container-${exerciseId}`);
    const setNumber = container.children.length + 1;
    
    const setHTML = `
        <div class="set-entry">
            <span class="set-number">Set ${setNumber}</span>
            <div class="set-inputs">
                <div class="form-group-inline">
                    <label class="amount-label">Reps</label>
                    <input type="number" class="amount-input" min="1" required placeholder="12">
                </div>
                <div class="form-group-inline">
                    <label>Weight (kg)</label>
                    <input type="number" class="weight-input" step="0.5" placeholder="25">
                </div>
                <button type="button" class="btn-icon-small" onclick="removeSet(this, ${exerciseId})">×</button>
            </div>
        </div>
    `;
    
    container.insertAdjacentHTML('beforeend', setHTML);
    updateSetNumbers(exerciseId);
    updateSetInputs(document.getElementById(`exercise-${exerciseId}`));
}

function removeSet(button, exerciseId) {
    const setEntry = button.closest('.set-entry');
    const container = document.getElementById(`sets-container-${exerciseId}`);
    
    if (container.children.length <= 1) {
        showToast('Exercise must have at least one set', 'error');
        return;
    }
    
    setEntry.remove();
    updateSetNumbers(exerciseId);
}

function updateSetNumbers(exerciseId) {
    const container = document.getElementById(`sets-container-${exerciseId}`);
    Array.from(container.children).forEach((setEntry, index) => {
        setEntry.querySelector('.set-number').textContent = `Set ${index + 1}`;
    });
}

function removeExerciseEntry(id) {
    document.getElementById(`exercise-${id}`).remove();
}

async function handleSaveWorkout(e) {
    e.preventDefault();

    // Get selected athletes
    const selectedAthletes = Array.from(document.querySelectorAll('input[name="selected-athletes"]:checked'))
        .map(checkbox => parseInt(checkbox.value));

    if (selectedAthletes.length === 0) {
        showToast('Please select at least one athlete', 'error');
        return;
    }

    const workoutDate = document.getElementById('workout-date').value;
    const workoutTime = document.getElementById('workout-time').value || null;
    
    // Get selected splits
    const selectedSplits = Array.from(document.querySelectorAll('input[name="workout-split"]:checked'))
        .map(checkbox => ({
            id: parseInt(checkbox.value),
            name: checkbox.nextElementSibling.textContent
        }));
    
    const splitId = selectedSplits.length > 0 ? selectedSplits[0].id : null;
    const duration = parseInt(document.getElementById('workout-duration').value) || null;
    let notes = document.getElementById('workout-notes').value || '';
    
    // Add splits to notes if multiple selected
    if (selectedSplits.length > 1) {
        const splitNames = selectedSplits.map(s => s.name).join(', ');
        notes = `Splits: ${splitNames}${notes ? '\n' + notes : ''}`;
    }

    // Collect exercise data
    const exerciseEntries = [];
    document.querySelectorAll('.exercise-entry').forEach((entry, exerciseIndex) => {
        const exerciseId = parseInt(entry.querySelector('.exercise-select').value);
        
        if (!exerciseId) return;

        const isDuration = isDurationExercise(exerciseId);
        const setsContainer = entry.querySelector('.sets-container');
        const sets = Array.from(setsContainer.querySelectorAll('.set-entry'));

        sets.forEach((setEntry, setIndex) => {
            const amount = parseInt(setEntry.querySelector('.amount-input').value);
            const weight = parseFloat(setEntry.querySelector('.weight-input').value) || null;

            if (amount) {
                exerciseEntries.push({
                    exercise_id: exerciseId,
                    exercise_order: exerciseIndex + 1,
                    set_number: setIndex + 1,
                    sets: 1,
                    reps: isDuration ? null : amount,
                    duration_seconds: isDuration ? amount : null,
                    weight: weight
                });
            }
        });
    });

    if (exerciseEntries.length === 0) {
        showToast('Please add at least one exercise with sets', 'error');
        return;
    }

    try {
        // Insert workout for each selected athlete
        const workoutPromises = selectedAthletes.map(async (athleteId) => {
            const { data: workout, error: workoutError } = await db
                .from('workouts')
                .insert([{
                    athlete_id: athleteId,
                    workout_date: workoutDate,
                    workout_time: workoutTime,
                    split_id: splitId,
                    duration_minutes: duration,
                    notes: notes
                }])
                .select()
                .single();

            if (workoutError) throw workoutError;

            // Insert exercises for this workout
            const workoutExercises = exerciseEntries.map(ex => ({
                ...ex,
                workout_id: workout.workout_id
            }));

            const { error: exercisesError } = await db
                .from('workout_exercises')
                .insert(workoutExercises);

            if (exercisesError) throw exercisesError;

            return workout;
        });

        await Promise.all(workoutPromises);

        showToast(`Workout logged successfully for ${selectedAthletes.length} athlete(s)!`, 'success');
        
        // Reset form
        document.getElementById('workout-form').reset();
        document.getElementById('exercise-entries').innerHTML = '';
        exerciseCounter = 0;
        
        // Reset defaults
        document.getElementById('workout-date').valueAsDate = new Date();
        const now = new Date();
        document.getElementById('workout-time').value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    } catch (error) {
        showToast('Error saving workout: ' + error.message, 'error');
    }
}