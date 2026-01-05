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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useDatabase } from '../../db/DatabaseContext';
import {
  getWorkoutWithExercises,
  addExercise,
  addSet,
  updateSet,
  deleteSet,
  deleteExercise,
  finishWorkout,
  deleteWorkout,
  saveWorkoutAsTemplate,
} from '../../db/queries';
import { WorkoutWithExercises } from '../../db/schema';

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
  const db = useDatabase();
  const [workout, setWorkout] = useState<WorkoutWithExercises | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [customExercise, setCustomExercise] = useState('');
  const [finishNote, setFinishNote] = useState('');
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const loadWorkout = useCallback(async () => {
    if (!id) return;
    const data = await getWorkoutWithExercises(db, parseInt(id));
    setWorkout(data);
  }, [db, id]);

  useEffect(() => {
    loadWorkout();
  }, [loadWorkout]);

  const handleAddExercise = async (name: string) => {
    if (!id || !name.trim()) return;
    await addExercise(db, parseInt(id), name.trim());
    setShowExerciseModal(false);
    setCustomExercise('');
    loadWorkout();
  };

  const handleAddSet = async (exerciseId: number) => {
    await addSet(db, exerciseId, 0, 0);
    loadWorkout();
  };

  const handleUpdateSet = async (setId: number, weight: string, reps: string) => {
    const w = parseFloat(weight) || 0;
    const r = parseInt(reps) || 0;
    await updateSet(db, setId, w, r);
    loadWorkout();
  };

  const handleDeleteSet = async (setId: number) => {
    await deleteSet(db, setId);
    loadWorkout();
  };

  const handleDeleteExercise = (exerciseId: number, exerciseName: string) => {
    Alert.alert(
      'Delete Exercise',
      `Remove ${exerciseName} and all its sets?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteExercise(db, exerciseId);
            loadWorkout();
          },
        },
      ]
    );
  };

  const handleFinish = async () => {
    if (!id) return;
    
    if (saveAsTemplate && templateName.trim()) {
      try {
        await saveWorkoutAsTemplate(db, parseInt(id), templateName.trim());
      } catch (error) {
        console.error('Failed to save template:', error);
      }
    }
    
    await finishWorkout(db, parseInt(id), finishNote);
    router.replace('/');
  };

  const handleCancel = () => {
    Alert.alert(
      'Cancel Workout',
      'This will delete the entire workout. Are you sure?',
      [
        { text: 'Keep Working', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            if (!id) return;
            await deleteWorkout(db, parseInt(id));
            router.replace('/');
          },
        },
      ]
    );
  };

  const openFinishModal = () => {
    if (workout?.exercises.length) {
      const firstExercise = workout.exercises[0].name;
      if (firstExercise.toLowerCase().includes('bench') || 
          firstExercise.toLowerCase().includes('press')) {
        setTemplateName('Push Day');
      } else if (firstExercise.toLowerCase().includes('squat') ||
                 firstExercise.toLowerCase().includes('leg')) {
        setTemplateName('Leg Day');
      } else if (firstExercise.toLowerCase().includes('pull') ||
                 firstExercise.toLowerCase().includes('row') ||
                 firstExercise.toLowerCase().includes('deadlift')) {
        setTemplateName('Pull Day');
      } else {
        setTemplateName('');
      }
    }
    setShowFinishModal(true);
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
        {workout.exercises.map((exercise) => (
          <View key={exercise.id} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Pressable onPress={() => handleDeleteExercise(exercise.id, exercise.name)}>
                <Text style={styles.deleteText}>×</Text>
              </Pressable>
            </View>

            <View style={styles.setsHeader}>
              <Text style={styles.setLabel}>Set</Text>
              <Text style={styles.setLabel}>Weight</Text>
              <Text style={styles.setLabel}>Reps</Text>
              <Text style={styles.setLabel}></Text>
            </View>

            {exercise.sets.map((set, index) => (
              <View key={set.id} style={styles.setRow}>
                <Text style={styles.setNumber}>{index + 1}</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="decimal-pad"
                  placeholder="0"
                  placeholderTextColor="#999"
                  defaultValue={set.weight > 0 ? set.weight.toString() : ''}
                  onEndEditing={(e) =>
                    handleUpdateSet(set.id, e.nativeEvent.text, set.reps.toString())
                  }
                />
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="0"
                  placeholderTextColor="#999"
                  defaultValue={set.reps > 0 ? set.reps.toString() : ''}
                  onEndEditing={(e) =>
                    handleUpdateSet(set.id, set.weight.toString(), e.nativeEvent.text)
                  }
                />
                <Pressable onPress={() => handleDeleteSet(set.id)}>
                  <Text style={styles.deleteSetText}>×</Text>
                </Pressable>
              </View>
            ))}

            <Pressable style={styles.addSetButton} onPress={() => handleAddSet(exercise.id)}>
              <Text style={styles.addSetText}>+ Add Set</Text>
            </Pressable>
          </View>
        ))}

        <Pressable style={styles.addExerciseButton} onPress={() => setShowExerciseModal(true)}>
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Pressable style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.finishButton} onPress={openFinishModal}>
          <Text style={styles.finishButtonText}>Finish Workout</Text>
        </Pressable>
      </View>

      {/* Exercise Selection Modal */}
      <Modal visible={showExerciseModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Exercise</Text>
            
            <TextInput
              style={styles.customInput}
              placeholder="Custom exercise name..."
              placeholderTextColor="#999"
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
              placeholderTextColor="#999"
              value={finishNote}
              onChangeText={setFinishNote}
              multiline
            />

            {workout.exercises.length > 0 && (
              <View style={styles.templateSection}>
                <View style={styles.templateToggle}>
                  <Text style={styles.templateToggleText}>Save as Template</Text>
                  <Switch
                    value={saveAsTemplate}
                    onValueChange={setSaveAsTemplate}
                    trackColor={{ false: '#e0e0e0', true: '#e94560' }}
                    thumbColor="#fff"
                  />
                </View>
                
                {saveAsTemplate && (
                  <TextInput
                    style={styles.customInput}
                    placeholder="Template name (e.g., Push Day)"
                    placeholderTextColor="#999"
                    value={templateName}
                    onChangeText={setTemplateName}
                  />
                )}
              </View>
            )}

            <Pressable style={styles.finishButton} onPress={handleFinish}>
              <Text style={styles.finishButtonText}>Save Workout</Text>
            </Pressable>

            <Pressable style={styles.closeModal} onPress={() => setShowFinishModal(false)}>
              <Text style={styles.closeModalText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
    color: '#666',
    textAlign: 'center',
    marginTop: 50,
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  exerciseName: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '600',
  },
  deleteText: {
    color: '#e94560',
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 5,
  },
  setsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  setLabel: {
    color: '#888',
    fontSize: 12,
    width: 60,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  setNumber: {
    color: '#888',
    width: 60,
    textAlign: 'center',
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#f5f5f5',
    color: '#1a1a1a',
    width: 60,
    padding: 10,
    borderRadius: 8,
    textAlign: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  deleteSetText: {
    color: '#ccc',
    fontSize: 20,
    paddingHorizontal: 10,
  },
  addSetButton: {
    marginTop: 10,
    padding: 10,
    alignItems: 'center',
  },
  addSetText: {
    color: '#e94560',
    fontWeight: '500',
  },
  addExerciseButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 100,
    borderWidth: 2,
    borderColor: '#e94560',
    borderStyle: 'dashed',
  },
  addExerciseText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomButtons: {
    flexDirection: 'row',
    padding: 15,
    gap: 10,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  cancelButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ccc',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  finishButton: {
    flex: 2,
    backgroundColor: '#e94560',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    color: '#1a1a1a',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  customInput: {
    backgroundColor: '#f5f5f5',
    color: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  noteInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  exerciseList: {
    maxHeight: 300,
  },
  exerciseOption: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  exerciseOptionText: {
    color: '#1a1a1a',
    fontSize: 16,
  },
  templateSection: {
    marginBottom: 15,
  },
  templateToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  templateToggleText: {
    color: '#1a1a1a',
    fontSize: 16,
  },
  closeModal: {
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  closeModalText: {
    color: '#888',
    fontSize: 16,
  },
});