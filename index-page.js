// ============================================
// Dashboard Page Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadDashboardStats();
});

async function loadDashboardStats() {
    try {
        // Get total athletes
        const { data: athletes, error: athletesError } = await db
            .from('athletes')
            .select('athlete_id', { count: 'exact' })
            .eq('is_active', true);
        
        if (athletesError) throw athletesError;
        document.getElementById('total-athletes').textContent = athletes.length;

        // Get total workouts
        const { data: workouts, error: workoutsError } = await db
            .from('workouts')
            .select('workout_id', { count: 'exact' });
        
        if (workoutsError) throw workoutsError;
        document.getElementById('total-workouts').textContent = workouts.length;

        // Get workouts this week
        const today = new Date();
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const { data: weekWorkouts, error: weekError } = await db
            .from('workouts')
            .select('workout_id', { count: 'exact' })
            .gte('workout_date', weekAgo.toISOString().split('T')[0]);
        
        if (weekError) throw weekError;
        document.getElementById('workouts-this-week').textContent = weekWorkouts.length;

        // Get total exercises
        const { data: exercises, error: exercisesError } = await db
            .from('exercises')
            .select('exercise_id', { count: 'exact' })
            .eq('is_active', true);
        
        if (exercisesError) throw exercisesError;
        document.getElementById('total-exercises').textContent = exercises.length;

    } catch (error) {
        console.error('Error loading dashboard stats:', error);
        showToast('Error loading dashboard statistics', 'error');
    }
}