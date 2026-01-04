import * as SQLite from 'expo-sqlite';

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('gym-progression.db');
  
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      note TEXT
    );

    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id INTEGER NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );
  `);

  return db;
}

// Type definitions
export interface Workout {
  id: number;
  started_at: string;
  finished_at: string | null;
  note: string | null;
}

export interface Exercise {
  id: number;
  workout_id: number;
  name: string;
  order_index: number;
}

export interface Set {
  id: number;
  exercise_id: number;
  weight: number;
  reps: number;
  order_index: number;
}

// Extended type for UI display
export interface ExerciseWithSets extends Exercise {
  sets: Set[];
}

export interface WorkoutWithExercises extends Workout {
  exercises: ExerciseWithSets[];
}