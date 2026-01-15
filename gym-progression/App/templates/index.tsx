import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../../db/DatabaseContext';
import {
  getAllTemplates,
  deleteTemplate,
  createWorkoutFromTemplate,
  getTemplateWithExercises,
  getInProgressWorkout,
  isWorkoutEmpty,
  deleteWorkout,
  finishWorkout
} from '../../db/queries';
import { Template, TemplateWithExercises, Workout } from '../../db/schema';
import WorkoutConflictModal from '../../components/WorkoutConflictModal';
import ConfirmationModal from '../../components/ConfirmationModal';

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

export default function TemplatesScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([]);
  const [inProgressWorkout, setInProgressWorkout] = useState<Workout | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [showDeleteTemplateModal, setShowDeleteTemplateModal] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<Template | null>(null);

  const loadTemplates = useCallback(async () => {
    try {
      const activeWorkout = await getInProgressWorkout(db);
      setInProgressWorkout(activeWorkout);

      const templateList = await getAllTemplates(db);
      const templatesWithExercises = await Promise.all(
        templateList.map(t => getTemplateWithExercises(db, t.id))
      );
      setTemplates(templatesWithExercises.filter((t): t is TemplateWithExercises => t !== null));
    } catch (error) {
      console.error('Failed to load templates:', error);
      setTemplates([]);
    }
  }, [db]);

  useFocusEffect(
    useCallback(() => {
      loadTemplates();
    }, [loadTemplates])
  );

  const handleStartFromTemplate = async (templateId: number) => {
    const active = await getInProgressWorkout(db);
    if (!active) {
      const workoutId = await createWorkoutFromTemplate(db, templateId);
      router.push(`/workout/${workoutId}`);
      return;
    }

    const isEmpty = await isWorkoutEmpty(db, active.id);
    if (isEmpty) {
      await deleteWorkout(db, active.id);
      const workoutId = await createWorkoutFromTemplate(db, templateId);
      router.push(`/workout/${workoutId}`);
      return;
    }

    setSelectedTemplateId(templateId);
    setShowConflictModal(true);
  };

  const handleConflictFinish = async () => {
    const active = await getInProgressWorkout(db);
    if (active && selectedTemplateId) {
      await finishWorkout(db, active.id, 'Finished to start new session');
      setShowConflictModal(false);
      const workoutId = await createWorkoutFromTemplate(db, selectedTemplateId);
      router.push(`/workout/${workoutId}`);
    }
  };

  const handleConflictDelete = async () => {
    const active = await getInProgressWorkout(db);
    if (active && selectedTemplateId) {
      await deleteWorkout(db, active.id);
      setShowConflictModal(false);
      const workoutId = await createWorkoutFromTemplate(db, selectedTemplateId);
      router.push(`/workout/${workoutId}`);
    }
  };

  const handleConflictContinue = async () => {
    const active = await getInProgressWorkout(db);
    if (active) {
      setShowConflictModal(false);
      router.push(`/workout/${active.id}`);
    }
  };

  const handleDeleteTemplate = (template: Template) => {
    setTemplateToDelete(template);
    setShowDeleteTemplateModal(true);
  };

  const confirmDeleteTemplate = async () => {
    if (!templateToDelete) return;
    await deleteTemplate(db, templateToDelete.id);
    setShowDeleteTemplateModal(false);
    setTemplateToDelete(null);
    loadTemplates();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (templates.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No Templates Yet</Text>
          <Text style={styles.emptyText}>
            Create a template to quickly start workouts with your favorite exercises pre-loaded.
          </Text>
          <Pressable
            style={styles.createButtonLarge}
            onPress={() => router.push('/templates/new')}
          >
            <Text style={styles.createButtonLargeText}>+ Create Your First Template</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={styles.createButton}
        onPress={() => router.push('/templates/new')}
      >
        <Text style={styles.createButtonText}>+ Create New Template</Text>
      </Pressable>

      <FlatList
        data={templates}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.templateCard}>
            <Pressable
              style={styles.templateMain}
              onPress={() => handleStartFromTemplate(item.id)}
            >
              <Text style={styles.templateName}>{item.name}</Text>
              <Text style={styles.templateMeta}>
                {item.exercises.length} exercises • Created {formatDate(item.created_at)}
              </Text>
              <View style={styles.exercisePreview}>
                {item.exercises.slice(0, 4).map((ex, index) => (
                  <Text key={ex.id} style={styles.exercisePreviewText}>
                    {ex.name}{index < Math.min(item.exercises.length - 1, 3) ? ' • ' : ''}
                  </Text>
                ))}
                {item.exercises.length > 4 && (
                  <Text style={styles.exercisePreviewMore}>
                    +{item.exercises.length - 4} more
                  </Text>
                )}
              </View>
            </Pressable>

            <View style={styles.templateActions}>
              <Pressable
                style={styles.startButton}
                onPress={() => handleStartFromTemplate(item.id)}
              >
                <Text style={styles.startButtonText}>Start</Text>
              </Pressable>
              <Pressable
                style={styles.deleteButton}
                onPress={() => handleDeleteTemplate(item)}
              >
                <Text style={styles.deleteButtonText}>×</Text>
              </Pressable>
            </View>
          </View>
        )}
      />

      <WorkoutConflictModal
        visible={showConflictModal}
        onCancel={() => {
          setShowConflictModal(false);
          setSelectedTemplateId(null);
        }}
        onContinue={handleConflictContinue}
        onFinishAndStartNew={handleConflictFinish}
        onDeleteAndStartNew={handleConflictDelete}
      />

      <ConfirmationModal
        visible={showDeleteTemplateModal}
        title="Delete Template"
        description={`Are you sure you want to delete "${templateToDelete?.name}"?`}
        confirmLabel="Delete"
        onConfirm={confirmDeleteTemplate}
        onCancel={() => setShowDeleteTemplateModal(false)}
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
  listContent: {
    padding: 16,
    paddingTop: 8,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  createButtonLarge: {
    backgroundColor: colors.primary,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  createButtonLargeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  createButton: {
    backgroundColor: colors.card,
    padding: 20,
    margin: 16,
    marginBottom: 8,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  createButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 1,
  },
  templateCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  templateMain: {
    padding: 16,
  },
  templateName: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  templateMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  exercisePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  exercisePreviewText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  exercisePreviewMore: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '600',
  },
  templateActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  startButton: {
    flex: 1,
    padding: 16,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
    letterSpacing: 1,
  },
  deleteButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
    backgroundColor: colors.card,
  },
  deleteButtonText: {
    color: colors.textMuted,
    fontSize: 24,
    fontWeight: '300',
  },
});