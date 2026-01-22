import { View, Text, StyleSheet, Pressable, ScrollView, Modal, Image, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../../db/DatabaseContext';
import {
  createWorkout,
  getInProgressWorkout,
  isWorkoutEmpty,
  deleteWorkout,
  finishWorkout,
  getDashboardStats,
  DashboardStats,
  getAllPrograms,
  getNextProgramDay,
  createWorkoutFromTemplate,
  createWorkoutFromProgramDay,
  getActiveProgram,
} from '../../db/queries';
import { Workout, Program, ProgramDayWithExercises, ProgramWithDays } from '../../db/schema';
import WorkoutConflictModal from '../../components/WorkoutConflictModal';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

const colors = {
  primary: '#22C55E',
  background: '#0A0A0A',
  card: '#171717',
  surface: '#262626',
  text: '#ffffff',
  textMuted: '#888888',
  border: 'rgba(255,255,255,0.05)',
};

const PROGRAM_IMAGES = [
  'https://lh3.googleusercontent.com/aida-public/AB6AXuBrPOttjjqe2V4DxPLoAspONU-P0tMp2cbFCvKLtGfjSXwUrF4m5-zG4oAEpWoyaFFb5_d_bSyXkkNZ8xB3b5Jlwj4Z-4vItay99XYRqGFw08gdPf8WbJOGxacXQXYt-5kx9q4scHJzGVHReNgR4jsszj-06BWjtueq9RnXTV5D_5PjyWTg86HLSd8LeQNtgpXk7KcPYZmYDz1Ylf_qNwCbrccjAsxNnbWg65h5BQIzfES8NJkDFBj0QDLoWbwM2Jp3vqWjEBfC46Y',
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop',
];

export default function HomeScreen() {
  const router = useRouter();
  const db = useDatabase();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [inProgressWorkout, setInProgressWorkout] = useState<Workout | null>(null);
  const [nextProgramInfo, setNextProgramInfo] = useState<{ program: Program, nextDay: ProgramDayWithExercises } | null>(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingProgramWorkout, setPendingProgramWorkout] = useState<{ programDayId: number, dayIndex: number } | null>(null);
  const [activeProgram, setActiveProgram] = useState<ProgramWithDays | null>(null);
  const [showProgramDayModal, setShowProgramDayModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const dashboardStats = await getDashboardStats(db);
      setStats(dashboardStats);

      const allPrograms = await getAllPrograms(db);
      setPrograms(allPrograms);

      const nextDay = await getNextProgramDay(db);
      setNextProgramInfo(nextDay);

      const activeWorkout = await getInProgressWorkout(db);
      setInProgressWorkout(activeWorkout);

      const activeProg = await getActiveProgram(db);
      setActiveProgram(activeProg);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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

    setShowConflictModal(true);
  };

  const handleStartProgramWorkout = async (programDayId: number, dayIndex: number) => {
    const active = await getInProgressWorkout(db);
    if (!active) {
      const workoutId = await createWorkoutFromProgramDay(db, programDayId, nextProgramInfo?.program.id!, dayIndex);
      router.push(`/workout/${workoutId}`);
      return;
    }

    const isEmpty = await isWorkoutEmpty(db, active.id);
    if (isEmpty) {
      await deleteWorkout(db, active.id);
      const workoutId = await createWorkoutFromProgramDay(db, programDayId, nextProgramInfo?.program.id!, dayIndex);
      router.push(`/workout/${workoutId}`);
      return;
    }

    setPendingProgramWorkout({ programDayId, dayIndex });
    setShowConflictModal(true);
  };

  const handleConflictFinish = async () => {
    const active = await getInProgressWorkout(db);
    if (active) {
      await finishWorkout(db, active.id, 'Finished to start new session');
      setShowConflictModal(false);

      if (pendingProgramWorkout) {
        const workoutId = await createWorkoutFromProgramDay(
          db,
          pendingProgramWorkout.programDayId,
          nextProgramInfo?.program.id!,
          pendingProgramWorkout.dayIndex
        );
        setPendingProgramWorkout(null);
        router.push(`/workout/${workoutId}`);
      } else {
        const workoutId = await createWorkout(db);
        router.push(`/workout/${workoutId}`);
      }
    }
  };

  const handleConflictDelete = async () => {
    const active = await getInProgressWorkout(db);
    if (active) {
      await deleteWorkout(db, active.id);
      setShowConflictModal(false);

      if (pendingProgramWorkout) {
        const workoutId = await createWorkoutFromProgramDay(
          db,
          pendingProgramWorkout.programDayId,
          nextProgramInfo?.program.id!,
          pendingProgramWorkout.dayIndex
        );
        setPendingProgramWorkout(null);
        router.push(`/workout/${workoutId}`);
      } else {
        const workoutId = await createWorkout(db);
        router.push(`/workout/${workoutId}`);
      }
    }
  };

  const handleConflictContinue = async () => {
    const active = await getInProgressWorkout(db);
    if (active) {
      setShowConflictModal(false);
      router.push(`/workout/${active.id}`);
    }
  };

  const formatVolume = (v: number) => {
    if (v >= 1000) return (v / 1000).toFixed(1) + 'k';
    return v.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <View style={styles.container}>
      {/* Navbar */}
      <View style={styles.navbar}>
        <View style={styles.navLeft}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA89JwEk0kjJbY4x224ABIN5cESjPVLkUztOT3Uy1_OzZJ_FhJJJkkM9t5BSIWcMdFZhmI224RscCwQCP_lJ7dLn0PHfGQ3qrpltiJSsHUloyShzWlFCxRyfEMzEAfygKXjn_Ip5hbQUrPwwZJPLDyuH4jeZ31hn_Cb4QivltGPsqBCGT-sYxEM7WbZN9uV52m-YhBBiDm0eROC7vyqi6Vio4dPKa8K_6R6-FZCRU0OmuVpDQjPS1sb08jfEgmfVndLoyuxsCw3aZA' }}
            style={styles.avatar}
          />
          <View>
            <Text style={styles.navLabel}>ATHLETE</Text>
            <Text style={styles.navWelcome}>Welcome, User</Text>
          </View>
        </View>
        <Pressable style={styles.notifButton}>
          <MaterialCommunityIcons name="bell-outline" size={24} color="rgba(255,255,255,0.7)" />
          <View style={styles.notifBadge} />
        </Pressable>
      </View>

      <ScrollView style={styles.main} showsVerticalScrollIndicator={false} contentContainerStyle={styles.mainContent}>
        {/* Active Workout Card */}
        {inProgressWorkout && (
          <Pressable
            style={styles.activeWorkoutCard}
            onPress={() => router.push(`/workout/${inProgressWorkout.id}`)}
          >
            <View style={styles.activeWorkoutHeader}>
              <View style={styles.activeDot} />
              <Text style={styles.activeWorkoutTitle}>WORKOUT IN PROGRESS</Text>
            </View>
            <View style={styles.activeWorkoutBody}>
              <Text style={styles.activeWorkoutText}>You have an active session! Tap to continue.</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color={colors.primary} />
            </View>
          </Pressable>
        )}

        {/* Next Up / Last Session Card */}
        {nextProgramInfo ? (
          <View style={styles.lastSessionCard}>
            <MaterialCommunityIcons name="run" size={120} color="rgba(34, 197, 94, 0.05)" style={styles.cardBgIcon} />
            <View style={styles.cardHeader}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>NEXT UP: {nextProgramInfo.program.name.toUpperCase()}</Text>
              </View>
              <Text style={styles.cardDate}>
                {nextProgramInfo.nextDay.exercises.length > 0
                  ? `${nextProgramInfo.nextDay.exercises.length} Exercises`
                  : 'Rest Day'}
              </Text>
            </View>
            <Text style={styles.cardTitle}>{nextProgramInfo.nextDay.name}</Text>

            {nextProgramInfo.nextDay.exercises.length > 0 ? (
              <Pressable
                style={styles.programStartButton}
                onPress={() => handleStartProgramWorkout(nextProgramInfo.nextDay.id, nextProgramInfo.nextDay.day_index)}
              >
                <Text style={styles.programStartText}>START WORKOUT</Text>
                <MaterialCommunityIcons name="arrow-right" size={18} color="black" />
              </Pressable>
            ) : (
              <View style={styles.restDayInfo}>
                <MaterialCommunityIcons name="sleep" size={24} color={colors.primary} />
                <Text style={styles.restDayText}>Enjoy your recovery!</Text>
              </View>
            )}
          </View>
        ) : (
          <View style={styles.lastSessionCard}>
            <MaterialCommunityIcons name="chart-line" size={120} color="rgba(255,255,255,0.03)" style={styles.cardBgIcon} />
            <View style={styles.cardHeader}>
              <View style={styles.tag}>
                <Text style={styles.tagText}>LAST SESSION</Text>
              </View>
              <Text style={styles.cardDate}>
                {stats?.lastSession ? formatDate(stats.lastSession.date) : 'No recent sessions'}
              </Text>
            </View>
            <Text style={styles.cardTitle}>{stats?.lastSession?.name || 'Start your first workout'}</Text>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>DURATION</Text>
                <View style={styles.statValueContainer}>
                  <Text style={styles.statValue}>{stats?.lastSession ? stats.lastSession.duration : 0}</Text>
                  <Text style={styles.statUnit}>min</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>VOLUME</Text>
                <View style={styles.statValueContainer}>
                  <Text style={styles.statValue}>{stats?.lastSession ? formatVolume(stats.lastSession.volume) : 0}</Text>
                  <Text style={styles.statUnit}>kg</Text>
                </View>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>EXERCISES</Text>
                <View style={styles.statValueContainer}>
                  <Text style={styles.statValue}>{stats?.lastSession ? stats.lastSession.exercises : 0}</Text>
                  <Text style={styles.statUnit}>total</Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Start Workout Buttons */}
        <View style={styles.actionButtons}>
          <Pressable style={styles.startWorkoutButton} onPress={handleStartWorkout}>
            <MaterialCommunityIcons name="plus-circle" size={24} color="black" />
            <Text style={styles.startWorkoutText}>START EMPTY WORKOUT</Text>
          </Pressable>

          {activeProgram && (
            <Pressable
              style={styles.programDayButton}
              onPress={() => setShowProgramDayModal(true)}
            >
              <MaterialCommunityIcons name="format-list-bulleted" size={24} color={colors.primary} />
              <Text style={styles.programDayButtonText}>SELECT PROGRAM WORKOUT</Text>
            </Pressable>
          )}
        </View>

        {/* Programs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>YOUR PROGRAMS</Text>
            <Pressable style={styles.seeAllButton} onPress={() => router.push('/programs')}>
              <Text style={styles.seeAllText}>SEE ALL</Text>
              <MaterialCommunityIcons name="arrow-right" size={14} color={colors.primary} />
            </Pressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.programScroll} contentContainerStyle={styles.programScrollContent}>
            {programs.length === 0 ? (
              <View style={styles.emptyProgramCard}>
                <Text style={styles.emptyProgramTitle}>No programs yet</Text>
                <Pressable style={styles.createProgramButton} onPress={() => router.push('/programs/new')}>
                  <Text style={styles.createProgramText}>Create your first program</Text>
                </Pressable>
              </View>
            ) : (
              programs.map((program) => (
                <Pressable
                  key={program.id}
                  style={styles.programCard}
                  onPress={() => router.push(`/programs/${program.id}`)}
                >
                  <View style={styles.programImageContainer}>
                    {program.image_uri ? (
                      <Image source={{ uri: program.image_uri }} style={styles.programImage} />
                    ) : (program.image_index !== undefined && program.image_index !== -1 && PROGRAM_IMAGES[program.image_index]) ? (
                      <Image
                        source={{ uri: PROGRAM_IMAGES[program.image_index] }}
                        style={styles.programImage}
                      />
                    ) : (
                      <View style={[styles.programImage, { backgroundColor: colors.surface }]} />
                    )}
                    <LinearGradient
                      colors={['transparent', 'rgba(23,23,23,0.4)', colors.card]}
                      style={styles.programGradient}
                    />
                    {program.is_active && (
                      <View style={styles.activeTag}>
                        <Text style={styles.activeTagText}>ACTIVE</Text>
                      </View>
                    )}
                  </View>
                  <View style={styles.programInfo}>
                    <View style={styles.programHeaderRow}>
                      <Text style={styles.programTitle}>{program.name}</Text>
                      {program.is_active && (
                        <View style={styles.frequencyTag}>
                          <Text style={styles.frequencyText}>
                            {stats ? `${stats.sessionsPerWeek} SESSIONS / WEEK` : 'LOADING...'}
                          </Text>
                        </View>
                      )}
                    </View>
                    {program.description && (
                      <Text style={styles.programDetail}>{program.description}</Text>
                    )}

                  </View>
                </Pressable>
              ))
            )}
          </ScrollView>
        </View>
      </ScrollView>





      <WorkoutConflictModal
        visible={showConflictModal}
        onCancel={() => setShowConflictModal(false)}
        onContinue={handleConflictContinue}
        onFinishAndStartNew={handleConflictFinish}
        onDeleteAndStartNew={handleConflictDelete}
      />

      <Modal visible={showProgramDayModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Workout Day</Text>
            <ScrollView style={styles.modalScroll}>
              {activeProgram?.days.map((day) => (
                <Pressable
                  key={day.id}
                  style={styles.modalOption}
                  onPress={() => {
                    setShowProgramDayModal(false);
                    handleStartProgramWorkout(day.id, day.day_index);
                  }}
                >
                  <View>
                    <Text style={styles.modalOptionTitle}>{day.name}</Text>
                    <Text style={styles.modalOptionSubtitle}>
                      {day.exercises.length > 0 ? `${day.exercises.length} Exercises` : 'Rest Day'}
                    </Text>
                  </View>
                  <MaterialCommunityIcons name="chevron-right" size={24} color={colors.textMuted} />
                </Pressable>
              ))}
            </ScrollView>
            <Pressable style={styles.closeModal} onPress={() => setShowProgramDayModal(false)}>
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
    backgroundColor: colors.background,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  navLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navLabel: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  navWelcome: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
  },
  notifButton: {
    padding: 10,
    backgroundColor: colors.card,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: colors.border,
  },
  notifBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.background,
  },
  main: {
    flex: 1,
  },
  mainContent: {
    padding: 16,
    paddingBottom: 120,
    gap: 24,
  },
  activeWorkoutCard: {
    backgroundColor: 'rgba(34, 197, 94, 0.05)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.3)',
    marginBottom: 8,
  },
  activeWorkoutHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.primary,
  },
  activeWorkoutTitle: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  activeWorkoutBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeWorkoutText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  lastSessionCard: {
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardBgIcon: {
    position: 'absolute',
    top: -20,
    right: -20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tag: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  tagText: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  cardDate: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  cardTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 24,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    gap: 4,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  statUnit: {
    color: 'rgba(255,255,255,0.2)',
    fontSize: 10,
    fontWeight: '800',
  },
  startWorkoutButton: {
    backgroundColor: colors.primary,
    paddingVertical: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  startWorkoutText: {
    color: 'black',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  actionButtons: {
    gap: 12,
  },
  programDayButton: {
    backgroundColor: colors.card,
    paddingVertical: 20,
    borderRadius: 20,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  programDayButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.5,
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
  modalScroll: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: colors.surface,
    marginBottom: 8,
    borderRadius: 12,
  },
  modalOptionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
  modalOptionSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
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
  grid: {
    flexDirection: 'row',
    gap: 16,
  },
  gridItem: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    aspectRatio: 1.1,
    justifyContent: 'space-between',
  },
  gridIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  gridValue: {
    color: colors.text,
    fontSize: 32,
    fontWeight: '900',
  },
  gridLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  section: {},
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
  },
  programScroll: {
    marginHorizontal: -16,
  },
  programScrollContent: {
    paddingHorizontal: 16,
    gap: 16,
    paddingBottom: 4,
  },
  programCard: {
    width: width * 0.75,
    backgroundColor: colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  programImageContainer: {
    height: 140,
    width: '100%',
  },
  programImage: {
    width: '100%',
    height: '100%',
  },
  programGradient: {
    position: 'absolute',
    inset: 0,
  },
  activeTag: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeTagText: {
    color: 'black',
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1,
  },
  programInfo: {
    padding: 20,
  },
  programHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  frequencyTag: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  frequencyText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  programTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  programDetail: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressContainer: {
    marginTop: 24,
    gap: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  progressValue: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '900',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  emptyProgramCard: {
    width: width - 32,
    backgroundColor: colors.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  emptyProgramTitle: {
    color: colors.textMuted,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  createProgramButton: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(34, 197, 94, 0.2)',
  },
  createProgramText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
    borderWidth: 4,
    borderColor: colors.background,
    zIndex: 50,
  },

  programStartButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  programStartText: {
    color: 'black',
    fontWeight: '800',
    fontSize: 14,
  },
  restDayInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
  },
  restDayText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
