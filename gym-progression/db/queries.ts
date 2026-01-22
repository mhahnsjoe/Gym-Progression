import * as SQLite from 'expo-sqlite';
import {
  Workout,
  Exercise,
  Set,
  WorkoutWithExercises,
  ExerciseWithSets,
  Template,
  TemplateExercise,
  TemplateWithExercises,
  Program,
  ProgramDay,
  ProgramDayWithExercises,
  ProgramWithDays,
  ProgramDayExercise
} from './schema';

// ============================================
// Workout operations
// ============================================

export async function createWorkout(
  db: SQLite.SQLiteDatabase,
  programId?: number,
  programDayIndex?: number
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO workouts (started_at, program_id, program_day_index) VALUES (?, ?, ?)',
    new Date().toISOString(),
    programId || null,
    programDayIndex !== undefined ? programDayIndex : null
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

export interface WorkoutListItem extends Workout {
  program_name: string | null;
  day_name: string | null;
}

export async function getRecentWorkouts(db: SQLite.SQLiteDatabase, limit = 50): Promise<WorkoutListItem[]> {
  const result = await db.getAllAsync<WorkoutListItem>(
    `SELECT 
      w.*, 
      p.name as program_name, 
      pd.name as day_name 
    FROM workouts w
    LEFT JOIN programs p ON w.program_id = p.id
    LEFT JOIN program_days pd ON w.program_id = pd.program_id AND w.program_day_index = pd.day_index
    WHERE w.finished_at IS NOT NULL 
    ORDER BY w.finished_at DESC 
    LIMIT ?`,
    limit
  );
  return result;
}
export async function getInProgressWorkout(db: SQLite.SQLiteDatabase): Promise<Workout | null> {
  return await db.getFirstAsync<Workout>(
    'SELECT * FROM workouts WHERE finished_at IS NULL ORDER BY started_at DESC LIMIT 1'
  );
}

export interface WorkoutWithExercisesAndInfo extends WorkoutWithExercises {
  program_name: string | null;
  day_name: string | null;
}

export async function getWorkoutWithExercises(db: SQLite.SQLiteDatabase, workoutId: number): Promise<WorkoutWithExercisesAndInfo | null> {
  const workout = await db.getFirstAsync<WorkoutListItem>(
    `SELECT 
      w.*, 
      p.name as program_name, 
      pd.name as day_name 
    FROM workouts w
    LEFT JOIN programs p ON w.program_id = p.id
    LEFT JOIN program_days pd ON w.program_id = pd.program_id AND w.program_day_index = pd.day_index
    WHERE w.id = ?`,
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

  return {
    ...workout,
    exercises: exercisesWithSets,
    program_name: workout.program_name,
    day_name: workout.day_name
  };
}

export async function isWorkoutEmpty(db: SQLite.SQLiteDatabase, workoutId: number): Promise<boolean> {
  const workout = await getWorkoutWithExercises(db, workoutId);
  if (!workout) return true;

  // If there's a workout note, it's not empty
  if (workout.note && workout.note.trim()) return false;

  // Strict check: if any exercises have been added, it's not empty anymore
  if (workout.exercises.length > 0) return false;

  return true;
}

// ============================================
// Exercise operations
// ============================================

export async function addExercise(db: SQLite.SQLiteDatabase, workoutId: number, name: string, note?: string): Promise<number> {
  const countResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM exercises WHERE workout_id = ?',
    workoutId
  );
  const orderIndex = countResult?.count || 0;

  const result = await db.runAsync(
    'INSERT INTO exercises (workout_id, name, order_index, note) VALUES (?, ?, ?, ?)',
    workoutId,
    name,
    orderIndex,
    note || null
  );
  return result.lastInsertRowId;
}

export async function updateExerciseNote(db: SQLite.SQLiteDatabase, exerciseId: number, note: string): Promise<void> {
  await db.runAsync(
    'UPDATE exercises SET note = ? WHERE id = ?',
    note || null,
    exerciseId
  );
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
  defaultSets: number = 3,
  note?: string
): Promise<number> {
  const countResult = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM template_exercises WHERE template_id = ?',
    templateId
  );
  const orderIndex = countResult?.count || 0;

  const result = await db.runAsync(
    'INSERT INTO template_exercises (template_id, name, order_index, default_sets, note) VALUES (?, ?, ?, ?, ?)',
    templateId,
    name,
    orderIndex,
    defaultSets,
    note || null
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
  templateId: number,
  programId?: number,
  programDayIndex?: number
): Promise<number> {
  // Create the workout with program info
  const workoutId = await createWorkout(db, programId, programDayIndex);

  // Get template exercises
  const template = await getTemplateWithExercises(db, templateId);
  if (!template) return workoutId;

  // Add each exercise with empty sets and the template note
  for (const templateExercise of template.exercises) {
    const exerciseId = await addExercise(db, workoutId, templateExercise.name, templateExercise.note || undefined);

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

  // Add each exercise to the template with its note
  for (const exercise of workout.exercises) {
    await addTemplateExercise(
      db,
      templateId,
      exercise.name,
      exercise.sets.length || 3,  // Use actual set count or default to 3
      exercise.note || undefined
    );
  }

  return templateId;
}

// ============================================
// Program operations
// ============================================

export async function createProgram(db: SQLite.SQLiteDatabase, name: string, description?: string, imageIndex: number = 0, imageUri?: string): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO programs (name, description, created_at, is_active, image_index, image_uri) VALUES (?, ?, ?, 0, ?, ?)',
    name,
    description || null,
    new Date().toISOString(),
    imageIndex,
    imageUri || null
  );
  return result.lastInsertRowId;
}

export async function addProgramDay(
  db: SQLite.SQLiteDatabase,
  programId: number,
  dayIndex: number,
  name: string,
  templateId?: number
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO program_days (program_id, day_index, name, template_id) VALUES (?, ?, ?, ?)',
    programId,
    dayIndex,
    name,
    templateId || null
  );
  return result.lastInsertRowId;
}

export async function getAllPrograms(db: SQLite.SQLiteDatabase): Promise<Program[]> {
  const rows = await db.getAllAsync<any>('SELECT * FROM programs ORDER BY is_active DESC, created_at DESC');
  return rows.map(row => ({
    ...row,
    is_active: row.is_active === 1
  }));
}

export async function getActiveProgram(db: SQLite.SQLiteDatabase): Promise<ProgramWithDays | null> {
  const program = await db.getFirstAsync<any>('SELECT * FROM programs WHERE is_active = 1 LIMIT 1');
  if (!program) return null;

  const days = await db.getAllAsync<any>(`
    SELECT pd.*
    FROM program_days pd
    WHERE pd.program_id = ?
    ORDER BY pd.day_index ASC
  `, program.id);

  const daysWithExercises: ProgramDayWithExercises[] = await Promise.all(days.map(async day => {
    const exercises = await db.getAllAsync<ProgramDayExercise>(
      'SELECT * FROM program_day_exercises WHERE program_day_id = ? ORDER BY order_index',
      day.id
    );

    // For transition, also try to get template if exists
    let template = null;
    if (day.template_id) {
      template = await db.getFirstAsync<Template>('SELECT * FROM templates WHERE id = ?', day.template_id);
    }

    return {
      ...day,
      exercises,
      template
    };
  }));

  return {
    ...program,
    is_active: true,
    days: daysWithExercises
  };
}

export async function getProgramById(db: SQLite.SQLiteDatabase, id: number): Promise<ProgramWithDays | null> {
  const program = await db.getFirstAsync<Program>(
    'SELECT * FROM programs WHERE id = ?',
    id
  );

  if (!program) return null;

  const days = await db.getAllAsync<any>(
    'SELECT * FROM program_days WHERE program_id = ? ORDER BY day_index ASC',
    program.id
  );

  const daysWithExercises = await Promise.all(days.map(async (day: any) => {
    const exercises = await db.getAllAsync<any>(
      'SELECT * FROM program_day_exercises WHERE program_day_id = ? ORDER BY order_index',
      day.id
    );
    return {
      ...day,
      exercises
    };
  }));

  return {
    ...program,
    days: daysWithExercises
  };
}

export async function addProgramDayExercise(
  db: SQLite.SQLiteDatabase,
  programDayId: number,
  name: string,
  defaultSets: number = 3,
  note?: string
): Promise<number> {
  const result = await db.runAsync(
    'INSERT INTO program_day_exercises (program_day_id, name, order_index, default_sets, note) VALUES (?, ?, (SELECT COUNT(*) FROM program_day_exercises WHERE program_day_id = ?), ?, ?)',
    programDayId,
    name,
    programDayId,
    defaultSets,
    note || null
  );
  return result.lastInsertRowId;
}

export async function createWorkoutFromProgramDay(
  db: SQLite.SQLiteDatabase,
  programDayId: number,
  programId: number,
  programDayIndex: number
): Promise<number> {
  const workoutId = await createWorkout(db, programId, programDayIndex);

  const exercises = await db.getAllAsync<ProgramDayExercise>(
    'SELECT * FROM program_day_exercises WHERE program_day_id = ? ORDER BY order_index',
    programDayId
  );

  for (const pde of exercises) {
    const exerciseId = await addExercise(db, workoutId, pde.name, pde.note || undefined);
    for (let i = 0; i < pde.default_sets; i++) {
      await addSet(db, exerciseId, 0, 0);
    }
  }

  // Fallback for transition: if no exercises but template exists
  if (exercises.length === 0) {
    const day = await db.getFirstAsync<{ template_id: number | null }>('SELECT template_id FROM program_days WHERE id = ?', programDayId);
    if (day?.template_id) {
      const template = await getTemplateWithExercises(db, day.template_id);
      if (template) {
        for (const te of template.exercises) {
          const exerciseId = await addExercise(db, workoutId, te.name, te.note || undefined);
          for (let i = 0; i < te.default_sets; i++) {
            await addSet(db, exerciseId, 0, 0);
          }
        }
      }
    }
  }

  return workoutId;
}

export async function deleteProgram(db: SQLite.SQLiteDatabase, programId: number): Promise<void> {
  await db.runAsync('DELETE FROM program_day_exercises WHERE program_day_id IN (SELECT id FROM program_days WHERE program_id = ?)', programId);
  await db.runAsync('DELETE FROM program_days WHERE program_id = ?', programId);
  await db.runAsync('DELETE FROM programs WHERE id = ?', programId);
}

export async function updateProgram(
  db: SQLite.SQLiteDatabase,
  programId: number,
  name: string,
  description: string,
  imageIndex: number = 0,
  imageUri?: string
): Promise<void> {
  await db.runAsync(
    'UPDATE programs SET name = ?, description = ?, image_index = ?, image_uri = ? WHERE id = ?',
    name,
    description,
    imageIndex,
    imageUri || null,
    programId
  );

  // Clear existing days and exercises to re-insert (simplest way to sync)
  await db.runAsync('DELETE FROM program_day_exercises WHERE program_day_id IN (SELECT id FROM program_days WHERE program_id = ?)', programId);
  await db.runAsync('DELETE FROM program_days WHERE program_id = ?', programId);
}

export async function setActiveProgram(db: SQLite.SQLiteDatabase, programId: number): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('UPDATE programs SET is_active = 0');
    await db.runAsync('UPDATE programs SET is_active = 1 WHERE id = ?', programId);
  });
}

export async function getNextProgramDay(db: SQLite.SQLiteDatabase): Promise<{
  program: Program;
  nextDay: ProgramDayWithExercises;
} | null> {
  const activeProgram = await getActiveProgram(db);
  if (!activeProgram) return null;

  const lastWorkout = await db.getFirstAsync<Workout>(
    'SELECT * FROM workouts WHERE program_id = ? AND finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1',
    activeProgram.id
  );

  let nextIndex = 0;
  if (lastWorkout && lastWorkout.program_day_index !== null) {
    nextIndex = (lastWorkout.program_day_index + 1) % activeProgram.days.length;
  }

  const nextDay = activeProgram.days[nextIndex];

  return {
    program: activeProgram,
    nextDay
  };
}

// ============================================
// Dashboard Stats
// ============================================

export interface DashboardStats {
  lastSession: {
    name: string;
    date: string;
    duration: number; // minutes
    volume: number; // kg
    exercises: number;
  } | null;
  sessionsPerWeek: number;
  workoutDays: number;
  cycleDays: number;
  streak: number;
}

export async function getDashboardStats(db: SQLite.SQLiteDatabase): Promise<DashboardStats> {
  // 1. Last session
  const lastFinished = await db.getFirstAsync<Workout>(
    'SELECT * FROM workouts WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1'
  );

  let lastSession = null;
  if (lastFinished) {
    const workoutDetails = await getWorkoutWithExercises(db, lastFinished.id);
    if (workoutDetails) {
      const start = new Date(workoutDetails.started_at);
      const end = new Date(workoutDetails.finished_at!);
      const duration = Math.round((end.getTime() - start.getTime()) / 60000);

      let totalVolume = 0;
      workoutDetails.exercises.forEach(ex => {
        ex.sets.forEach(s => {
          totalVolume += (s.weight * s.reps);
        });
      });

      lastSession = {
        name: workoutDetails.note || 'Workout Session',
        date: workoutDetails.finished_at!,
        duration,
        volume: totalVolume,
        exercises: workoutDetails.exercises.length
      };
    }
  }

  // 2. Frequency
  let sessionsPerWeek = 0;
  let workoutDays = 0;
  let cycleDays = 0;
  const activeProgram = await getActiveProgram(db);

  if (activeProgram) {
    workoutDays = activeProgram.days.filter(d => d.exercises.length > 0).length;
    cycleDays = activeProgram.days.length;
    // User wants the count of workout days in the program to be the "Sessions / Week"
    sessionsPerWeek = workoutDays;
  } else {
    // Fallback to history if no active program
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const swResult = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM workouts WHERE finished_at >= ?',
      sevenDaysAgo.toISOString()
    );
    sessionsPerWeek = swResult?.count || 0;
    workoutDays = sessionsPerWeek;
    cycleDays = 7;
  }

  // 3. Streak
  // Get all unique dates where a workout was finished
  const finishedDates = await db.getAllAsync<{ date: string }>(
    "SELECT DISTINCT strftime('%Y-%m-%d', finished_at) as date FROM workouts WHERE finished_at IS NOT NULL ORDER BY date DESC"
  );

  let streak = 0;
  if (finishedDates.length > 0) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // If no workout today or yesterday, streak is broken (0), unless they just haven't worked out yet today.
    // If they worked out yesterday but not today yet, streak continues.
    // If they worked out today, streak continues.

    let currentCheck = today;
    let foundStart = false;

    // Check if streak is alive (workout today or yesterday)
    if (finishedDates[0].date === today || finishedDates[0].date === yesterdayStr) {
      foundStart = true;
      let checkDate = new Date(finishedDates[0].date);
      streak = 1;

      for (let i = 1; i < finishedDates.length; i++) {
        const prevDate = new Date(checkDate);
        prevDate.setDate(prevDate.getDate() - 1);
        const prevDateStr = prevDate.toISOString().split('T')[0];

        if (finishedDates[i].date === prevDateStr) {
          streak++;
          checkDate = prevDate;
        } else {
          break;
        }
      }
    }
  }

  return {
    lastSession,
    sessionsPerWeek,
    workoutDays,
    cycleDays,
    streak
  };
}