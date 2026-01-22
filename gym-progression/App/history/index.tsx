import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../../db/DatabaseContext';
import { getRecentWorkouts, WorkoutListItem } from '../../db/queries';
import { Workout } from '../../db/schema';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const colors = {
  primary: '#22C55E',
  background: '#0A0A0A',
  card: '#171717',
  text: '#ffffff',
  textMuted: 'rgba(255,255,255,0.4)',
  border: 'rgba(255,255,255,0.1)',
};

export default function HistoryScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [workouts, setWorkouts] = useState<WorkoutListItem[]>([]);

  useFocusEffect(
    useCallback(() => {
      getRecentWorkouts(db, 50).then(setWorkouts);
    }, [db])
  );

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
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
            <View style={styles.cardHeader}>
              <View style={styles.headerLeft}>
                <Text style={styles.workoutName}>{item.day_name || 'Quick Workout'}</Text>
                <Text style={styles.programLabel}>
                  {item.program_name ? item.program_name.toUpperCase() : 'NO PROGRAM'}
                </Text>
              </View>
              <View style={styles.headerRight}>
                <Text style={styles.dateText}>{formatDate(item.started_at)}</Text>
                <Text style={styles.timeText}>{formatTime(item.started_at)}</Text>
              </View>
            </View>
            {item.note && (
              <Text style={styles.workoutNote} numberOfLines={2}>
                {item.note}
              </Text>
            )}
            <View style={styles.cardFooter}>
              <MaterialCommunityIcons name="clock-outline" size={14} color={colors.primary} />
              <Text style={styles.footerText}>Completed Session</Text>
            </View>
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
    backgroundColor: colors.background,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 100,
    fontSize: 16,
  },
  workoutCard: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  workoutName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 4,
  },
  programLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dateText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  timeText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  workoutNote: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
  },
  footerText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});