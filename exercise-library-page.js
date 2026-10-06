// ============================================
// Exercise Library Page Logic
// ============================================

let currentSplits = [];
let currentExercises = [];
let editingExerciseId = null;

document.addEventListener('DOMContentLoaded', () => {
    loadSplits();
    loadExercises();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('add-exercise-btn').addEventListener('click', openAddExercise);

    document.getElementById('exercise-form').addEventListener('submit', handleSaveExercise);
    document.getElementById('filter-split').addEventListener('change', loadExercises);

    document.querySelector('.close').addEventListener('click', () => {
        closeModal('exercise-modal');
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}

async function loadSplits() {
    try {
        const { data, error } = await db
            .from('splits')
            .select('*')
            .order('split_name');

        if (error) throw error;

        currentSplits = data;
        populateSplitDropdowns(data);
        populateSplitCheckboxes(data);
    } catch (error) {
        showToast('Error loading splits: ' + error.message, 'error');
    }
}

function populateSplitDropdowns(splits) {
    const filterSplit = document.getElementById('filter-split');
    
    const options = splits.map(split => 
        `<option value="${split.split_id}">${split.split_name}</option>`
    ).join('');

    filterSplit.innerHTML = '<option value="">All Splits</option>' + options;
}

function populateSplitCheckboxes(splits) {
    const container = document.getElementById('exercise-splits');
    
    container.innerHTML = splits.map(split => `
        <label class="checkbox-label">
            <input type="checkbox" name="exercise-split" value="${split.split_id}">
            <span class="checkbox-text">${split.split_name}</span>
        </label>
    `).join('');
}

async function loadExercises() {
    try {
        const splitFilter = document.getElementById('filter-split').value;

        // Load all exercises
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
        let exercisesWithSplits = exercises.map(exercise => {
            const splits = exerciseSplits
                .filter(es => es.exercise_id === exercise.exercise_id)
                .map(es => ({
                    split_id: es.split_id,
                    split_name: es.splits.split_name
                }));
            
            return {
                ...exercise,
                splits: splits
            };
        });

        currentExercises = exercisesWithSplits;

        // Filter by split if selected
        if (splitFilter) {
            exercisesWithSplits = exercisesWithSplits.filter(exercise => 
                exercise.splits.some(s => s.split_id == splitFilter)
            );
        }

        displayExercises(exercisesWithSplits);
    } catch (error) {
        showToast('Error loading exercises: ' + error.message, 'error');
    }
}

function displayExercises(exercises) {
    const container = document.getElementById('exercises-list');
    
    if (exercises.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏋️</div>
                <h3>No exercises found</h3>
                <p>Add exercises to your library!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = exercises.map(exercise => {
        const splitBadges = exercise.splits.length > 0
            ? exercise.splits.map(s => `<span class="exercise-split-badge">${s.split_name}</span>`).join('')
            : '<span class="exercise-split-badge">Uncategorized</span>';

        const measureBadge = exercise.measurement_type === 'duration'
            ? '<span class="exercise-measure-badge">⏱️ Duration</span>'
            : '<span class="exercise-measure-badge">🔁 Reps</span>';

        return `
            <div class="exercise-library-item">
                <div class="exercise-library-info">
                    <h4>${exercise.exercise_name}</h4>
                    <div class="split-badges">${splitBadges}${measureBadge}</div>
                    ${exercise.description ? `<p class="exercise-description">${exercise.description}</p>` : ''}
                </div>
                <div class="exercise-library-actions">
                    <button class="btn-icon" title="Edit" onclick="openEditExercise(${exercise.exercise_id})">
                        ✏️
                    </button>
                    <button class="btn-icon btn-danger" title="Delete" onclick="deleteExercise(${exercise.exercise_id}, '${exercise.exercise_name.replace(/'/g, "\\'")}')">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

function openAddExercise() {
    editingExerciseId = null;
    document.getElementById('exercise-form').reset();
    document.getElementById('exercise-modal-title').textContent = 'Add New Exercise';
    document.getElementById('exercise-submit-btn').textContent = 'Add Exercise';
    openModal('exercise-modal');
}

function openEditExercise(exerciseId) {
    const exercise = currentExercises.find(ex => ex.exercise_id === exerciseId);
    if (!exercise) return;

    editingExerciseId = exerciseId;
    document.getElementById('exercise-form').reset();
    document.getElementById('exercise-name').value = exercise.exercise_name;
    document.getElementById('exercise-description').value = exercise.description || '';
    document.querySelector(`input[name="measurement-type"][value="${exercise.measurement_type || 'reps'}"]`).checked = true;

    const splitIds = exercise.splits.map(s => s.split_id);
    document.querySelectorAll('input[name="exercise-split"]').forEach(checkbox => {
        checkbox.checked = splitIds.includes(parseInt(checkbox.value));
    });

    document.getElementById('exercise-modal-title').textContent = 'Edit Exercise';
    document.getElementById('exercise-submit-btn').textContent = 'Save Changes';
    openModal('exercise-modal');
}

async function handleSaveExercise(e) {
    e.preventDefault();

    const exerciseName = document.getElementById('exercise-name').value;
    const description = document.getElementById('exercise-description').value || null;
    const measurementType = document.querySelector('input[name="measurement-type"]:checked').value;

    // Get selected splits
    const selectedSplits = Array.from(document.querySelectorAll('input[name="exercise-split"]:checked'))
        .map(checkbox => parseInt(checkbox.value));

    if (selectedSplits.length === 0) {
        showToast('Please select at least one split category', 'error');
        return;
    }

    const exerciseData = {
        exercise_name: exerciseName,
        description: description,
        measurement_type: measurementType
    };

    try {
        let exerciseId = editingExerciseId;

        if (exerciseId) {
            const { error: exerciseError } = await db
                .from('exercises')
                .update(exerciseData)
                .eq('exercise_id', exerciseId);

            if (exerciseError) throw exerciseError;

            // Replace the split links with the new selection
            const { error: deleteError } = await db
                .from('exercise_splits')
                .delete()
                .eq('exercise_id', exerciseId);

            if (deleteError) throw deleteError;
        } else {
            const { data: exercise, error: exerciseError } = await db
                .from('exercises')
                .insert([exerciseData])
                .select()
                .single();

            if (exerciseError) throw exerciseError;
            exerciseId = exercise.exercise_id;
        }

        // Insert exercise-split relationships
        const exerciseSplitRecords = selectedSplits.map(splitId => ({
            exercise_id: exerciseId,
            split_id: splitId
        }));

        const { error: splitsError } = await db
            .from('exercise_splits')
            .insert(exerciseSplitRecords);

        if (splitsError) throw splitsError;

        showToast(editingExerciseId ? 'Exercise updated successfully!' : 'Exercise added successfully!', 'success');
        closeModal('exercise-modal');
        document.getElementById('exercise-form').reset();
        editingExerciseId = null;
        await loadExercises();
    } catch (error) {
        showToast('Error saving exercise: ' + error.message, 'error');
    }
}

async function deleteExercise(exerciseId, exerciseName) {
    if (!confirm(`Are you sure you want to delete "${exerciseName}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const { error } = await db
            .from('exercises')
            .delete()
            .eq('exercise_id', exerciseId);

        if (error) throw error;

        showToast('Exercise deleted successfully', 'success');
        await loadExercises();
    } catch (error) {
        showToast('Error deleting exercise: ' + error.message, 'error');
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}