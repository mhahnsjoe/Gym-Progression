import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDatabase } from '../../db/DatabaseContext';
import { getWorkoutWithExercises, deleteWorkout } from '../../db/queries';
import { WorkoutWithExercises } from '../../db/schema';

export default function WorkoutDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useDatabase();
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null);

  useEffect(() => {
    if (!id) return;
    getWorkoutWithExercises(db, parseInt(id)).then(setWorkout);
  }, [db, id]);

  const handleDelete = () => {
    Alert.alert(
      'Delete Workout',
      'Are you sure you want to delete this workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            await deleteWorkout(db, parseInt(id));
            router.back();
          },
        },
      ]
    );
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
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.date}>{formatDate(workout.started_at)}</Text>

        {workout.note && (
          <View style={styles.noteCard}>
            <Text style={styles.noteLabel}>Notes</Text>
            <Text style={styles.noteText}>{workout.note}</Text>
          </View>
        )}

        {workout.exercises.length === 0 ? (
          <Text style={styles.emptyText}>No exercises logged.</Text>
        ) : (
          workout.exercises.map((exercise) => (
            <View key={exercise.id} style={styles.exerciseCard}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>

              <View style={styles.setsHeader}>
                <Text style={styles.setLabel}>Set</Text>
                <Text style={styles.setLabel}>Weight</Text>
                <Text style={styles.setLabel}>Reps</Text>
              </View>

              {exercise.sets.map((set, index) => (
                <View key={set.id} style={styles.setRow}>
                  <Text style={styles.setNumber}>{index + 1}</Text>
                  <Text style={styles.setValue}>{set.weight}</Text>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 15,
  },
  loadingText: {
    color: '#fff',
    textAlign: 'center',
    marginTop: 50,
  },
  date: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  noteCard: {
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  noteLabel: {
    color: '#888',
    fontSize: 12,
    marginBottom: 5,
  },
  noteText: {
    color: '#fff',
    fontSize: 14,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 30,
  },
  exerciseCard: {
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  exerciseName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  setsHeader: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  setLabel: {
    color: '#888',
    fontSize: 12,
    flex: 1,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderTopColor: '#16213e',
  },
  setNumber: {
    color: '#888',
    flex: 1,
    textAlign: 'center',
  },
  setValue: {
    color: '#fff',
    flex: 1,
    textAlign: 'center',
    fontSize: 16,
  },
  bottomButtons: {
    padding: 15,
    backgroundColor: '#16213e',
    borderTopWidth: 1,
    borderTopColor: '#1a1a2e',
  },
  deleteButton: {
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e94560',
  },
  deleteButtonText: {
    color: '#e94560',
    fontWeight: '600',
  },
});