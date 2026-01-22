import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import ConfirmationModal from '../../components/ConfirmationModal';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDatabase } from '../../db/DatabaseContext';
import { getWorkoutWithExercises, deleteWorkout, WorkoutWithExercisesAndInfo } from '../../db/queries';
import { WorkoutWithExercises } from '../../db/schema';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const colors = {
  primary: '#22C55E',
  background: '#0A0A0A',
  card: '#171717',
  surface: '#262626',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.1)',
  danger: '#EF4444',
};

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useDatabase();
  const [workout, setWorkout] = useState<WorkoutWithExercisesAndInfo | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (!id) return;
    getWorkoutWithExercises(db, parseInt(id)).then(setWorkout);
  }, [db, id]);

  const handleDelete = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!id) return;
    await deleteWorkout(db, parseInt(id));
    setShowDeleteModal(false);
    router.back();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading session details...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerInfo}>
          <Text style={styles.workoutTitle}>{workout.day_name || 'Quick Workout'}</Text>
          <Text style={styles.programTitle}>
            {workout.program_name ? workout.program_name.toUpperCase() : 'CUSTOM SESSION'}
          </Text>

          <View style={styles.headerRow}>
            <Text style={styles.date}>{formatDate(workout.started_at)}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>COMPLETED</Text>
            </View>
          </View>
        </View>

        {workout.note && (
          <View style={styles.noteCard}>
            <View style={styles.noteHeader}>
              <MaterialCommunityIcons name="note-text-outline" size={16} color={colors.primary} />
              <Text style={styles.noteLabel}>SESSION NOTES</Text>
            </View>
            <Text style={styles.noteText}>{workout.note}</Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>EXERCISES</Text>

        {workout.exercises.length === 0 ? (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="dumbbell" size={48} color={colors.border} />
            <Text style={styles.emptyText}>No exercises logged for this session.</Text>
          </View>
        ) : (
          workout.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <View style={styles.exerciseHeader}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <View style={styles.setsCountBadge}>
                  <Text style={styles.setsCountText}>{exercise.sets.length} SETS</Text>
                </View>
              </View>

              <View style={styles.setsHeader}>
                <Text style={[styles.setLabel, { textAlign: 'left', width: 40 }]}>#</Text>
                <Text style={styles.setLabel}>WEIGHT</Text>
                <Text style={styles.setLabel}>REPS</Text>
              </View>

              {exercise.sets.map((set, index) => (
                <View key={set.id} style={styles.setRow}>
                  <Text style={[styles.setNumber, { textAlign: 'left', width: 40 }]}>{index + 1}</Text>
                  <Text style={styles.setValue}>{set.weight} <Text style={styles.unitText}>kg</Text></Text>
                  <Text style={styles.setValue}>{set.reps}</Text>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Pressable style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>Delete Workout</Text>
        </Pressable>
      </View>

      <ConfirmationModal
        visible={showDeleteModal}
        title="Delete Workout"
        description="Are you sure you want to delete this workout?"
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setShowDeleteModal(false)}
        isDanger
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loadingText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  headerInfo: {
    marginBottom: 24,
  },
  workoutTitle: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '900',
    marginBottom: 4,
  },
  programTitle: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  date: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  statusText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  noteCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  noteLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  noteText: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 2,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 40,
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  setsCountBadge: {
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  setsCountText: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    paddingVertical: 8,
  },
  setLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  setNumber: {
    color: colors.textMuted,
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  setValue: {
    color: colors.text,
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '700',
  },
  unitText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '400',
  },
  bottomButtons: {
    padding: 16,
    paddingBottom: 32,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  deleteButton: {
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '800',
    fontSize: 14,
    letterSpacing: 1,
  },
});