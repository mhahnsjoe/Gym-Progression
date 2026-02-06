import * as SQLite from 'expo-sqlite';
import { PersonalRecord, Workout } from './schema';
import { calculateE1RM, daysAgo, getWeekStart } from '../utils/calculations';

// =====================================================
// MUSCLE GROUP MAPPING
// =====================================================

const EXERCISE_MUSCLES: Record<string, { muscle: string; type: string }> = {
    // Chest
    'bench press': { muscle: 'chest', type: 'push' },
    'incline bench press': { muscle: 'chest', type: 'push' },
    'dumbbell bench press': { muscle: 'chest', type: 'push' },
    'dumbbell fly': { muscle: 'chest', type: 'push' },
    'cable fly': { muscle: 'chest', type: 'push' },
    'push-ups': { muscle: 'chest', type: 'push' },
    // Back
    'deadlift': { muscle: 'back', type: 'pull' },
    'barbell row': { muscle: 'back', type: 'pull' },
    'bent over row': { muscle: 'back', type: 'pull' },
    'pull-ups': { muscle: 'back', type: 'pull' },
    'chin-ups': { muscle: 'back', type: 'pull' },
    'lat pulldown': { muscle: 'back', type: 'pull' },
    'seated row': { muscle: 'back', type: 'pull' },
    'dumbbell row': { muscle: 'back', type: 'pull' },
    // Shoulders
    'overhead press': { muscle: 'shoulders', type: 'push' },
    'military press': { muscle: 'shoulders', type: 'push' },
    'dumbbell shoulder press': { muscle: 'shoulders', type: 'push' },
    'lateral raise': { muscle: 'shoulders', type: 'isolation' },
    'front raise': { muscle: 'shoulders', type: 'isolation' },
    'face pull': { muscle: 'shoulders', type: 'pull' },
    // Legs
    'squat': { muscle: 'quadriceps', type: 'legs' },
    'back squat': { muscle: 'quadriceps', type: 'legs' },
    'front squat': { muscle: 'quadriceps', type: 'legs' },
    'leg press': { muscle: 'quadriceps', type: 'legs' },
    'leg extension': { muscle: 'quadriceps', type: 'isolation' },
    'leg curl': { muscle: 'hamstrings', type: 'isolation' },
    'romanian deadlift': { muscle: 'hamstrings', type: 'legs' },
    'lunge': { muscle: 'quadriceps', type: 'legs' },
    'bulgarian split squat': { muscle: 'quadriceps', type: 'legs' },
    'hip thrust': { muscle: 'glutes', type: 'legs' },
    'calf raise': { muscle: 'calves', type: 'isolation' },
    // Arms
    'dumbbell curl': { muscle: 'biceps', type: 'pull' },
    'barbell curl': { muscle: 'biceps', type: 'pull' },
    'hammer curl': { muscle: 'biceps', type: 'pull' },
    'tricep pushdown': { muscle: 'triceps', type: 'push' },
    'tricep extension': { muscle: 'triceps', type: 'push' },
    'skull crusher': { muscle: 'triceps', type: 'push' },
    'dips': { muscle: 'triceps', type: 'push' },
    // Core
    'plank': { muscle: 'core', type: 'isolation' },
    'crunch': { muscle: 'core', type: 'isolation' },
    'leg raise': { muscle: 'core', type: 'isolation' },
    'cable crunch': { muscle: 'core', type: 'isolation' },
};

export function getMuscleGroup(exerciseName: string): string {
    const normalized = exerciseName.toLowerCase().trim();
    return EXERCISE_MUSCLES[normalized]?.muscle || 'other';
}

// =====================================================
// PERSONAL RECORDS
// =====================================================

/**
 * Check if a set is a new PR and record it
 * Returns the PR if new, null otherwise
 */
export async function checkAndRecordPR(
    db: SQLite.SQLiteDatabase,
    exerciseName: string,
    weight: number,
    reps: number,
    workoutId: number
): Promise<PersonalRecord | null> {
    if (weight <= 0 || reps <= 0) return null;

    const e1rm = calculateE1RM(weight, reps);
    const normalized = exerciseName.toLowerCase().trim();

    // Get current best e1RM for this exercise
    const currentBest = await db.getFirstAsync<{ estimated_1rm: number }>(
        `SELECT MAX(estimated_1rm) as estimated_1rm FROM personal_records 
     WHERE exercise_name = ? COLLATE NOCASE`,
        normalized
    );

    // Only record if it's a new PR
    if (!currentBest || !currentBest.estimated_1rm || e1rm > currentBest.estimated_1rm) {
        const result = await db.runAsync(
            `INSERT INTO personal_records (exercise_name, weight, reps, estimated_1rm, achieved_at, workout_id)
       VALUES (?, ?, ?, ?, ?, ?)`,
            normalized,
            weight,
            reps,
            e1rm,
            new Date().toISOString(),
            workoutId
        );

        return {
            id: result.lastInsertRowId,
            exercise_name: normalized,
            weight,
            reps,
            estimated_1rm: e1rm,
            achieved_at: new Date().toISOString(),
            workout_id: workoutId,
        };
    }

    return null;
}

/**
 * Get current PR for an exercise
 */
export async function getExercisePR(
    db: SQLite.SQLiteDatabase,
    exerciseName: string
): Promise<PersonalRecord | null> {
    return await db.getFirstAsync<PersonalRecord>(
        `SELECT * FROM personal_records 
     WHERE exercise_name = ? COLLATE NOCASE 
     ORDER BY estimated_1rm DESC 
     LIMIT 1`,
        exerciseName.toLowerCase().trim()
    );
}

/**
 * Get all PRs (one per exercise, the best)
 */
export async function getAllPRs(db: SQLite.SQLiteDatabase): Promise<PersonalRecord[]> {
    return await db.getAllAsync<PersonalRecord>(
        `SELECT pr.* FROM personal_records pr
     INNER JOIN (
       SELECT exercise_name, MAX(estimated_1rm) as max_e1rm
       FROM personal_records
       GROUP BY exercise_name
     ) best ON pr.exercise_name = best.exercise_name 
            AND pr.estimated_1rm = best.max_e1rm
     ORDER BY pr.exercise_name`
    );
}

/**
 * Get recent PRs (last N days)
 */
export async function getRecentPRs(
    db: SQLite.SQLiteDatabase,
    days: number = 30
): Promise<PersonalRecord[]> {
    return await db.getAllAsync<PersonalRecord>(
        `SELECT * FROM personal_records 
     WHERE achieved_at >= ? 
     ORDER BY achieved_at DESC`,
        daysAgo(days)
    );
}

// =====================================================
// STRENGTH STATS (Only counts workouts with strength exercises)
// =====================================================

/**
 * Get IDs of workouts that have at least one strength exercise
 */
async function getStrengthWorkoutIds(db: SQLite.SQLiteDatabase, since?: string): Promise<number[]> {
    const query = since
        ? `SELECT DISTINCT w.id FROM workouts w
       JOIN exercises e ON e.workout_id = w.id
       JOIN sets s ON s.exercise_id = e.id
       WHERE w.finished_at IS NOT NULL AND w.started_at >= ? AND s.weight > 0`
        : `SELECT DISTINCT w.id FROM workouts w
       JOIN exercises e ON e.workout_id = w.id
       JOIN sets s ON s.exercise_id = e.id
       WHERE w.finished_at IS NOT NULL AND s.weight > 0`;

    const results = await db.getAllAsync<{ id: number }>(query, since ? [since] : []);
    return results.map(r => r.id);
}

/**
 * Get total strength volume (weight × reps) for a period
 * ONLY counts workouts that have strength exercises
 */
export async function getTotalStrengthVolume(
    db: SQLite.SQLiteDatabase,
    days?: number
): Promise<number> {
    const since = days ? daysAgo(days) : undefined;
    const workoutIds = await getStrengthWorkoutIds(db, since);

    if (workoutIds.length === 0) return 0;

    const result = await db.getFirstAsync<{ volume: number }>(
        `SELECT SUM(s.weight * s.reps) as volume
     FROM sets s
     JOIN exercises e ON e.id = s.exercise_id
     WHERE e.workout_id IN (${workoutIds.join(',')}) AND s.weight > 0`
    );

    return Math.round(result?.volume || 0);
}

/**
 * Get strength workout count for a period
 */
export async function getStrengthWorkoutCount(
    db: SQLite.SQLiteDatabase,
    days?: number
): Promise<number> {
    const since = days ? daysAgo(days) : undefined;
    const workoutIds = await getStrengthWorkoutIds(db, since);
    return workoutIds.length;
}

/**
 * Get weekly strength workout counts for chart
 */
export async function getWeeklyStrengthWorkouts(
    db: SQLite.SQLiteDatabase,
    weeks: number = 8
): Promise<{ week: string; count: number }[]> {
    const since = daysAgo(weeks * 7);
    const workoutIds = await getStrengthWorkoutIds(db, since);

    if (workoutIds.length === 0) return [];

    const workouts = await db.getAllAsync<{ started_at: string }>(
        `SELECT started_at FROM workouts WHERE id IN (${workoutIds.join(',')})`
    );

    // Group by week
    const weekCounts = new Map<string, number>();
    for (const w of workouts) {
        const week = getWeekStart(new Date(w.started_at));
        weekCounts.set(week, (weekCounts.get(week) || 0) + 1);
    }

    return Array.from(weekCounts.entries())
        .map(([week, count]) => ({ week, count }))
        .sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Get volume by muscle group for a period
 */
export async function getMuscleVolumeDistribution(
    db: SQLite.SQLiteDatabase,
    days: number = 30
): Promise<{ muscle: string; volume: number; percentage: number }[]> {
    const since = daysAgo(days);

    const exercises = await db.getAllAsync<{ name: string; volume: number }>(
        `SELECT e.name, SUM(s.weight * s.reps) as volume
     FROM exercises e
     JOIN sets s ON s.exercise_id = e.id
     JOIN workouts w ON w.id = e.workout_id
     WHERE w.finished_at IS NOT NULL AND w.started_at >= ? AND s.weight > 0
     GROUP BY e.name`,
        since
    );

    const muscleVolume = new Map<string, number>();
    let total = 0;

    for (const ex of exercises) {
        const muscle = getMuscleGroup(ex.name);
        muscleVolume.set(muscle, (muscleVolume.get(muscle) || 0) + ex.volume);
        total += ex.volume;
    }

    return Array.from(muscleVolume.entries())
        .map(([muscle, volume]) => ({
            muscle,
            volume: Math.round(volume),
            percentage: total > 0 ? Math.round((volume / total) * 100) : 0,
        }))
        .sort((a, b) => b.volume - a.volume);
}

/**
 * Get e1RM progression for an exercise
 */
export async function getE1RMProgression(
    db: SQLite.SQLiteDatabase,
    exerciseName: string,
    days: number = 90
): Promise<{ date: string; e1rm: number }[]> {
    const since = daysAgo(days);

    // Get best set per workout day
    const results = await db.getAllAsync<{ date: string; weight: number; reps: number }>(
        `SELECT DATE(w.started_at) as date, s.weight, s.reps
     FROM sets s
     JOIN exercises e ON e.id = s.exercise_id
     JOIN workouts w ON w.id = e.workout_id
     WHERE e.name = ? COLLATE NOCASE 
       AND w.finished_at IS NOT NULL 
       AND w.started_at >= ?
       AND s.weight > 0
     ORDER BY w.started_at, (s.weight * (36.0 / (37 - s.reps))) DESC`,
        exerciseName.toLowerCase().trim(),
        since
    );

    // Get best e1RM per day
    const dayBest = new Map<string, number>();
    for (const r of results) {
        const e1rm = calculateE1RM(r.weight, r.reps);
        const current = dayBest.get(r.date) || 0;
        if (e1rm > current) {
            dayBest.set(r.date, e1rm);
        }
    }

    return Array.from(dayBest.entries())
        .map(([date, e1rm]) => ({ date, e1rm }))
        .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get list of exercises user has done (for selection)
 */
export async function getExercisesList(db: SQLite.SQLiteDatabase): Promise<string[]> {
    const results = await db.getAllAsync<{ name: string }>(
        `SELECT DISTINCT name FROM exercises 
     WHERE workout_id IN (SELECT id FROM workouts WHERE finished_at IS NOT NULL)
     ORDER BY name`
    );
    return results.map(r => r.name);
}

// =====================================================
// CARDIO STATS (Only counts workouts with cardio)
// =====================================================

/**
 * Get total cardio duration for a period
 */
export async function getTotalCardioDuration(
    db: SQLite.SQLiteDatabase,
    days?: number
): Promise<number> {
    const query = days
        ? `SELECT SUM(c.duration_seconds) as total
       FROM cardio_activities c
       JOIN workouts w ON w.id = c.workout_id
       WHERE w.finished_at IS NOT NULL AND w.started_at >= ?`
        : `SELECT SUM(c.duration_seconds) as total
       FROM cardio_activities c
       JOIN workouts w ON w.id = c.workout_id
       WHERE w.finished_at IS NOT NULL`;

    const result = await db.getFirstAsync<{ total: number }>(
        query,
        days ? [daysAgo(days)] : []
    );

    return result?.total || 0;
}

/**
 * Get cardio workout count for a period
 */
export async function getCardioWorkoutCount(
    db: SQLite.SQLiteDatabase,
    days?: number
): Promise<number> {
    const query = days
        ? `SELECT COUNT(DISTINCT c.workout_id) as count
       FROM cardio_activities c
       JOIN workouts w ON w.id = c.workout_id
       WHERE w.finished_at IS NOT NULL AND w.started_at >= ?`
        : `SELECT COUNT(DISTINCT c.workout_id) as count
       FROM cardio_activities c
       JOIN workouts w ON w.id = c.workout_id
       WHERE w.finished_at IS NOT NULL`;

    const result = await db.getFirstAsync<{ count: number }>(
        query,
        days ? [daysAgo(days)] : []
    );

    return result?.count || 0;
}

/**
 * Get weekly cardio minutes for chart
 */
export async function getWeeklyCardioMinutes(
    db: SQLite.SQLiteDatabase,
    weeks: number = 8
): Promise<{ week: string; minutes: number }[]> {
    const since = daysAgo(weeks * 7);

    const results = await db.getAllAsync<{ started_at: string; duration: number }>(
        `SELECT w.started_at, c.duration_seconds as duration
     FROM cardio_activities c
     JOIN workouts w ON w.id = c.workout_id
     WHERE w.finished_at IS NOT NULL AND w.started_at >= ?`,
        since
    );

    const weekMinutes = new Map<string, number>();
    for (const r of results) {
        const week = getWeekStart(new Date(r.started_at));
        weekMinutes.set(week, (weekMinutes.get(week) || 0) + r.duration);
    }

    return Array.from(weekMinutes.entries())
        .map(([week, seconds]) => ({ week, minutes: Math.round(seconds / 60) }))
        .sort((a, b) => a.week.localeCompare(b.week));
}

/**
 * Get cardio by activity type for a period
 */
export async function getCardioDistribution(
    db: SQLite.SQLiteDatabase,
    days: number = 30
): Promise<{ type: string; duration: number; percentage: number }[]> {
    const since = daysAgo(days);

    const results = await db.getAllAsync<{ type: string; duration: number }>(
        `SELECT c.activity_type as type, SUM(c.duration_seconds) as duration
     FROM cardio_activities c
     JOIN workouts w ON w.id = c.workout_id
     WHERE w.finished_at IS NOT NULL AND w.started_at >= ?
     GROUP BY c.activity_type`,
        since
    );

    let total = 0;
    for (const r of results) {
        total += r.duration;
    }

    return results
        .map(r => ({
            type: r.type,
            duration: r.duration,
            percentage: total > 0 ? Math.round((r.duration / total) * 100) : 0,
        }))
        .sort((a, b) => b.duration - a.duration);
}

/**
 * Get total cardio calories burned for a period
 */
export async function getTotalCardioCalories(
    db: SQLite.SQLiteDatabase,
    days?: number
): Promise<number> {
    const query = days
        ? `SELECT SUM(c.calories_burned) as total
       FROM cardio_activities c
       JOIN workouts w ON w.id = c.workout_id
       WHERE w.finished_at IS NOT NULL AND w.started_at >= ?`
        : `SELECT SUM(c.calories_burned) as total
       FROM cardio_activities c
       JOIN workouts w ON w.id = c.workout_id
       WHERE w.finished_at IS NOT NULL`;

    const result = await db.getFirstAsync<{ total: number }>(
        query,
        days ? [daysAgo(days)] : []
    );

    return result?.total || 0;
}
