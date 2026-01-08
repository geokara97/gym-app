// ============================================
// Workout History Page Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadWorkoutHistory();
    
    // Check if athlete filter from URL
    const urlParams = new URLSearchParams(window.location.search);
    const athleteId = urlParams.get('athlete');
    if (athleteId) {
        // Will add athlete-specific filtering later
    }
});

function setupEventListeners() {
    document.getElementById('apply-filter-btn').addEventListener('click', loadWorkoutHistory);
    document.getElementById('reset-filter-btn').addEventListener('click', resetFilters);
}

function resetFilters() {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    loadWorkoutHistory();
}

async function loadWorkoutHistory() {
    try {
        let query = db
            .from('workouts')
            .select(`
                *,
                athletes (name),
                splits (split_name),
                workout_exercises (
                    *,
                    exercises (exercise_name)
                )
            `)
            .order('workout_date', { ascending: false })
            .order('workout_time', { ascending: false });

        // Apply date filters
        const dateFrom = document.getElementById('filter-date-from').value;
        const dateTo = document.getElementById('filter-date-to').value;

        if (dateFrom) {
            query = query.gte('workout_date', dateFrom);
        }
        if (dateTo) {
            query = query.lte('workout_date', dateTo);
        }

        const { data, error } = await query;

        if (error) throw error;

        displayWorkoutHistory(data);
    } catch (error) {
        showToast('Error loading workout history: ' + error.message, 'error');
    }
}

function displayWorkoutHistory(workouts) {
    const container = document.getElementById('history-list');
    
    if (workouts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No workouts found</h3>
                <p>Try adjusting your filters or <a href="log-workout.html">log a workout</a>!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = workouts.map(workout => {
        // Group exercises by exercise_id and exercise_order
        const exerciseGroups = {};
        
        workout.workout_exercises.forEach(we => {
            const key = `${we.exercise_id}-${we.exercise_order}`;
            if (!exerciseGroups[key]) {
                exerciseGroups[key] = {
                    name: we.exercises.exercise_name,
                    order: we.exercise_order,
                    sets: []
                };
            }
            exerciseGroups[key].sets.push({
                set_number: we.set_number || exerciseGroups[key].sets.length + 1,
                reps: we.reps,
                weight: we.weight
            });
        });

        const sortedExercises = Object.values(exerciseGroups).sort((a, b) => a.order - b.order);

        // Format date and time
        const dateStr = formatDate(workout.workout_date);
        const timeStr = workout.workout_time ? ` at ${formatTime(workout.workout_time)}` : '';

        return `
            <div class="workout-card">
                <div class="workout-header">
                    <div>
                        <div class="workout-date">${dateStr}${timeStr}</div>
                        <div class="workout-athlete">👤 ${workout.athletes.name}</div>
                    </div>
                    <div class="workout-header-actions">
                        ${workout.splits ? `<span class="workout-split">${workout.splits.split_name}</span>` : ''}
                        <button class="btn-icon btn-danger" onclick="deleteWorkout(${workout.workout_id}, '${dateStr}${timeStr}')">
                            🗑️
                        </button>
                    </div>
                </div>
                ${workout.duration_minutes ? `<p class="text-muted">⏱️ Duration: ${workout.duration_minutes} minutes</p>` : ''}
                ${workout.notes ? `<p class="text-muted">📝 ${workout.notes}</p>` : ''}
                <div class="exercise-list">
                    ${sortedExercises.map(exercise => `
                        <div class="exercise-item-group">
                            <div class="exercise-name">${exercise.name}</div>
                            <div class="sets-display">
                                ${exercise.sets.map(set => `
                                    <div class="set-display">
                                        <span class="set-label">Set ${set.set_number}:</span>
                                        <span class="set-details">${set.reps} reps ${set.weight ? `× ${set.weight}kg` : ''}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

async function deleteWorkout(workoutId, workoutInfo) {
    if (!confirm(`Are you sure you want to delete the workout from ${workoutInfo}?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        const { error } = await db
            .from('workouts')
            .delete()
            .eq('workout_id', workoutId);

        if (error) throw error;

        showToast('Workout deleted successfully', 'success');
        await loadWorkoutHistory();
    } catch (error) {
        showToast('Error deleting workout: ' + error.message, 'error');
    }
}