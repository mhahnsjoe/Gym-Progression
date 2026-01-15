import { View, Text, StyleSheet, Pressable, FlatList, Modal, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../db/DatabaseContext';
import {
  createWorkout,
  getRecentWorkouts,
  getAllTemplates,
  createWorkoutFromTemplate,
  getInProgressWorkout,
  isWorkoutEmpty,
  deleteWorkout,
  finishWorkout
} from '../db/queries';
import { Workout, Template } from '../db/schema';
import WorkoutConflictModal from '../components/WorkoutConflictModal';

// Theme colors matching workout screen
const colors = {
  primary: '#00c795',
  background: '#1a1a1a',
  card: '#2C2C2C',
  inputBg: '#17362e',
  text: '#ffffff',
  textMuted: '#888888',
  border: 'rgba(255,255,255,0.05)',
};

export default function HomeScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [inProgressWorkout, setInProgressWorkout] = useState<Workout | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'empty' | 'template'; templateId?: number } | null>(null);

  const loadData = useCallback(async () => {
    try {
      const activeWorkout = await getInProgressWorkout(db);
      setInProgressWorkout(activeWorkout);
    } catch (error) {
      console.log('No in-progress workout:', error);
      setInProgressWorkout(null);
    }

    try {
      const workouts = await getRecentWorkouts(db, 5);
      setRecentWorkouts(workouts);
    } catch (error) {
      console.error('Failed to load workouts:', error);
    }

    try {
      const templateList = await getAllTemplates(db);
      setTemplates(templateList);
    } catch (error) {
      console.log('Templates not available:', error);
      setTemplates([]);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleStartWorkout = async () => {
    const active = await getInProgressWorkout(db);
    if (!active) {
      const workoutId = await createWorkout(db);
      router.push(`/workout/${workoutId}`);
      return;
    }

    const isEmpty = await isWorkoutEmpty(db, active.id);
    if (isEmpty) {
      await deleteWorkout(db, active.id);
      const workoutId = await createWorkout(db);
      router.push(`/workout/${workoutId}`);
      return;
    }

    setPendingAction({ type: 'empty' });
    setShowConflictModal(true);
  };

  const handleStartFromTemplate = async (templateId: number) => {
    const active = await getInProgressWorkout(db);
    if (!active) {
      const workoutId = await createWorkoutFromTemplate(db, templateId);
      setShowTemplateModal(false);
      router.push(`/workout/${workoutId}`);
      return;
    }

    const isEmpty = await isWorkoutEmpty(db, active.id);
    if (isEmpty) {
      await deleteWorkout(db, active.id);
      const workoutId = await createWorkoutFromTemplate(db, templateId);
      setShowTemplateModal(false);
      router.push(`/workout/${workoutId}`);
      return;
    }

    setPendingAction({ type: 'template', templateId });
    setShowConflictModal(true);
  };

  const executePendingAction = async () => {
    if (!pendingAction) return;

    if (pendingAction.type === 'empty') {
      const workoutId = await createWorkout(db);
      router.push(`/workout/${workoutId}`);
    } else if (pendingAction.type === 'template' && pendingAction.templateId) {
      const workoutId = await createWorkoutFromTemplate(db, pendingAction.templateId);
      setShowTemplateModal(false);
      router.push(`/workout/${workoutId}`);
    }
    setPendingAction(null);
  };

  const handleConflictFinish = async () => {
    const active = await getInProgressWorkout(db);
    if (active) {
      await finishWorkout(db, active.id, 'Finished to start new session');
      setShowConflictModal(false);
      await executePendingAction();
    }
  };

  const handleConflictDelete = async () => {
    const active = await getInProgressWorkout(db);
    if (active) {
      await deleteWorkout(db, active.id);
      setShowConflictModal(false);
      await executePendingAction();
    }
  };

  const handleConflictContinue = async () => {
    const active = await getInProgressWorkout(db);
    if (active) {
      setShowConflictModal(false);
      router.push(`/workout/${active.id}`);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleContinueWorkout = () => {
    if (inProgressWorkout) {
      router.push(`/workout/${inProgressWorkout.id}`);
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return formatDate(dateStr);
  };

  return (
    <View style={styles.container}>
      {/* Start Buttons */}
      <View style={styles.startSection}>
        <Pressable style={styles.startButton} onPress={handleStartWorkout}>
          <Text style={styles.startButtonText}>Start Empty Workout</Text>
        </Pressable>

        <Pressable
          style={styles.templateButton}
          onPress={() => templates.length > 0 ? setShowTemplateModal(true) : router.push('/templates')}
        >
          <Text style={styles.templateButtonText}>Start from Template</Text>
        </Pressable>
      </View>

      {/* Templates Quick Access */}
      {templates.length > 0 && (
        <View style={styles.templatesSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Templates</Text>
            <Pressable onPress={() => router.push('/templates')}>
              <Text style={styles.seeAllText}>Manage</Text>
            </Pressable>
          </View>
          <FlatList
            horizontal
            data={templates.slice(0, 5)}
            keyExtractor={(item) => item.id.toString()}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                style={styles.templateChip}
                onPress={() => handleStartFromTemplate(item.id)}
              >
                <Text style={styles.templateChipText}>{item.name}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      {/* Recent Workouts */}
      <View style={styles.recentSection}>
        <View style={styles.sectionHeader}>
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

      {/* Template Selection Modal */}
      <Modal visible={showTemplateModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Template</Text>

            <FlatList
              data={templates}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.templateOption}
                  onPress={() => handleStartFromTemplate(item.id)}
                >
                  <Text style={styles.templateOptionText}>{item.name}</Text>
                </Pressable>
              )}
              style={styles.templateList}
            />

            <Pressable
              style={styles.closeModal}
              onPress={() => setShowTemplateModal(false)}
            >
              <Text style={styles.closeModalText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Conflict Modal */}
      <WorkoutConflictModal
        visible={showConflictModal}
        onCancel={() => {
          setShowConflictModal(false);
          setPendingAction(null);
        }}
        onContinue={handleConflictContinue}
        onFinishAndStartNew={handleConflictFinish}
        onDeleteAndStartNew={handleConflictDelete}
      />

      {/* Fixed Bottom Continue Workout Banner */}
      {inProgressWorkout && (
        <Pressable style={styles.continueWorkoutBanner} onPress={handleContinueWorkout}>
          <View style={styles.continueWorkoutContent}>
            <View style={styles.continueWorkoutLeft}>
              <View style={styles.activeIndicator} />
              <View>
                <Text style={styles.continueWorkoutTitle}>Workout in Progress</Text>
                <Text style={styles.continueWorkoutSubtitle}>Started {formatTime(inProgressWorkout.started_at)}</Text>
              </View>
            </View>
            <Text style={styles.continueWorkoutArrow}>CONTINUE →</Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingBottom: 100,
    backgroundColor: colors.background,
  },
  continueWorkoutBanner: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.primary,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  continueWorkoutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    paddingBottom: 30,
  },
  continueWorkoutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  activeIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fff',
  },
  continueWorkoutTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  continueWorkoutSubtitle: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    marginTop: 2,
  },
  continueWorkoutArrow: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  startSection: {
    gap: 10,
    marginBottom: 25,
  },
  startButton: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  templateButton: {
    backgroundColor: colors.card,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  templateButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  templatesSection: {
    marginBottom: 25,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '500',
  },
  templateChip: {
    backgroundColor: colors.card,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateChipText: {
    color: colors.text,
    fontSize: 14,
  },
  recentSection: {
    flex: 1,
  },
  emptyText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 40,
  },
  workoutCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  workoutDate: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  workoutNote: {
    color: colors.textMuted,
    fontSize: 14,
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  templateList: {
    maxHeight: 400,
  },
  templateOption: {
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  templateOptionText: {
    color: colors.text,
    fontSize: 16,
  },
  closeModal: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  closeModalText: {
    color: colors.textMuted,
    fontSize: 16,
  },
});