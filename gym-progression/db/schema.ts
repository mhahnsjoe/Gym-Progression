import * as SQLite from 'expo-sqlite';

export async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync('gym-progression.db');

  // Enable foreign keys
  await db.execAsync('PRAGMA foreign_keys = ON;');

  // Create core tables
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      note TEXT,
      program_id INTEGER,
      program_day_index INTEGER,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      note TEXT,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id INTEGER NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      order_index INTEGER NOT NULL,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id) ON DELETE CASCADE
    );
  `);

  // Create template tables (added in v2)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS template_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      default_sets INTEGER NOT NULL DEFAULT 3,
      note TEXT,
      FOREIGN KEY (template_id) REFERENCES templates(id) ON DELETE CASCADE
    );
  `);

  // Check if workouts table has program_id column
  const tableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(workouts);');
  const hasProgramId = tableInfo.some(col => col.name === 'program_id');

  if (!hasProgramId) {
    try {
      await db.execAsync('ALTER TABLE workouts ADD COLUMN program_id INTEGER;');
      await db.execAsync('ALTER TABLE workouts ADD COLUMN program_day_index INTEGER;');
    } catch (e) {
      console.log('Column migration failed or already exists', e);
    }
  }

  // Create program tables (added in v3)
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 0,
      image_index INTEGER DEFAULT 0,
      image_uri TEXT
    );
  `);

  // Check if programs table has image_index column
  const programTableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(programs);');
  const hasImageIndex = programTableInfo.some(col => col.name === 'image_index');

  if (!hasImageIndex) {
    try {
      await db.execAsync('ALTER TABLE programs ADD COLUMN image_index INTEGER DEFAULT 0;');
    } catch (e) {
      console.log('Program image_index column migration failed or already exists', e);
    }
  }

  // Check if programs table has image_uri column
  const hasImageUri = programTableInfo.some(col => col.name === 'image_uri');

  if (!hasImageUri) {
    try {
      await db.execAsync('ALTER TABLE programs ADD COLUMN image_uri TEXT;');
    } catch (e) {
      console.log('Program image_uri column migration failed or already exists', e);
    }
  }

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS program_days (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_id INTEGER NOT NULL,
      template_id INTEGER, -- Keeping for compatibility, but moving to direct exercises
      day_index INTEGER NOT NULL,
      name TEXT NOT NULL,
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE CASCADE
    );
  `);

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS program_day_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      program_day_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      order_index INTEGER NOT NULL,
      default_sets INTEGER NOT NULL DEFAULT 3,
      note TEXT,
      FOREIGN KEY (program_day_id) REFERENCES program_days(id) ON DELETE CASCADE
    );
  `);

  // Phase 1: New tables for v2 plan
  await db.execAsync(`
    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_cardio_workout ON cardio_activities(workout_id);
    CREATE INDEX IF NOT EXISTS idx_pr_exercise ON personal_records(exercise_name);
    CREATE INDEX IF NOT EXISTS idx_pr_e1rm ON personal_records(estimated_1rm);
  `);

  // Check if cardio_activities has calories_burned column
  const cardioTableInfo = await db.getAllAsync<{ name: string }>('PRAGMA table_info(cardio_activities);');
  const hasCaloriesBurned = cardioTableInfo.some(col => col.name === 'calories_burned');

  if (!hasCaloriesBurned) {
    try {
      await db.execAsync('ALTER TABLE cardio_activities ADD COLUMN calories_burned INTEGER;');
    } catch (e) {
      console.log('Cardio calories_burned column migration failed', e);
    }
  }

  return db;
}

// Type definitions
export interface Workout {
  id: number;
  started_at: string;
  finished_at: string | null;
  note: string | null;
  program_id: number | null;
  program_day_index: number | null;
}

export interface Exercise {
  id: number;
  workout_id: number;
  name: string;
  order_index: number;
  note: string | null;
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

// Cardio types
export type CardioActivityType =
  | 'treadmill'
  | 'bike'
  | 'rowing'
  | 'elliptical'
  | 'stairmaster'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'walking'
  | 'other';

export interface CardioActivity {
  id: number;
  workout_id: number;
  activity_type: CardioActivityType;
  duration_seconds: number;
  distance_meters: number | null;
  calories_burned: number | null;
  avg_heart_rate: number | null;
  notes: string | null;
  order_index: number;
}

// Personal record
export interface PersonalRecord {
  id: number;
  exercise_name: string;
  weight: number;
  reps: number;
  estimated_1rm: number;
  achieved_at: string;
  workout_id: number | null;
}

// Exercise muscle mapping
export interface ExerciseMuscle {
  id: number;
  exercise_name: string;
  primary_muscle: string;
  movement_type: string | null;
}

export interface WorkoutWithExercises extends Workout {
  exercises: ExerciseWithSets[];
  cardio: CardioActivity[];
}

// Stats types
export interface WorkoutTypeSummary {
  hasStrength: boolean;
  hasCardio: boolean;
  strengthVolume: number;
  cardioDuration: number;
}

// Template types
export interface Template {
  id: number;
  name: string;
  created_at: string;
}

export interface TemplateExercise {
  id: number;
  template_id: number;
  name: string;
  order_index: number;
  default_sets: number;
  note: string | null;
}

export interface TemplateWithExercises extends Template {
  exercises: TemplateExercise[];
}

// Program types
export interface Program {
  id: number;
  name: string;
  description: string | null;
  created_at: string;
  is_active: boolean;
  image_index: number;
  image_uri: string | null;
}

export interface ProgramDay {
  id: number;
  program_id: number;
  template_id: number | null;
  day_index: number;
  name: string;
}

export interface ProgramDayExercise {
  id: number;
  program_day_id: number;
  name: string;
  order_index: number;
  default_sets: number;
  note: string | null;
}

export interface ProgramDayWithExercises extends ProgramDay {
  exercises: ProgramDayExercise[];
  template?: Template | null; // Keeping optional for transition
}

export interface ProgramWithDays extends Program {
  days: ProgramDayWithExercises[];
}