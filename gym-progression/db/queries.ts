import * as SQLite from 'expo-sqlite';
import { 
  Workout, 
  Exercise, 
  Set, 
  WorkoutWithExercises, 
  ExerciseWithSets,
  Template,
  TemplateExercise,
  TemplateWithExercises
} from './schema';

// ============================================
// Workout operations
// ============================================

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

// ============================================
// Exercise operations
// ============================================

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

// ============================================
// Set operations
// ============================================

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

// ============================================
// Template operations
// ============================================

export async function createTemplate(db: SQLite.SQLiteDatabase, name: string): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO templates (name, created_at) VALUES (?, ?)',
    name,
    new Date().toISOString()
  );
  return result.lastInsertRowId;
}

export async function deleteTemplate(db: SQLite.SQLiteDatabase, templateId: number): Promise<void> {
  await db.runAsync('DELETE FROM templates WHERE id = ?', templateId);
}

export async function getAllTemplates(db: SQLite.SQLiteDatabase): Promise<Template[]> {
  return await db.getAllAsync<Template>(
    'SELECT * FROM templates ORDER BY created_at DESC'
  );
}

export async function getTemplateWithExercises(db: SQLite.SQLiteDatabase, templateId: number): Promise<TemplateWithExercises | null> {
  const template = await db.getFirstAsync<Template>(
    'SELECT * FROM templates WHERE id = ?',
    templateId
  );
  
  if (!template) return null;

  const exercises = await db.getAllAsync<TemplateExercise>(
    'SELECT * FROM template_exercises WHERE template_id = ? ORDER BY order_index',
    templateId
  );

  return { ...template, exercises };
}

export async function addTemplateExercise(
  db: SQLite.SQLiteDatabase, 
  templateId: number, 
  name: string, 
  defaultSets: number = 3
): Promise<number> {
  const countResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM template_exercises WHERE template_id = ?',
    templateId
  );
  const orderIndex = countResult?.count || 0;

  const result = await db.runAsync(
    'INSERT INTO template_exercises (template_id, name, order_index, default_sets) VALUES (?, ?, ?, ?)',
    templateId,
    name,
    orderIndex,
    defaultSets
  );
  return result.lastInsertRowId;
}

export async function deleteTemplateExercise(db: SQLite.SQLiteDatabase, exerciseId: number): Promise<void> {
  await db.runAsync('DELETE FROM template_exercises WHERE id = ?', exerciseId);
}

// ============================================
// Template → Workout conversion
// ============================================

/**
 * Creates a new workout from a template, pre-populating exercises and empty sets
 */
export async function createWorkoutFromTemplate(
  db: SQLite.SQLiteDatabase, 
  templateId: number
): Promise<number> {
  // Create the workout
  const workoutId = await createWorkout(db);
  
  // Get template exercises
  const template = await getTemplateWithExercises(db, templateId);
  if (!template) return workoutId;

  // Add each exercise with empty sets
  for (const templateExercise of template.exercises) {
    const exerciseId = await addExercise(db, workoutId, templateExercise.name);
    
    // Add default number of empty sets
    for (let i = 0; i < templateExercise.default_sets; i++) {
      await addSet(db, exerciseId, 0, 0);
    }
  }

  return workoutId;
}

/**
 * Saves an existing workout as a template
 */
export async function saveWorkoutAsTemplate(
  db: SQLite.SQLiteDatabase,
  workoutId: number,
  templateName: string
): Promise<number> {
  // Get the workout with exercises
  const workout = await getWorkoutWithExercises(db, workoutId);
  if (!workout) throw new Error('Workout not found');

  // Create the template
  const templateId = await createTemplate(db, templateName);

  // Add each exercise to the template
  for (const exercise of workout.exercises) {
    await addTemplateExercise(
      db, 
      templateId, 
      exercise.name, 
      exercise.sets.length || 3  // Use actual set count or default to 3
    );
  }

  return templateId;
}