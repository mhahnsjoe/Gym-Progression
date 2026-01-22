import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../../db/DatabaseContext';
import { getAllPrograms, setActiveProgram, getActiveProgram } from '../../db/queries';
import { ProgramWithDays } from '../../db/schema';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

const colors = {
    primary: '#22C55E',
    background: '#0A0A0A',
    card: '#171717',
    surface: '#262626',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.4)',
    border: 'rgba(255,255,255,0.1)',
};

export default function ProgramDetailsScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const db = useDatabase();
    const [program, setProgram] = useState<ProgramWithDays | null>(null);

    const loadProgram = useCallback(async () => {
        if (!id) return;

        // Use the existing logic to fetch program with days and exercises
        // Since getActiveProgram has the full logic, we can repurpose parts of it
        // Or fetch all programs and find this one, then fetch its days manually.

        const all = await getAllPrograms(db);
        const p = all.find(item => item.id === parseInt(id as string));

        if (p) {
            const days = await db.getAllAsync<any>(`
                SELECT pd.*
                FROM program_days pd
                WHERE pd.program_id = ?
                ORDER BY pd.day_index ASC
            `, p.id);

            const daysWithExercises = await Promise.all(days.map(async (day: any) => {
                const exercises = await db.getAllAsync<any>(
                    'SELECT * FROM program_day_exercises WHERE program_day_id = ? ORDER BY order_index',
                    day.id
                );
                return { ...day, exercises };
            }));

            setProgram({
                ...p,
                days: daysWithExercises
            });
        }
    }, [db, id]);

    useFocusEffect(
        useCallback(() => {
            loadProgram();
        }, [loadProgram])
    );

    if (!program) return null;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>Program Details</Text>
                <Pressable onPress={() => router.push(`/programs/${id}/edit`)} style={styles.editButton}>
                    <MaterialCommunityIcons name="pencil-outline" size={24} color={colors.textMuted} />
                </Pressable>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <View style={styles.infoCard}>
                    <Text style={styles.programName}>{program.name}</Text>
                    <Text style={styles.programDesc}>{program.description || 'No description'}</Text>

                    {!program.is_active && (
                        <Pressable
                            style={styles.activateButton}
                            onPress={async () => {
                                await setActiveProgram(db, program.id);
                                loadProgram();
                            }}
                        >
                            <Text style={styles.activateButtonText}>SET AS ACTIVE PROGRAM</Text>
                        </Pressable>
                    )}
                </View>

                <Text style={styles.sectionHeader}>CYCLE DAYS</Text>
                {program.days.map((day) => (
                    <View key={day.id} style={styles.dayCard}>
                        <View style={styles.dayHeader}>
                            <Text style={styles.dayName}>{day.name}</Text>
                            {day.exercises.length > 0 ? (
                                <View style={styles.workoutTag}>
                                    <View style={styles.dot} />
                                    <Text style={styles.workoutTagText}>WORKOUT</Text>
                                </View>
                            ) : (
                                <View style={styles.restTag}>
                                    <Text style={styles.restTagText}>REST</Text>
                                </View>
                            )}
                        </View>

                        {day.exercises.length > 0 ? (
                            <View style={styles.exercisesList}>
                                {day.exercises.map((ex, idx) => (
                                    <View key={idx} style={styles.exerciseItem}>
                                        <Text style={styles.exerciseName}>{ex.name}</Text>
                                        <Text style={styles.exerciseSets}>{ex.default_sets} sets</Text>
                                    </View>
                                ))}
                            </View>
                        ) : (
                            <Text style={styles.restText}>Recovery Day</Text>
                        )}
                    </View>
                ))}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 60,
        paddingHorizontal: 16,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerTitle: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
    },
    backButton: {
        padding: 8,
    },
    editButton: {
        padding: 8,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
    },
    infoCard: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: colors.border,
    },
    programName: {
        color: 'white',
        fontSize: 24,
        fontWeight: '900',
        marginBottom: 8,
    },
    programDesc: {
        color: colors.textMuted,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 24,
    },
    activateButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    activateButtonText: {
        color: 'black',
        fontWeight: '900',
        fontSize: 14,
        letterSpacing: 1,
    },
    sectionHeader: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 2,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    dayCard: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dayHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    dayName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
    },
    workoutTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: colors.primary,
    },
    workoutTagText: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '900',
    },
    restTag: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
    },
    restTagText: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '900',
    },
    exercisesList: {
        gap: 12,
    },
    exerciseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.02)',
        padding: 12,
        borderRadius: 12,
    },
    exerciseName: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    exerciseSets: {
        color: colors.textMuted,
        fontSize: 12,
    },
    restText: {
        color: colors.textMuted,
        fontSize: 14,
        fontStyle: 'italic',
    },
});
