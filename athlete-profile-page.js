// ============================================
// Athlete Profile Page Logic
// ============================================

let currentAthleteId = null;
let currentAthlete = null;
let weightChart = null;
let bmiChart = null;

document.addEventListener('DOMContentLoaded', () => {
    // Get athlete ID from URL
    const urlParams = new URLSearchParams(window.location.search);
    currentAthleteId = urlParams.get('id');

    if (!currentAthleteId) {
        showToast('No athlete selected', 'error');
        setTimeout(() => {
            window.location.href = 'athletes.html';
        }, 2000);
        return;
    }

    loadAthleteProfile();
    loadAthleteWorkouts();
    loadWeightHistory();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('edit-profile-btn').addEventListener('click', openEditModal);
    document.getElementById('edit-profile-form').addEventListener('submit', handleSaveProfile);
    document.getElementById('apply-filter-btn').addEventListener('click', loadAthleteWorkouts);
    document.getElementById('reset-filter-btn').addEventListener('click', resetFilters);
    document.getElementById('log-workout-btn').addEventListener('click', () => {
        window.location.href = `log-workout.html?athlete=${currentAthleteId}`;
    });

    // Weight tracking
    document.getElementById('add-weight-btn').addEventListener('click', openWeightModal);
    document.getElementById('weight-form').addEventListener('submit', handleAddWeight);
    document.getElementById('weight-value').addEventListener('input', updateBMIPreview);
    document.getElementById('weight-date').valueAsDate = new Date();

    // Modal close
    document.querySelector('.close').addEventListener('click', () => {
        closeModal('edit-profile-modal');
    });

    document.getElementById('weight-modal-close').addEventListener('click', () => {
        closeModal('weight-modal');
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}

async function loadAthleteProfile() {
    try {
        const { data, error } = await db
            .from('athletes')
            .select('*')
            .eq('athlete_id', currentAthleteId)
            .single();

        if (error) throw error;

        currentAthlete = data;
        displayAthleteProfile(data);
        loadAthleteStats();
    } catch (error) {
        showToast('Error loading athlete profile: ' + error.message, 'error');
        setTimeout(() => {
            window.location.href = 'athletes.html';
        }, 2000);
    }
}

function displayAthleteProfile(athlete) {
    // Update header
    document.getElementById('athlete-name-display').textContent = athlete.name;

    // Display profile details
    const detailsContainer = document.getElementById('profile-details');
    
    const details = [
        { label: '📧 Email', value: athlete.email || 'Not provided' },
        { label: '⚖️ Weight', value: athlete.current_weight ? `${athlete.current_weight} kg` : 'Not provided' },
        { label: '📏 Height', value: athlete.height ? `${athlete.height} cm` : 'Not provided' },
        { label: '🎂 Date of Birth', value: athlete.date_of_birth ? formatDate(athlete.date_of_birth) : 'Not provided' },
        { label: '📅 Joined', value: formatDate(athlete.date_joined) },
        { label: '📝 Notes', value: athlete.notes || 'No notes', fullWidth: true }
    ];

    detailsContainer.innerHTML = details.map(detail => `
        <div class="profile-detail ${detail.fullWidth ? 'full-width' : ''}">
            <span class="detail-label">${detail.label}</span>
            <span class="detail-value">${detail.value}</span>
        </div>
    `).join('');
}

async function loadAthleteStats() {
    try {
        const { data, error } = await db
            .from('workouts')
            .select('workout_date')
            .eq('athlete_id', currentAthleteId)
            .order('workout_date', { ascending: false });

        if (error) throw error;

        const totalWorkouts = data.length;
        const lastWorkout = data.length > 0 ? formatDate(data[0].workout_date) : 'Never';

        document.getElementById('total-workouts-count').textContent = totalWorkouts;
        document.getElementById('last-workout-date').textContent = lastWorkout;
    } catch (error) {
        console.error('Error loading athlete stats:', error);
    }
}

function openEditModal() {
    // Populate form with current data
    document.getElementById('edit-name').value = currentAthlete.name || '';
    document.getElementById('edit-email').value = currentAthlete.email || '';
    document.getElementById('edit-weight').value = currentAthlete.current_weight || '';
    document.getElementById('edit-height').value = currentAthlete.height || '';
    document.getElementById('edit-dob').value = currentAthlete.date_of_birth || '';
    document.getElementById('edit-notes').value = currentAthlete.notes || '';

    openModal('edit-profile-modal');
}

async function handleSaveProfile(e) {
    e.preventDefault();

    const updatedData = {
        name: document.getElementById('edit-name').value,
        email: document.getElementById('edit-email').value || null,
        current_weight: parseFloat(document.getElementById('edit-weight').value) || null,
        height: parseFloat(document.getElementById('edit-height').value) || null,
        date_of_birth: document.getElementById('edit-dob').value || null,
        notes: document.getElementById('edit-notes').value || null
    };

    try {
        const { error } = await db
            .from('athletes')
            .update(updatedData)
            .eq('athlete_id', currentAthleteId);

        if (error) throw error;

        showToast('Profile updated successfully!', 'success');
        closeModal('edit-profile-modal');
        await loadAthleteProfile();
    } catch (error) {
        showToast('Error updating profile: ' + error.message, 'error');
    }
}

function resetFilters() {
    document.getElementById('filter-date-from').value = '';
    document.getElementById('filter-date-to').value = '';
    loadAthleteWorkouts();
}

async function loadAthleteWorkouts() {
    try {
        let query = db
            .from('workouts')
            .select(`
                *,
                splits (split_name),
                workout_exercises (
                    *,
                    exercises (exercise_name)
                )
            `)
            .eq('athlete_id', currentAthleteId)
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

        displayWorkouts(data);
    } catch (error) {
        showToast('Error loading workouts: ' + error.message, 'error');
    }
}

function displayWorkouts(workouts) {
    const container = document.getElementById('athlete-workouts-list');
    
    if (workouts.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <h3>No workouts logged yet</h3>
                <p>Start tracking progress by logging a workout!</p>
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
                duration_seconds: we.duration_seconds,
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
                                        <span class="set-details">${formatSetAmount(set)} ${set.weight ? `× ${set.weight}kg` : ''}</span>
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
        await loadAthleteWorkouts();
        await loadAthleteStats();
    } catch (error) {
        showToast('Error deleting workout: ' + error.message, 'error');
    }
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}

// ============================================
// Weight Tracking Functions
// ============================================

function calculateBMI(weight, height) {
    if (!weight || !height) return null;
    // height in cm, convert to meters
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
}

function getBMICategory(bmi) {
    if (!bmi) return { category: 'Unknown', color: '#666' };
    
    if (bmi < 18.5) return { category: 'Underweight', color: '#3b82f6' };
    if (bmi < 25) return { category: 'Normal', color: '#10b981' };
    if (bmi < 30) return { category: 'Overweight', color: '#f59e0b' };
    return { category: 'Obese', color: '#ef4444' };
}

async function loadWeightHistory() {
    try {
        const { data, error } = await db
            .from('weight_history')
            .select('*')
            .eq('athlete_id', currentAthleteId)
            .order('recorded_date', { ascending: true });

        if (error) throw error;

        displayWeightStats(data);
        createWeightChart(data);
        createBMIChart(data);
    } catch (error) {
        console.error('Error loading weight history:', error);
    }
}

function displayWeightStats(weightHistory) {
    const startingWeight = currentAthlete.starting_weight || (weightHistory.length > 0 ? weightHistory[0].weight : null);
    const currentWeight = currentAthlete.current_weight || (weightHistory.length > 0 ? weightHistory[weightHistory.length - 1].weight : null);
    
    // Display starting weight
    document.getElementById('starting-weight-display').textContent = 
        startingWeight ? `${startingWeight} kg` : 'Not set';
    
    // Display current weight
    document.getElementById('current-weight-display').textContent = 
        currentWeight ? `${currentWeight} kg` : 'Not set';
    
    // Calculate weight change
    if (startingWeight && currentWeight) {
        const change = (currentWeight - startingWeight).toFixed(1);
        const changeElement = document.getElementById('weight-change-display');
        changeElement.textContent = `${change > 0 ? '+' : ''}${change} kg`;
        changeElement.style.color = change < 0 ? '#10b981' : change > 0 ? '#ef4444' : '#666';
    } else {
        document.getElementById('weight-change-display').textContent = '-';
    }
    
    // Calculate and display BMI
    if (currentWeight && currentAthlete.height) {
        const bmi = calculateBMI(currentWeight, currentAthlete.height);
        const bmiInfo = getBMICategory(parseFloat(bmi));
        
        document.getElementById('current-bmi-display').textContent = bmi;
        const categoryElement = document.getElementById('bmi-category-display');
        categoryElement.textContent = bmiInfo.category;
        categoryElement.style.color = bmiInfo.color;
    } else {
        document.getElementById('current-bmi-display').textContent = '-';
        document.getElementById('bmi-category-display').textContent = 'Height required';
    }
}

function createWeightChart(weightHistory) {
    const ctx = document.getElementById('weight-chart');
    
    if (weightChart) {
        weightChart.destroy();
    }
    
    if (weightHistory.length === 0) {
        ctx.parentElement.innerHTML = '<p class="text-muted text-center">No weight data yet. Add weight entries to see the chart.</p>';
        return;
    }
    
    weightChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: weightHistory.map(w => formatDate(w.recorded_date)),
            datasets: [{
                label: 'Weight (kg)',
                data: weightHistory.map(w => w.weight),
                borderColor: '#4f46e5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: function(value) {
                            return value + ' kg';
                        }
                    }
                }
            }
        }
    });
}

function createBMIChart(weightHistory) {
    const ctx = document.getElementById('bmi-chart');
    
    if (bmiChart) {
        bmiChart.destroy();
    }
    
    if (weightHistory.length === 0 || !currentAthlete.height) {
        ctx.parentElement.innerHTML = '<p class="text-muted text-center">Height required for BMI calculation</p>';
        return;
    }
    
    const bmiData = weightHistory.map(w => ({
        date: w.recorded_date,
        bmi: calculateBMI(w.weight, currentAthlete.height)
    }));
    
    bmiChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: bmiData.map(b => formatDate(b.date)),
            datasets: [{
                label: 'BMI',
                data: bmiData.map(b => b.bmi),
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

function openWeightModal() {
    document.getElementById('weight-date').valueAsDate = new Date();
    document.getElementById('weight-value').value = '';
    document.getElementById('weight-notes').value = '';
    updateBMIPreview();
    openModal('weight-modal');
}

function updateBMIPreview() {
    const weight = parseFloat(document.getElementById('weight-value').value);
    const height = currentAthlete?.height;
    
    if (weight && height) {
        const bmi = calculateBMI(weight, height);
        const bmiInfo = getBMICategory(parseFloat(bmi));
        
        document.querySelector('.bmi-preview .bmi-value').textContent = bmi;
        document.querySelector('.bmi-preview .bmi-cat').textContent = bmiInfo.category;
        document.querySelector('.bmi-preview .bmi-cat').style.color = bmiInfo.color;
    } else {
        document.querySelector('.bmi-preview .bmi-value').textContent = '-';
        document.querySelector('.bmi-preview .bmi-cat').textContent = height ? 'Enter weight' : 'Height required';
        document.querySelector('.bmi-preview .bmi-cat').style.color = '#666';
    }
}

async function handleAddWeight(e) {
    e.preventDefault();
    
    const weight = parseFloat(document.getElementById('weight-value').value);
    const date = document.getElementById('weight-date').value;
    const notes = document.getElementById('weight-notes').value || null;
    const bmi = currentAthlete.height ? calculateBMI(weight, currentAthlete.height) : null;
    
    try {
        // Insert weight entry
        const { error: weightError } = await db
            .from('weight_history')
            .insert([{
                athlete_id: currentAthleteId,
                weight: weight,
                recorded_date: date,
                bmi: bmi,
                notes: notes
            }]);
        
        if (weightError) throw weightError;
        
        // Update current_weight in athletes table
        const { error: updateError } = await db
            .from('athletes')
            .update({ current_weight: weight })
            .eq('athlete_id', currentAthleteId);
        
        if (updateError) throw updateError;
        
        // If this is the first weight entry and no starting weight, set it
        if (!currentAthlete.starting_weight) {
            const { error: startError } = await db
                .from('athletes')
                .update({ starting_weight: weight })
                .eq('athlete_id', currentAthleteId);
            
            if (startError) throw startError;
        }
        
        showToast('Weight entry added successfully!', 'success');
        closeModal('weight-modal');
        await loadAthleteProfile();
        await loadWeightHistory();
    } catch (error) {
        showToast('Error adding weight entry: ' + error.message, 'error');
    }
}