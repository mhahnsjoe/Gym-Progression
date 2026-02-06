/**
 * Calculate estimated 1RM using Brzycki formula
 * Accurate for 1-10 rep range
 */
export function calculateE1RM(weight: number, reps: number): number {
    if (reps <= 0 || weight <= 0) return 0;
    if (reps === 1) return weight;
    if (reps > 10) {
        // Less accurate above 10 reps, use Epley
        return Math.round(weight * (1 + reps / 30) * 10) / 10;
    }
    // Brzycki: weight × (36 / (37 - reps))
    return Math.round(weight * (36 / (37 - reps)) * 10) / 10;
}

/**
 * Format seconds as mm:ss or hh:mm:ss
 */
export function formatDuration(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Format meters as km or m
 */
export function formatDistance(meters: number): string {
    if (meters >= 1000) {
        return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${Math.round(meters)} m`;
}

/**
 * Get ISO date for start of week (Monday)
 */
export function getWeekStart(date: Date = new Date()): string {
    const d = new Date(date);
    const day = d.getDay();
    // Adjust to Monday
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const weekStart = new Date(d.setDate(diff));
    weekStart.setHours(0, 0, 0, 0);
    return weekStart.toISOString().split('T')[0];
}

/**
 * Get ISO string for N days ago
 */
export function daysAgo(n: number): string {
    const date = new Date();
    date.setDate(date.getDate() - n);
    date.setHours(0, 0, 0, 0);
    return date.toISOString();
}
