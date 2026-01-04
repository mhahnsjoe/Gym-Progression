import * as SQLite from 'expo-sqlite';
import { Workout, Exercise, Set, WorkoutWithExercises, ExerciseWithSets } from './schema';

// Workout operations
export async function createWorkout(db: SQLite.SQLiteDatabase): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO workouts (started_at) VALUES (?)',
    new Date().toISOString()
  );
  return result.lastInsertRowId;
}

export async function finishWorkout(db: SQLite.SQLiteDatabase, workoutId: number, note?: string): Promise<void> {
  await db.runAsync(
    'UPDATE workouts SET finished_at = ?, note = ? WHERE id = ?',
    new Date().toISOString(),
    note || null,
    workoutId
  );
}

export async function deleteWorkout(db: SQLite.SQLiteDatabase, workoutId: number): Promise<void> {
  await db.runAsync('DELETE FROM workouts WHERE id = ?', workoutId);
}

export async function getRecentWorkouts(db: SQLite.SQLiteDatabase, limit = 10): Promise<Workout[]> {
  return await db.getAllAsync<Workout>(
    'SELECT * FROM workouts WHERE finished_at IS NOT NULL ORDER BY started_at DESC LIMIT ?',
    limit
  );
}

export async function getWorkoutWithExercises(db: SQLite.SQLiteDatabase, workoutId: number): Promise<WorkoutWithExercises | null> {
  const workout = await db.getFirstAsync<Workout>(
    'SELECT * FROM workouts WHERE id = ?',
    workoutId
  );
  
  if (!workout) return null;

  const exercises = await db.getAllAsync<Exercise>(
    'SELECT * FROM exercises WHERE workout_id = ? ORDER BY order_index',
    workoutId
  );

  const exercisesWithSets: ExerciseWithSets[] = await Promise.all(
    exercises.map(async (exercise) => {
      const sets = await db.getAllAsync<Set>(
        'SELECT * FROM sets WHERE exercise_id = ? ORDER BY order_index',
        exercise.id
      );
      return { ...exercise, sets };
    })
  );

  return { ...workout, exercises: exercisesWithSets };
}

// Exercise operations
export async function addExercise(db: SQLite.SQLiteDatabase, workoutId: number, name: string): Promise<number> {
  const countResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises WHERE workout_id = ?',
    workoutId
  );
  const orderIndex = countResult?.count || 0;

  const result = await db.runAsync(
    'INSERT INTO exercises (workout_id, name, order_index) VALUES (?, ?, ?)',
    workoutId,
    name,
    orderIndex
  );
  return result.lastInsertRowId;
}

export async function deleteExercise(db: SQLite.SQLiteDatabase, exerciseId: number): Promise<void> {
  await db.runAsync('DELETE FROM exercises WHERE id = ?', exerciseId);
}

// Set operations
export async function addSet(db: SQLite.SQLiteDatabase, exerciseId: number, weight: number, reps: number): Promise<number> {
  const countResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM sets WHERE exercise_id = ?',
    exerciseId
  );
  const orderIndex = countResult?.count || 0;

  const result = await db.runAsync(
    'INSERT INTO sets (exercise_id, weight, reps, order_index) VALUES (?, ?, ?, ?)',
    exerciseId,
    weight,
    reps,
    orderIndex
  );
  return result.lastInsertRowId;
}

export async function updateSet(db: SQLite.SQLiteDatabase, setId: number, weight: number, reps: number): Promise<void> {
  await db.runAsync(
    'UPDATE sets SET weight = ?, reps = ? WHERE id = ?',
    weight,
    reps,
    setId
  );
}

export async function deleteSet(db: SQLite.SQLiteDatabase, setId: number): Promise<void> {
  await db.runAsync('DELETE FROM sets WHERE id = ?', setId);
}