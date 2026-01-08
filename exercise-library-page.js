// ============================================
// Exercise Library Page Logic
// ============================================

let currentSplits = [];

document.addEventListener('DOMContentLoaded', () => {
    loadSplits();
    loadExercises();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('add-exercise-btn').addEventListener('click', () => {
        openModal('exercise-modal');
    });
    
    document.getElementById('exercise-form').addEventListener('submit', handleAddExercise);
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

        return `
            <div class="exercise-library-item">
                <div class="exercise-library-info">
                    <h4>${exercise.exercise_name}</h4>
                    <div class="split-badges">${splitBadges}</div>
                    ${exercise.description ? `<p class="exercise-description">${exercise.description}</p>` : ''}
                </div>
                <button class="btn-icon btn-danger" onclick="deleteExercise(${exercise.exercise_id}, '${exercise.exercise_name.replace(/'/g, "\\'")}')">
                    🗑️
                </button>
            </div>
        `;
    }).join('');
}

async function handleAddExercise(e) {
    e.preventDefault();

    const exerciseName = document.getElementById('exercise-name').value;
    const description = document.getElementById('exercise-description').value || null;
    
    // Get selected splits
    const selectedSplits = Array.from(document.querySelectorAll('input[name="exercise-split"]:checked'))
        .map(checkbox => parseInt(checkbox.value));

    if (selectedSplits.length === 0) {
        showToast('Please select at least one split category', 'error');
        return;
    }

    try {
        // Insert exercise
        const { data: exercise, error: exerciseError } = await db
            .from('exercises')
            .insert([{
                exercise_name: exerciseName,
                description: description
            }])
            .select()
            .single();

        if (exerciseError) throw exerciseError;

        // Insert exercise-split relationships
        const exerciseSplitRecords = selectedSplits.map(splitId => ({
            exercise_id: exercise.exercise_id,
            split_id: splitId
        }));

        const { error: splitsError } = await db
            .from('exercise_splits')
            .insert(exerciseSplitRecords);

        if (splitsError) throw splitsError;

        showToast('Exercise added successfully!', 'success');
        closeModal('exercise-modal');
        document.getElementById('exercise-form').reset();
        await loadExercises();
    } catch (error) {
        showToast('Error adding exercise: ' + error.message, 'error');
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