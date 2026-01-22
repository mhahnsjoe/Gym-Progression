import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Switch,
} from 'react-native';
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router';
import { useDatabase } from '../../db/DatabaseContext';
import {
  getWorkoutWithExercises,
  addExercise,
  addSet,
  updateSet,
  updateExerciseNote,
  deleteSet,
  deleteExercise,
  finishWorkout,
  deleteWorkout,
  saveWorkoutAsTemplate,
  isWorkoutEmpty,
} from '../../db/queries';
import { WorkoutWithExercises, ExerciseWithSets } from '../../db/schema';
import DraggableFlatList, { RenderItemParams, ScaleDecorator } from 'react-native-draggable-flatlist';
import ConfirmationModal from '../../components/ConfirmationModal';

// Theme colors matching your HTML design
const colors = {
  primary: '#00c795',
  background: '#1a1a1a',
  card: '#2C2C2C',
  inputBg: '#17362e',
  text: '#ffffff',
  textMuted: '#888888',
  border: 'rgba(255,255,255,0.05)',
  borderActive: 'rgba(0,199,149,0.5)',
};

const COMMON_EXERCISES = [
  'Bench Press',
  'Squat',
  'Deadlift',
  'Overhead Press',
  'Barbell Row',
  'Pull-ups',
  'Dumbbell Curl',
  'Tricep Pushdown',
  'Leg Press',
  'Romanian Deadlift',
  'Lat Pulldown',
  'Cable Fly',
];

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();
  const db = useDatabase();
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [customExercise, setCustomExercise] = useState('');
  const [finishNote, setFinishNote] = useState('');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [expandedExercises, setExpandedExercises] = useState<Set<number>>(new Set());
  const [activeExerciseId, setActiveExerciseId] = useState<number | null>(null);

  // New states for custom modals
  const [showDeleteExerciseModal, setShowDeleteExerciseModal] = useState(false);
  const [exerciseToDelete, setExerciseToDelete] = useState<{ id: number, name: string } | null>(null);
  const [showCancelWorkoutModal, setShowCancelWorkoutModal] = useState(false);

  const loadWorkout = useCallback(async () => {
    if (!id) return;
    const data = await getWorkoutWithExercises(db, parseInt(id));
    setWorkout(data);
  }, [db, id]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  // Automatically delete empty workout if going back (without finishing)
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      const actionType = e.data.action.type;
      // Only trigger on back navigation, not on replace (which happens when finishing)
      if (actionType === 'GO_BACK' || actionType === 'POP') {
        if (id) {
          isWorkoutEmpty(db, parseInt(id)).then((isEmpty) => {
            if (isEmpty) {
              deleteWorkout(db, parseInt(id));
            }
          });
        }
      }
    });

    return unsubscribe;
  }, [navigation, db, id]);

  const handleAddExercise = async (name: string) => {
    if (!id || !name.trim()) return;
    await addExercise(db, parseInt(id), name.trim());
    setShowExerciseModal(false);
    setCustomExercise('');
    loadWorkout();
  };

  const handleAddSet = async (exerciseId: number) => {
    setActiveExerciseId(exerciseId);
    await addSet(db, exerciseId, 0, 0);
    loadWorkout();
  };

  const handleUpdateSet = async (setId: number, weight: string, reps: string, exerciseId: number) => {
    setActiveExerciseId(exerciseId);
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;
    await updateSet(db, setId, w, r);
    loadWorkout();
  };

  const handleUpdateExerciseNote = async (exerciseId: number, note: string) => {
    setActiveExerciseId(exerciseId);
    await updateExerciseNote(db, exerciseId, note);
    loadWorkout();
  };

  const handleCopyPreviousSet = async (exerciseId: number, index: number, sets: any[]) => {
    if (index === 0) return;
    setActiveExerciseId(exerciseId);
    const previousSet = sets[index - 1];
    const currentSet = sets[index];
    await updateSet(db, currentSet.id, previousSet.weight, previousSet.reps);
    loadWorkout();
  };

  const toggleExercise = (exerciseId: number) => {
    setActiveExerciseId(exerciseId);
    setExpandedExercises(prev => {
      const newSet = new Set(prev);
      if (newSet.has(exerciseId)) {
        newSet.delete(exerciseId);
      } else {
        newSet.add(exerciseId);
      }
      return newSet;
    });
  };

  const handleReorder = async (newExercises: ExerciseWithSets[]) => {
    if (!workout) return;
    setWorkout({ ...workout, exercises: newExercises });
    for (let i = 0; i < newExercises.length; i++) {
      await db.runAsync('UPDATE exercises SET order_index = ? WHERE id = ?', i, newExercises[i].id);
    }
  };

  const handleDeleteSet = async (setId: number, exerciseId: number) => {
    setActiveExerciseId(exerciseId);
    await deleteSet(db, setId);
    loadWorkout();
  };

  const handleDeleteExercise = (exerciseId: number, exerciseName: string) => {
    setExerciseToDelete({ id: exerciseId, name: exerciseName });
    setShowDeleteExerciseModal(true);
  };

  const confirmDeleteExercise = async () => {
    if (!exerciseToDelete) return;
    await deleteExercise(db, exerciseToDelete.id);
    if (activeExerciseId === exerciseToDelete.id) {
      setActiveExerciseId(null);
    }
    setShowDeleteExerciseModal(false);
    setExerciseToDelete(null);
    loadWorkout();
  };

  const handleFinish = async () => {
    if (!id) return;
    await finishWorkout(db, parseInt(id), finishNote);
    router.replace('/');
  };

  const handleCancel = async () => {
    // If workout is purely empty (no exercises), just delete and leave without prompt
    const isActiveAndEmpty = workout && workout.exercises.length === 0 && (!workout.note || !workout.note.trim());

    if (isActiveAndEmpty) {
      if (id) await deleteWorkout(db, parseInt(id));
      router.replace('/');
      return;
    }

    setShowCancelWorkoutModal(true);
  };

  const confirmCancelWorkout = async () => {
    if (!id) return;
    await deleteWorkout(db, parseInt(id));
    setShowCancelWorkoutModal(false);
    router.replace('/');
  };

  const openFinishModal = () => {
    setShowFinishModal(true);
  };

  if (!workout) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const renderExercise = ({ item: exercise, drag, isActive: isDragging }: RenderItemParams<ExerciseWithSets>) => {
    const isExpanded = expandedExercises.has(exercise.id);
    const isActive = activeExerciseId === exercise.id;
    const completedSets = exercise.sets.filter(s => s.weight > 0 || s.reps > 0).length;

    return (
      <ScaleDecorator>
        <View style={[
          styles.exerciseCard,
          isActive && styles.exerciseCardActive,
          isDragging && styles.exerciseCardDragging
        ]}>
          <Pressable
            style={styles.exerciseHeader}
            onPress={() => toggleExercise(exercise.id)}
            onLongPress={drag}
          >
            <View style={styles.exerciseHeaderLeft}>
              {isActive && <View style={styles.activeIndicator} />}
              <View style={styles.exerciseTitleContainer}>
                <Text style={styles.exerciseName}>{exercise.name}</Text>
                <Text style={styles.exerciseSubtitle}>
                  {completedSets}/{exercise.sets.length} sets completed
                </Text>
              </View>
            </View>
            <View style={styles.exerciseHeaderRight}>
              <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
              <Pressable
                style={styles.deleteButton}
                onPress={() => handleDeleteExercise(exercise.id, exercise.name)}
              >
                <Text style={styles.deleteText}>×</Text>
              </Pressable>
            </View>
          </Pressable>

          {isExpanded && (
            <View style={styles.exerciseContent}>
              {/* Header row */}
              <View style={styles.setsHeader}>
                <Text style={[styles.setLabel, styles.setLabelNum]}>#</Text>
                <Text style={[styles.setLabel, styles.setLabelWeight]}>Weight (kg)</Text>
                <Text style={[styles.setLabel, styles.setLabelReps]}>Reps</Text>
                <Text style={[styles.setLabel, styles.setLabelCopy]}>Copy</Text>
              </View>

              {exercise.sets.map((set, index) => (
                <View key={set.id} style={styles.setRow}>
                  <Text style={[styles.setNumber, (set.weight > 0 || set.reps > 0) && styles.setNumberCompleted]}>
                    {index + 1}
                  </Text>
                  <TextInput
                    style={[styles.input, (set.weight > 0 || set.reps > 0) && styles.inputCompleted]}
                    keyboardType="decimal-pad"
                    placeholder="0"
                    placeholderTextColor="#555"
                    defaultValue={set.weight > 0 ? set.weight.toString() : ''}
                    onFocus={() => setActiveExerciseId(exercise.id)}
                    onEndEditing={(e) =>
                      handleUpdateSet(set.id, e.nativeEvent.text, set.reps.toString(), exercise.id)
                    }
                  />
                  <TextInput
                    style={[styles.input, (set.weight > 0 || set.reps > 0) && styles.inputCompleted]}
                    keyboardType="number-pad"
                    placeholder="0"
                    placeholderTextColor="#555"
                    defaultValue={set.reps > 0 ? set.reps.toString() : ''}
                    onFocus={() => setActiveExerciseId(exercise.id)}
                    onEndEditing={(e) =>
                      handleUpdateSet(set.id, set.weight.toString(), e.nativeEvent.text, exercise.id)
                    }
                  />
                  <View style={styles.copyContainer}>
                    {index > 0 ? (
                      <Pressable
                        style={styles.copyButton}
                        onPress={() => handleCopyPreviousSet(exercise.id, index, exercise.sets)}
                      >
                        <Text style={styles.copyIcon}>⧉</Text>
                      </Pressable>
                    ) : (
                      <Pressable
                        style={styles.deleteSetButton}
                        onPress={() => handleDeleteSet(set.id, exercise.id)}
                      >
                        <Text style={styles.deleteSetText}>×</Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              ))}

              <TextInput
                style={styles.exerciseNoteInput}
                placeholder="Add note..."
                placeholderTextColor="#555"
                defaultValue={exercise.note || ''}
                onFocus={() => setActiveExerciseId(exercise.id)}
                onEndEditing={(e) =>
                  handleUpdateExerciseNote(exercise.id, e.nativeEvent.text)
                }
                multiline
              />

              <Pressable style={styles.addSetButton} onPress={() => handleAddSet(exercise.id)}>
                <Text style={styles.addSetText}>+ ADD SET</Text>
              </Pressable>
            </View>
          )}
        </View>
      </ScaleDecorator>
    );
  };

  return (
    <View style={styles.container}>
      <DraggableFlatList
        data={workout.exercises}
        keyExtractor={(item) => item.id.toString()}
        onDragEnd={({ data }) => handleReorder(data)}
        renderItem={renderExercise}
        contentContainerStyle={styles.flatListContent}
        ListFooterComponent={
          <Pressable style={styles.addExerciseButton} onPress={() => setShowExerciseModal(true)}>
            <Text style={styles.addExerciseText}>+ ADD EXERCISE</Text>
          </Pressable>
        }
      />

      {/* Fixed bottom buttons */}
      <View style={styles.bottomButtonsContainer}>
        <View style={styles.bottomButtons}>
          <Pressable style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </Pressable>
          <Pressable style={styles.finishButton} onPress={openFinishModal}>
            <Text style={styles.finishButtonText}>FINISH WORKOUT</Text>
          </Pressable>
        </View>
      </View>

      {/* Exercise Selection Modal */}
      <Modal visible={showExerciseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Exercise</Text>

            <TextInput
              style={styles.customInput}
              placeholder="Custom exercise name..."
              placeholderTextColor="#666"
              value={customExercise}
              onChangeText={setCustomExercise}
              onSubmitEditing={() => handleAddExercise(customExercise)}
            />

            <ScrollView style={styles.exerciseList}>
              {COMMON_EXERCISES.map((name) => (
                <Pressable
                  key={name}
                  style={styles.exerciseOption}
                  onPress={() => handleAddExercise(name)}
                >
                  <Text style={styles.exerciseOptionText}>{name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable style={styles.closeModal} onPress={() => setShowExerciseModal(false)}>
              <Text style={styles.closeModalText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Finish Workout Modal */}
      <Modal visible={showFinishModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Finish Workout</Text>

            <TextInput
              style={[styles.customInput, styles.noteInput]}
              placeholder="How did it go? (optional)"
              placeholderTextColor="#666"
              value={finishNote}
              onChangeText={setFinishNote}
              multiline
            />

            {/* Template saving removed in favor of Programs */}

            <Pressable style={styles.finishButtonModal} onPress={handleFinish}>
              <Text style={styles.finishButtonText}>Save Workout</Text>
            </Pressable>

            <Pressable style={styles.closeModal} onPress={() => setShowFinishModal(false)}>
              <Text style={styles.closeModalText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modals */}
      <ConfirmationModal
        visible={showDeleteExerciseModal}
        title="Delete Exercise"
        description={`Remove ${exerciseToDelete?.name} and all its sets?`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteExercise}
        onCancel={() => setShowDeleteExerciseModal(false)}
        isDanger
      />

      <ConfirmationModal
        visible={showCancelWorkoutModal}
        title="Cancel Workout"
        description="This will delete the entire workout. Are you sure?"
        confirmLabel="Discard Workout"
        cancelLabel="Keep Working"
        onConfirm={confirmCancelWorkout}
        onCancel={() => setShowCancelWorkoutModal(false)}
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
  flatListContent: {
    padding: 16,
    paddingBottom: 140,
  },
  loadingText: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 50,
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  exerciseCardActive: {
    borderWidth: 2,
    borderColor: colors.borderActive,
  },
  exerciseCardDragging: {
    borderColor: colors.primary,
    borderWidth: 2,
    elevation: 8,
  },
  activeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 12,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  exerciseHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseTitleContainer: {
    flex: 1,
  },
  exerciseHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  exerciseSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exerciseContent: {
    padding: 16,
    paddingTop: 0,
  },
  expandIcon: {
    color: colors.primary,
    fontSize: 12,
  },
  deleteButton: {
    padding: 4,
  },
  deleteText: {
    color: colors.textMuted,
    fontSize: 24,
    fontWeight: '300',
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 8,
    marginBottom: 12,
  },
  setLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  setLabelNum: {
    width: 32,
    textAlign: 'center',
  },
  setLabelWeight: {
    flex: 1,
    textAlign: 'center',
  },
  setLabelReps: {
    flex: 1,
    textAlign: 'center',
  },
  setLabelCopy: {
    width: 50,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    color: colors.textMuted,
    width: 32,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 14,
  },
  setNumberCompleted: {
    color: colors.primary,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: colors.text,
    height: 48,
    borderRadius: 8,
    textAlign: 'center',
    marginHorizontal: 4,
    fontSize: 16,
    fontWeight: '600',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  inputCompleted: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderColor: 'rgba(0,199,149,0.3)',
  },
  copyContainer: {
    width: 50,
    alignItems: 'center',
  },
  copyButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(0,199,149,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyIcon: {
    color: colors.primary,
    fontSize: 20,
  },
  deleteSetButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteSetText: {
    color: colors.textMuted,
    fontSize: 20,
  },
  exerciseNoteInput: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    color: colors.text,
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
    fontSize: 13,
    minHeight: 44,
  },
  addSetButton: {
    marginTop: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
  },
  addSetText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
  },
  addExerciseButton: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  addExerciseText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  bottomButtonsContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    paddingTop: 8,
    paddingBottom: 24,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  bottomButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cancelButtonText: {
    color: colors.textMuted,
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  finishButton: {
    flex: 2,
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  finishButtonModal: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
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
    padding: 24,
    maxHeight: '80%',
  },
  modalTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 20,
    textAlign: 'center',
  },
  customInput: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    fontSize: 16,
    borderWidth: 2,
    borderColor: 'rgba(0,199,149,0.3)',
  },
  noteInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  exerciseList: {
    maxHeight: 300,
  },
  exerciseOption: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  exerciseOptionText: {
    color: colors.text,
    fontSize: 16,
  },
  templateSection: {
    marginBottom: 16,
  },
  templateToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  templateToggleText: {
    color: colors.text,
    fontSize: 16,
  },
  closeModal: {
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  closeModalText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
});
