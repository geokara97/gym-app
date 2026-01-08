// ============================================
// Athletes Page Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadAthletes();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('add-athlete-btn').addEventListener('click', () => {
        openModal('athlete-modal');
    });
    
    document.getElementById('athlete-form').addEventListener('submit', handleAddAthlete);

    // Modal close button
    document.querySelector('.close').addEventListener('click', () => {
        closeModal('athlete-modal');
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('show');
        }
    });
}

async function loadAthletes() {
    try {
        const { data, error } = await db
            .from('athletes')
            .select('*')
            .eq('is_active', true)
            .order('name');

        if (error) throw error;

        displayAthletes(data);
    } catch (error) {
        showToast('Error loading athletes: ' + error.message, 'error');
    }
}

function displayAthletes(athletes) {
    const container = document.getElementById('athletes-list');
    
    if (athletes.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">🏃</div>
                <h3>No athletes yet</h3>
                <p>Add your first athlete to get started!</p>
            </div>
        `;
        return;
    }

    container.innerHTML = athletes.map(athlete => `
        <div class="athlete-card">
            <div class="athlete-card-header">
                <h3 onclick="viewAthleteProfile(${athlete.athlete_id})">${athlete.name}</h3>
                <button class="btn-icon btn-danger" onclick="deleteAthlete(event, ${athlete.athlete_id}, '${athlete.name.replace(/'/g, "\\'")}')">
                    🗑️
                </button>
            </div>
            ${athlete.email ? `<p class="athlete-info">📧 ${athlete.email}</p>` : ''}
            ${athlete.current_weight ? `<p class="athlete-info">⚖️ ${athlete.current_weight} kg</p>` : ''}
            ${athlete.height ? `<p class="athlete-info">📏 ${athlete.height} cm</p>` : ''}
            ${athlete.notes ? `<p class="athlete-info">📝 ${athlete.notes}</p>` : ''}
            <div class="athlete-stats">
                <div class="stat">
                    <div class="stat-value" id="workouts-${athlete.athlete_id}">-</div>
                    <div class="stat-label">Workouts</div>
                </div>
                <div class="stat">
                    <div class="stat-value" id="last-workout-${athlete.athlete_id}">-</div>
                    <div class="stat-label">Last Workout</div>
                </div>
            </div>
        </div>
    `).join('');

    // Load stats for each athlete
    athletes.forEach(athlete => loadAthleteStats(athlete.athlete_id));
}

async function loadAthleteStats(athleteId) {
    try {
        const { data, error } = await db
            .from('workouts')
            .select('workout_date')
            .eq('athlete_id', athleteId)
            .order('workout_date', { ascending: false });

        if (error) throw error;

        const workoutsCount = data.length;
        const lastWorkout = data.length > 0 ? formatDate(data[0].workout_date) : 'Never';

        document.getElementById(`workouts-${athleteId}`).textContent = workoutsCount;
        document.getElementById(`last-workout-${athleteId}`).textContent = lastWorkout;
    } catch (error) {
        console.error('Error loading athlete stats:', error);
    }
}

async function handleAddAthlete(e) {
    e.preventDefault();

    const athleteData = {
        name: document.getElementById('athlete-name').value,
        email: document.getElementById('athlete-email').value || null,
        current_weight: parseFloat(document.getElementById('athlete-weight').value) || null,
        height: parseFloat(document.getElementById('athlete-height').value) || null,
        notes: document.getElementById('athlete-notes').value || null
    };

    try {
        const { error } = await db
            .from('athletes')
            .insert([athleteData]);

        if (error) throw error;

        showToast('Athlete added successfully!', 'success');
        closeModal('athlete-modal');
        document.getElementById('athlete-form').reset();
        await loadAthletes();
    } catch (error) {
        showToast('Error adding athlete: ' + error.message, 'error');
    }
}

async function deleteAthlete(event, athleteId, athleteName) {
    event.stopPropagation();
    
    if (!confirm(`Are you sure you want to delete ${athleteName}?\n\nThis will also delete all their workout history. This action cannot be undone.`)) {
        return;
    }

    try {
        const { error } = await db
            .from('athletes')
            .delete()
            .eq('athlete_id', athleteId);

        if (error) throw error;

        showToast(`${athleteName} deleted successfully`, 'success');
        await loadAthletes();
    } catch (error) {
        showToast('Error deleting athlete: ' + error.message, 'error');
    }
}

function viewAthleteProfile(athleteId) {
    window.location.href = `athlete-profile.html?id=${athleteId}`;
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('show');
}

function closeModal(modalId) {
    document.getElementById(modalId).classList.remove('show');
}