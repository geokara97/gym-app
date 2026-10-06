// ============================================
// Shared Configuration
// ============================================
// TODO: Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://irjcsmywlfahbckibbps.supabase.co';
const SUPABASE_ANON_KEY = `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlyamNzbXl3bGZhaGJja2liYnBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyOTMwMjIsImV4cCI6MjEwNjg2OTAyMn0.V7tQB72dck_pZ0WA_6zoSdH2hdsboGbJOp5YxFEeTtg`;
// Initialize Supabase client
const { createClient } = window.supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// Utility Functions (shared across pages)
// ============================================

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
        return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Yesterday';
    } else {
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
}

function formatDateTime(dateTimeString) {
    const date = new Date(dateTimeString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatTime(timeString) {
    if (!timeString) return '';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
}

// "12 reps" for rep-based sets, "45 sec" / "2 min 30 sec" for timed sets
function formatSetAmount(set) {
    if (set.duration_seconds) {
        const minutes = Math.floor(set.duration_seconds / 60);
        const seconds = set.duration_seconds % 60;
        if (minutes === 0) return `${seconds} sec`;
        return seconds ? `${minutes} min ${seconds} sec` : `${minutes} min`;
    }
    return `${set.reps} reps`;
}