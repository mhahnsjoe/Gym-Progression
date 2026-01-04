import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../db/DatabaseContext';
import { createWorkout, getRecentWorkouts } from '../db/queries';
import { Workout } from '../db/schema';

export default function HomeScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);

  const loadRecentWorkouts = useCallback(async () => {
    const workouts = await getRecentWorkouts(db, 5);
    setRecentWorkouts(workouts);
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadRecentWorkouts();
    }, [loadRecentWorkouts])
  );

  const handleStartWorkout = async () => {
    const workoutId = await createWorkout(db);
    router.push(`/workout/${workoutId}`);
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <View style={styles.container}>
      <Pressable style={styles.startButton} onPress={handleStartWorkout}>
        <Text style={styles.startButtonText}>Start Workout</Text>
      </Pressable>

      <View style={styles.recentSection}>
        <View style={styles.recentHeader}>
          <Text style={styles.sectionTitle}>Recent Workouts</Text>
          {recentWorkouts.length > 0 && (
            <Pressable onPress={() => router.push('/history')}>
              <Text style={styles.seeAllText}>See All</Text>
            </Pressable>
          )}
        </View>

        {recentWorkouts.length === 0 ? (
          <Text style={styles.emptyText}>No workouts yet. Start your first one!</Text>
        ) : (
          <FlatList
            data={recentWorkouts}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable
                style={styles.workoutCard}
                onPress={() => router.push(`/history/${item.id}`)}
              >
                <Text style={styles.workoutDate}>{formatDate(item.started_at)}</Text>
                {item.note && (
                  <Text style={styles.workoutNote} numberOfLines={1}>
                    {item.note}
                  </Text>
                )}
              </Pressable>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  startButton: {
    backgroundColor: '#e94560',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  recentSection: {
    flex: 1,
  },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    color: '#e94560',
    fontSize: 14,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
  workoutCard: {
    backgroundColor: '#1a1a2e',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  workoutDate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  workoutNote: {
    color: '#888',
    fontSize: 14,
    marginTop: 4,
  },
});