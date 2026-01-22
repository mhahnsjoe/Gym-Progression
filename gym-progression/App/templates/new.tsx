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
import ConfirmationModal from '../../components/ConfirmationModal';

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

// Theme colors matching your design
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

export default function NewTemplateScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [templateName, setTemplateName] = useState('');
  const [exercises, setExercises] = useState<TemplateExerciseItem[]>([]);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [customExercise, setCustomExercise] = useState('');

  // States for custom alerts
  const [alertConfig, setAlertConfig] = useState<{ title: string, message: string } | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);

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
      setAlertConfig({ title: 'Missing Name', message: 'Please enter a template name.' });
      setShowErrorModal(true);
      return;
    }
    if (exercises.length === 0) {
      setAlertConfig({ title: 'No Exercises', message: 'Add at least one exercise to your template.' });
      setShowErrorModal(true);
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
      setAlertConfig({ title: 'Error', message: 'Failed to create template. Please try again.' });
      setShowErrorModal(true);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <Text style={styles.label}>Template Name</Text>
        <TextInput
          style={styles.nameInput}
          placeholder="e.g., Push Day, Leg Day, Full Body..."
          placeholderTextColor="#666"
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
          <Text style={styles.addExerciseText}>+ ADD EXERCISE</Text>
        </Pressable>
      </ScrollView>

      <View style={styles.bottomButtons}>
        <Pressable style={styles.cancelButton} onPress={() => router.back()}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>SAVE TEMPLATE</Text>
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
              placeholderTextColor="#666"
              value={customExercise}
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

      <ConfirmationModal
        visible={showErrorModal}
        title={alertConfig?.title || 'Alert'}
        description={alertConfig?.message || ''}
        confirmLabel="OK"
        onConfirm={() => setShowErrorModal(false)}
        onCancel={() => setShowErrorModal(false)}
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
    padding: 16,
  },
  label: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 8,
    marginTop: 16,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  nameInput: {
    backgroundColor: colors.inputBg,
    color: colors.text,
    padding: 16,
    borderRadius: 12,
    fontSize: 16,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(0,199,149,0.3)',
  },
  exerciseCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  exerciseName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  removeText: {
    color: colors.textMuted,
    fontSize: 24,
    fontWeight: '300',
    paddingHorizontal: 8,
  },
  setsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    padding: 12,
    borderRadius: 8,
  },
  setsLabel: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
  },
  setsControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  setsButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  setsButtonText: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600',
  },
  setsValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: '700',
    minWidth: 24,
    textAlign: 'center',
  },
  addExerciseButton: {
    backgroundColor: colors.card,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 120,
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
  bottomButtons: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    padding: 16,
    paddingBottom: 24,
    gap: 12,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
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
  saveButton: {
    flex: 2,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
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