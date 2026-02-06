import * as SQLite from 'expo-sqlite';
import { CardioActivity, CardioActivityType } from './schema';

// Activity display config
export const CARDIO_ACTIVITIES: { type: CardioActivityType; label: string; icon: string }[] = [
    { type: 'treadmill', label: 'Treadmill', icon: 'walk-outline' },
    { type: 'bike', label: 'Stationary Bike', icon: 'bicycle-outline' },
    { type: 'rowing', label: 'Rowing', icon: 'boat-outline' },
    { type: 'elliptical', label: 'Elliptical', icon: 'fitness-outline' },
    { type: 'stairmaster', label: 'Stairmaster', icon: 'trending-up-outline' },
    { type: 'running', label: 'Running', icon: 'walk-outline' },
    { type: 'cycling', label: 'Cycling', icon: 'bicycle-outline' },
    { type: 'swimming', label: 'Swimming', icon: 'water-outline' },
    { type: 'walking', label: 'Walking', icon: 'footsteps-outline' },
    { type: 'other', label: 'Other', icon: 'ellipsis-horizontal-outline' },
];

export function getActivityLabel(type: CardioActivityType): string {
    return CARDIO_ACTIVITIES.find(a => a.type === type)?.label || type;
}

export function getActivityIcon(type: CardioActivityType): string {
    return CARDIO_ACTIVITIES.find(a => a.type === type)?.icon || 'fitness-outline';
}

// CRUD Operations

export async function addCardioActivity(
    db: SQLite.SQLiteDatabase,
    workoutId: number,
    activityType: CardioActivityType,
    durationSeconds: number,
    options?: {
        distance_meters?: number;
        calories_burned?: number;
        avg_heart_rate?: number;
        notes?: string;
    }
): Promise<number> {
    // Get order index
    const countResult = await db.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM cardio_activities WHERE workout_id = ?',
        workoutId
    );
    const orderIndex = countResult?.count || 0;

    const result = await db.runAsync(
        `INSERT INTO cardio_activities 
     (workout_id, activity_type, duration_seconds, distance_meters, calories_burned, avg_heart_rate, notes, order_index)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        workoutId,
        activityType,
        durationSeconds,
        options?.distance_meters ?? null,
        options?.calories_burned ?? null,
        options?.avg_heart_rate ?? null,
        options?.notes ?? null,
        orderIndex
    );

    return result.lastInsertRowId;
}

export async function updateCardioActivity(
    db: SQLite.SQLiteDatabase,
    activityId: number,
    updates: Partial<Omit<CardioActivity, 'id' | 'workout_id' | 'order_index'>>
): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.activity_type !== undefined) {
        fields.push('activity_type = ?');
        values.push(updates.activity_type);
    }
    if (updates.duration_seconds !== undefined) {
        fields.push('duration_seconds = ?');
        values.push(updates.duration_seconds);
    }
    if (updates.distance_meters !== undefined) {
        fields.push('distance_meters = ?');
        values.push(updates.distance_meters);
    }
    if (updates.calories_burned !== undefined) {
        fields.push('calories_burned = ?');
        values.push(updates.calories_burned);
    }
    if (updates.avg_heart_rate !== undefined) {
        fields.push('avg_heart_rate = ?');
        values.push(updates.avg_heart_rate);
    }
    if (updates.notes !== undefined) {
        fields.push('notes = ?');
        values.push(updates.notes);
    }

    if (fields.length === 0) return;

    values.push(activityId);
    await db.runAsync(
        `UPDATE cardio_activities SET ${fields.join(', ')} WHERE id = ?`,
        ...values
    );
}

export async function deleteCardioActivity(
    db: SQLite.SQLiteDatabase,
    activityId: number
): Promise<void> {
    await db.runAsync('DELETE FROM cardio_activities WHERE id = ?', activityId);
}

export async function getCardioForWorkout(
    db: SQLite.SQLiteDatabase,
    workoutId: number
): Promise<CardioActivity[]> {
    return await db.getAllAsync<CardioActivity>(
        'SELECT * FROM cardio_activities WHERE workout_id = ? ORDER BY order_index',
        workoutId
    );
}
