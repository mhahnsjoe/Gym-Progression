import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../../db/Databasecontext';
import { getRecentWorkouts } from '../../db/queries';
import { Workout } from '../../db/schema';

export default function HistoryScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [workouts, setWorkouts] = useState<Workout[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecentWorkouts(db, 50).then(setWorkouts);
    }, [db])
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (workouts.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No workout history yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={workouts}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <Pressable
            style={styles.workoutCard}
            onPress={() => router.push(`/history/${item.id}`)}
          >
            <Text style={styles.workoutDate}>{formatDate(item.started_at)}</Text>
            {item.note && (
              <Text style={styles.workoutNote} numberOfLines={2}>
                {item.note}
              </Text>
            )}
          </Pressable>
        )}
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 15,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 50,
  },
  workoutCard: {
    backgroundColor: '#1a1a2e',
    padding: 20,
    borderRadius: 10,
    marginBottom: 10,
  },
  workoutDate: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  workoutNote: {
    color: '#888',
    fontSize: 14,
    marginTop: 8,
  },
});