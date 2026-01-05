import { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, Pressable, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../../db/DatabaseContext';
import { getAllTemplates, deleteTemplate, createWorkoutFromTemplate, getTemplateWithExercises } from '../../db/queries';
import { Template, TemplateWithExercises } from '../../db/schema';

export default function TemplatesScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [templates, setTemplates] = useState<TemplateWithExercises[]>([]);

  const loadTemplates = useCallback(async () => {
    try {
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
    const workoutId = await createWorkoutFromTemplate(db, templateId);
    router.push(`/workout/${workoutId}`);
  };

  const handleDeleteTemplate = (template: Template) => {
    Alert.alert(
      'Delete Template',
      `Are you sure you want to delete "${template.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteTemplate(db, template.id);
            loadTemplates();
          },
        },
      ]
    );
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContent: {
    padding: 15,
    paddingTop: 5,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    color: '#1a1a1a',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  createButtonLarge: {
    backgroundColor: '#e94560',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 10,
  },
  createButtonLargeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#fff',
    padding: 16,
    margin: 15,
    marginBottom: 5,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e94560',
  },
  createButtonText: {
    color: '#e94560',
    fontSize: 16,
    fontWeight: '600',
  },
  templateCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  templateMain: {
    padding: 16,
  },
  templateName: {
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 6,
  },
  templateMeta: {
    color: '#888',
    fontSize: 13,
    marginBottom: 10,
  },
  exercisePreview: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  exercisePreviewText: {
    color: '#666',
    fontSize: 13,
  },
  exercisePreviewMore: {
    color: '#e94560',
    fontSize: 13,
  },
  templateActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  startButton: {
    flex: 1,
    padding: 14,
    alignItems: 'center',
    backgroundColor: '#e94560',
  },
  startButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  deleteButton: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#f0f0f0',
    backgroundColor: '#fff',
  },
  deleteButtonText: {
    color: '#ccc',
    fontSize: 22,
    fontWeight: 'bold',
  },
});