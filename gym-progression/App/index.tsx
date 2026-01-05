import { View, Text, StyleSheet, Pressable, FlatList, Modal } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../db/DatabaseContext';
import { createWorkout, getRecentWorkouts, getAllTemplates, createWorkoutFromTemplate } from '../db/queries';
import { Workout, Template } from '../db/schema';

export default function HomeScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  const loadData = useCallback(async () => {
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
    const workoutId = await createWorkout(db);
    router.push(`/workout/${workoutId}`);
  };

  const handleStartFromTemplate = async (templateId: number) => {
    const workoutId = await createWorkoutFromTemplate(db, templateId);
    setShowTemplateModal(false);
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  startSection: {
    gap: 10,
    marginBottom: 25,
  },
  startButton: {
    backgroundColor: '#e94560',
    paddingVertical: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#e94560',
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
    backgroundColor: '#fff',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#e94560',
  },
  templateButtonText: {
    color: '#e94560',
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
    color: '#1a1a1a',
    fontSize: 18,
    fontWeight: '600',
  },
  seeAllText: {
    color: '#e94560',
    fontSize: 14,
    fontWeight: '500',
  },
  templateChip: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  templateChipText: {
    color: '#1a1a1a',
    fontSize: 14,
  },
  recentSection: {
    flex: 1,
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    marginTop: 40,
  },
  workoutCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  workoutDate: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '500',
  },
  workoutNote: {
    color: '#666',
    fontSize: 14,
    marginTop: 4,
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
    maxHeight: '70%',
  },
  modalTitle: {
    color: '#1a1a1a',
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
    borderBottomColor: '#f0f0f0',
  },
  templateOptionText: {
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