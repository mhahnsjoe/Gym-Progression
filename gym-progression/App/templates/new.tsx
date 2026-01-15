import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useDatabase } from '../../db/DatabaseContext';
import { createTemplate, addTemplateExercise } from '../../db/queries';

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

interface TemplateExerciseItem {
  name: string;
  defaultSets: number;
}

export default function NewTemplateScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [templateName, setTemplateName] = useState('');
  const [exercises, setExercises] = useState<TemplateExerciseItem[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [customExercise, setCustomExercise] = useState('');

  const handleAddExercise = (name: string) => {
    if (!name.trim()) return;
    setExercises([...exercises, { name: name.trim(), defaultSets: 3 }]);
    setShowExerciseModal(false);
    setCustomExercise('');
  };

  const handleUpdateSets = (index: number, sets: number) => {
    const updated = [...exercises];
    updated[index].defaultSets = Math.max(1, Math.min(10, sets));
    setExercises(updated);
  };

  const handleRemoveExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!templateName.trim()) {
      Alert.alert('Missing Name', 'Please enter a template name.');
      return;
    }
    if (exercises.length === 0) {
      Alert.alert('No Exercises', 'Add at least one exercise to your template.');
      return;
    }

    try {
      const templateId = await createTemplate(db, templateName.trim());
      
      for (const exercise of exercises) {
        await addTemplateExercise(db, templateId, exercise.name, exercise.defaultSets);
      }

      router.back();
    } catch (error) {
      console.error('Failed to create template:', error);
      Alert.alert('Error', 'Failed to create template. Please try again.');
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.label}>Template Name</Text>
        <TextInput
          style={styles.nameInput}
          placeholder="e.g., Push Day, Leg Day, Full Body..."
          placeholderTextColor="#999"
          value={templateName}
          onChangeText={setTemplateName}
        />

        <Text style={styles.label}>Exercises</Text>
        
        {exercises.map((exercise, index) => (
          <View key={index} style={styles.exerciseCard}>
            <View style={styles.exerciseHeader}>
              <Text style={styles.exerciseName}>{exercise.name}</Text>
              <Pressable onPress={() => handleRemoveExercise(index)}>
                <Text style={styles.removeText}>×</Text>
              </Pressable>
            </View>
            
            <View style={styles.setsRow}>
              <Text style={styles.setsLabel}>Default sets:</Text>
              <View style={styles.setsControl}>
                <Pressable 
                  style={styles.setsButton}
                  onPress={() => handleUpdateSets(index, exercise.defaultSets - 1)}
                >
                  <Text style={styles.setsButtonText}>−</Text>
                </Pressable>
                <Text style={styles.setsValue}>{exercise.defaultSets}</Text>
                <Pressable 
                  style={styles.setsButton}
                  onPress={() => handleUpdateSets(index, exercise.defaultSets + 1)}
                >
                  <Text style={styles.setsButtonText}>+</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ))}

        <Pressable 
          style={styles.addExerciseButton} 
          onPress={() => setShowExerciseModal(true)}
        >
          <Text style={styles.addExerciseText}>+ Add Exercise</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Save Template</Text>
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

            <Pressable 
              style={styles.closeModal} 
              onPress={() => setShowExerciseModal(false)}
            >
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
  label: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 10,
  },
  nameInput: {
    backgroundColor: '#fff',
    color: '#1a1a1a',
    padding: 15,
    borderRadius: 10,
    fontSize: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseName: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '600',
  },
  removeText: {
    color: '#2196F3',
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 5,
  },
  setsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setsLabel: {
    color: '#666',
    fontSize: 14,
  },
  setsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15,
  },
  setsButton: {
    backgroundColor: '#f5f5f5',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  setsButtonText: {
    color: '#1a1a1a',
    fontSize: 20,
    fontWeight: '600',
  },
  setsValue: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '600',
    minWidth: 24,
    textAlign: 'center',
  },
  addExerciseButton: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 100,
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
  },
  addExerciseText: {
    color: '#2196F3',
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
  saveButton: {
    flex: 2,
    backgroundColor: '#2196F3',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
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