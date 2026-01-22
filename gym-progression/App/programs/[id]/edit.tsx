import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { useDatabase } from '../../../db/DatabaseContext';
import { getProgramById, updateProgram, addProgramDay, addProgramDayExercise } from '../../../db/queries';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ConfirmationModal from '../../../components/ConfirmationModal';

const colors = {
    primary: '#22C55E',
    background: '#0A0A0A',
    card: '#171717',
    surface: '#262626',
    text: '#ffffff',
    textMuted: 'rgba(255,255,255,0.4)',
    border: 'rgba(255,255,255,0.1)',
    inputBg: '#1C1C1C',
};

interface ExerciseEntry {
    name: string;
    sets: number;
}

interface ProgramDayEntry {
    dayIndex: number;
    name: string;
    exercises: ExerciseEntry[];
    isRestDay: boolean;
}

export default function EditProgramScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const db = useDatabase();

    const [loading, setLoading] = useState(true);
    const [programName, setProgramName] = useState('');
    const [description, setDescription] = useState('');
    const [days, setDays] = useState<ProgramDayEntry[]>([]);

    // Modal state for adding/editing exercises
    const [showExerciseModal, setShowExerciseModal] = useState(false);
    const [editingDayIndex, setEditingDayIndex] = useState<number | null>(null);
    const [tempExerciseName, setTempExerciseName] = useState('');
    const [tempSets, setTempSets] = useState('3');

    const [showErrorModal, setShowErrorModal] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');

    // Modal for picking day type when adding/inserting
    const [showDayTypeModal, setShowDayTypeModal] = useState(false);
    const [insertAtIndex, setInsertAtIndex] = useState<number | null>(null);

    useEffect(() => {
        const loadProgram = async () => {
            if (!id) return;
            const data = await getProgramById(db, parseInt(id as string));
            if (data) {
                setProgramName(data.name);
                setDescription(data.description || '');
                setDays(data.days.map(d => ({
                    dayIndex: d.day_index,
                    name: d.name,
                    isRestDay: d.exercises.length === 0,
                    exercises: d.exercises.map(ex => ({
                        name: ex.name,
                        sets: ex.default_sets
                    }))
                })));
            }
            setLoading(false);
        };
        loadProgram();
    }, [db, id]);

    const handleAddDay = (type: 'workout' | 'rest', atIndex?: number) => {
        if (days.length >= 14) return;

        const newDay: ProgramDayEntry = {
            dayIndex: atIndex ?? days.length,
            name: '', // Will be calculated after
            exercises: [],
            isRestDay: type === 'rest'
        };

        let newDays = [...days];
        if (atIndex !== undefined) {
            newDays.splice(atIndex, 0, newDay);
        } else {
            newDays.push(newDay);
        }

        // Re-calculate indices
        newDays = newDays.map((d, i) => ({
            ...d,
            dayIndex: i
        }));

        setDays(newDays);
        setShowDayTypeModal(false);
        setInsertAtIndex(null);
    };

    const handleRemoveDay = (index: number) => {
        if (days.length <= 1) return;
        const newDays = days.filter(d => d.dayIndex !== index)
            .map((d, i) => ({ ...d, dayIndex: i }));
        setDays(newDays);
    };

    const handleMoveDay = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === days.length - 1) return;

        const newDays = [...days];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newDays[index], newDays[targetIndex]] = [newDays[targetIndex], newDays[index]];

        // Re-calculate indices
        setDays(newDays.map((d, i) => ({
            ...d,
            dayIndex: i
        })));
    };

    const updateDayName = (dayIndex: number, newName: string) => {
        setDays(days.map(d =>
            d.dayIndex === dayIndex ? { ...d, name: newName } : d
        ));
    };

    const openTypePicker = (atIndex?: number) => {
        setInsertAtIndex(atIndex ?? null);
        setShowDayTypeModal(true);
    };

    const openAddExercise = (dayIndex: number) => {
        setEditingDayIndex(dayIndex);
        setTempExerciseName('');
        setTempSets('3');
        setShowExerciseModal(true);
    };

    const handleAddExercise = () => {
        if (!tempExerciseName.trim()) return;
        const sets = parseInt(tempSets) || 3;

        setDays(days.map(d => {
            if (d.dayIndex === editingDayIndex) {
                return {
                    ...d,
                    isRestDay: false,
                    exercises: [...d.exercises, { name: tempExerciseName.trim(), sets }]
                };
            }
            return d;
        }));
        setShowExerciseModal(false);
    };

    const removeExercise = (dayIndex: number, exIndex: number) => {
        setDays(days.map(d => {
            if (d.dayIndex === dayIndex) {
                const newEx = d.exercises.filter((_, i) => i !== exIndex);
                return { ...d, exercises: newEx, isRestDay: newEx.length === 0 };
            }
            return d;
        }));
    };

    const handleSave = async () => {
        if (!programName.trim()) {
            setErrorMsg('Please enter a program name.');
            setShowErrorModal(true);
            return;
        }

        try {
            await updateProgram(db, parseInt(id as string), programName.trim(), description.trim());

            for (const day of days) {
                const finalName = day.name.trim() || `Day ${day.dayIndex + 1}`;
                const dayId = await addProgramDay(db, parseInt(id as string), day.dayIndex, finalName);
                if (!day.isRestDay) {
                    for (const ex of day.exercises) {
                        await addProgramDayExercise(db, dayId, ex.name, ex.sets);
                    }
                }
            }

            router.back();
        } catch (error) {
            console.error('Failed to update program:', error);
            setErrorMsg('Failed to save program. Please try again.');
            setShowErrorModal(true);
        }
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center' }]}>
                <ActivityIndicator color={colors.primary} size="large" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="close" size={24} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>Edit Program</Text>
                <Pressable onPress={handleSave} style={styles.saveBtn}>
                    <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                <View style={styles.inputSection}>
                    <Text style={styles.inputLabel}>PROGRAM NAME</Text>
                    <TextInput
                        style={styles.mainInput}
                        placeholder="e.g. 5x5 Strength, PPL..."
                        placeholderTextColor={colors.textMuted}
                        value={programName}
                        onChangeText={setProgramName}
                    />

                    <Text style={[styles.inputLabel, { marginTop: 20 }]}>DESCRIPTION (OPTIONAL)</Text>
                    <TextInput
                        style={[styles.mainInput, styles.textArea]}
                        placeholder="What's the goal of this program?"
                        placeholderTextColor={colors.textMuted}
                        value={description}
                        onChangeText={setDescription}
                        multiline
                    />
                </View>

                <View style={styles.daysHeader}>
                    <Text style={styles.sectionTitle}>WORKOUT CYCLE</Text>
                    {days.length < 14 && (
                        <Pressable style={styles.activeAddDayBtn} onPress={() => openTypePicker()}>
                            <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                            <Text style={styles.activeAddDayTxt}>ADD DAY</Text>
                        </Pressable>
                    )}
                </View>

                {days.map((day, index) => (
                    <View key={day.dayIndex}>
                        {/* Insert Button Before */}
                        <Pressable
                            style={styles.insertBtn}
                            onPress={() => openTypePicker(index)}
                        >
                            <View style={styles.insertLine} />
                            <View style={styles.insertIcon}>
                                <MaterialCommunityIcons name="plus" size={12} color={colors.primary} />
                            </View>
                            <View style={styles.insertLine} />
                        </Pressable>

                        <View style={styles.dayCard}>
                            <View style={styles.dayTop}>
                                <View style={styles.dayLabelContainer}>
                                    <View style={styles.reorderBtns}>
                                        <Pressable
                                            onPress={() => handleMoveDay(index, 'up')}
                                            disabled={index === 0}
                                        >
                                            <MaterialCommunityIcons
                                                name="chevron-up"
                                                size={20}
                                                color={index === 0 ? colors.border : colors.textMuted}
                                            />
                                        </Pressable>
                                        <Pressable
                                            onPress={() => handleMoveDay(index, 'down')}
                                            disabled={index === days.length - 1}
                                        >
                                            <MaterialCommunityIcons
                                                name="chevron-down"
                                                size={20}
                                                color={index === days.length - 1 ? colors.border : colors.textMuted}
                                            />
                                        </Pressable>
                                    </View>
                                    <View>
                                        <TextInput
                                            style={styles.dayTitleInput}
                                            value={day.name}
                                            onChangeText={(txt) => updateDayName(day.dayIndex, txt)}
                                            placeholder={`Day ${index + 1}`}
                                            placeholderTextColor="#666"
                                        />
                                        <Text style={styles.sequenceLabel}>POSITION {index + 1}</Text>
                                        <View style={[styles.typeBadge, day.isRestDay && styles.restBadge]}>
                                            <Text style={[styles.typeBadgeText, day.isRestDay && styles.restBadgeText]}>
                                                {day.isRestDay ? 'REST' : 'WORKOUT'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>

                                {days.length > 1 && (
                                    <Pressable onPress={() => handleRemoveDay(day.dayIndex)} style={styles.removeDayBtn}>
                                        <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                                    </Pressable>
                                )}
                            </View>

                            {!day.isRestDay && (
                                <View style={styles.exerciseSection}>
                                    {day.exercises.map((ex, exIdx) => (
                                        <View key={exIdx} style={styles.exerciseItem}>
                                            <View style={styles.exInfo}>
                                                <Text style={styles.exName}>{ex.name}</Text>
                                                <Text style={styles.exSets}>{ex.sets} sets</Text>
                                            </View>
                                            <Pressable onPress={() => removeExercise(day.dayIndex, exIdx)}>
                                                <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
                                            </Pressable>
                                        </View>
                                    ))}
                                    <Pressable style={styles.addExBtn} onPress={() => openAddExercise(day.dayIndex)}>
                                        <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                                        <Text style={styles.addExText}>ADD EXERCISE</Text>
                                    </Pressable>
                                </View>
                            )}
                            {day.isRestDay && (
                                <View style={styles.restDayPlaceholder}>
                                    <Text style={styles.restDayText}>Recovery & Growth</Text>
                                </View>
                            )}
                        </View>
                    </View>
                ))}
            </ScrollView>

            {/* Day Type Modal */}
            <Modal visible={showDayTypeModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Day Type</Text>
                        <Text style={styles.modalDesc}>Choose what kind of day to add to your program.</Text>

                        <View style={styles.typeOptionGroup}>
                            <Pressable
                                style={styles.typeOption}
                                onPress={() => handleAddDay('workout', insertAtIndex ?? undefined)}
                            >
                                <View style={[styles.typeIcon, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                                    <MaterialCommunityIcons name="dumbbell" size={24} color={colors.primary} />
                                </View>
                                <View style={styles.typeTextContainer}>
                                    <Text style={styles.typeOptionTitle}>Workout Day</Text>
                                    <Text style={styles.typeOptionDesc}>Plan specific exercises and sets.</Text>
                                </View>
                            </Pressable>

                            <Pressable
                                style={styles.typeOption}
                                onPress={() => handleAddDay('rest', insertAtIndex ?? undefined)}
                            >
                                <View style={[styles.typeIcon, { backgroundColor: 'rgba(255, 255, 255, 0.05)' }]}>
                                    <MaterialCommunityIcons name="sleep" size={24} color={colors.textMuted} />
                                </View>
                                <View style={styles.typeTextContainer}>
                                    <Text style={styles.typeOptionTitle}>Rest Day</Text>
                                    <Text style={styles.typeOptionDesc}>Active recovery or scheduled break.</Text>
                                </View>
                            </Pressable>
                        </View>

                        <Pressable style={styles.closeTypeModal} onPress={() => setShowDayTypeModal(false)}>
                            <Text style={styles.closeTypeModalTxt}>CANCEL</Text>
                        </Pressable>
                    </View>
                </View>
            </Modal>

            {/* Exercise Modal */}
            <Modal visible={showExerciseModal} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Exercise</Text>

                        <Text style={styles.modalLabel}>EXERCISE NAME</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="e.g. Bench Press"
                            placeholderTextColor={colors.textMuted}
                            value={tempExerciseName}
                            onChangeText={setTempExerciseName}
                            autoFocus
                        />

                        <Text style={[styles.modalLabel, { marginTop: 20 }]}>DEFAULT SETS</Text>
                        <TextInput
                            style={styles.modalInput}
                            keyboardType="numeric"
                            value={tempSets}
                            onChangeText={setTempSets}
                        />

                        <View style={styles.modalActions}>
                            <Pressable style={styles.modalCancel} onPress={() => setShowExerciseModal(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </Pressable>
                            <Pressable style={styles.modalAdd} onPress={handleAddExercise}>
                                <Text style={styles.modalAddText}>Add to Day</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <ConfirmationModal
                visible={showErrorModal}
                title="Invalid Program"
                description={errorMsg}
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
    saveBtn: {
        backgroundColor: colors.primary,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
    },
    saveBtnText: {
        color: 'black',
        fontWeight: '900',
        fontSize: 14,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 100,
    },
    inputSection: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 20,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: colors.border,
    },
    inputLabel: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 12,
    },
    mainInput: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
        backgroundColor: colors.inputBg,
        padding: 16,
        borderRadius: 16,
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        fontSize: 14,
        fontWeight: '400',
    },
    daysHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
        paddingHorizontal: 4,
    },
    sectionTitle: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
    },
    activeAddDayBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    activeAddDayTxt: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '800',
    },
    insertBtn: {
        height: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: 0.3,
    },
    insertLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.border,
    },
    insertIcon: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 10,
    },
    dayCard: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    dayTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    dayLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    reorderBtns: {
        gap: 4,
    },
    dayTitleInput: {
        color: 'white',
        fontSize: 18,
        fontWeight: '900',
        padding: 0,
        marginBottom: 2,
    },
    sequenceLabel: {
        color: colors.primary,
        fontSize: 8,
        fontWeight: '900',
        marginBottom: 8,
        opacity: 0.6,
    },
    typeBadge: {
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    restBadge: {
        backgroundColor: 'rgba(255,255,255,0.05)',
    },
    typeBadgeText: {
        color: colors.primary,
        fontSize: 8,
        fontWeight: '900',
    },
    restBadgeText: {
        color: colors.textMuted,
    },
    removeDayBtn: {
        padding: 8,
    },
    exerciseSection: {
        marginTop: 20,
        gap: 10,
    },
    exerciseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: 14,
        borderRadius: 16,
    },
    exInfo: {
        flex: 1,
    },
    exName: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 2,
    },
    exSets: {
        color: colors.textMuted,
        fontSize: 12,
    },
    addExBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
        borderStyle: 'dashed',
        borderRadius: 16,
        marginTop: 4,
    },
    addExText: {
        color: colors.primary,
        fontSize: 11,
        fontWeight: '900',
        letterSpacing: 1,
    },
    restDayPlaceholder: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    restDayText: {
        color: 'rgba(255,255,255,0.1)',
        fontSize: 12,
        fontWeight: '700',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.85)',
        justifyContent: 'center',
        padding: 24,
    },
    modalContent: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 8,
    },
    modalDesc: {
        color: colors.textMuted,
        fontSize: 14,
        marginBottom: 24,
    },
    typeOptionGroup: {
        gap: 12,
        marginBottom: 24,
    },
    typeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    typeIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    typeTextContainer: {
        flex: 1,
    },
    typeOptionTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 2,
    },
    typeOptionDesc: {
        color: colors.textMuted,
        fontSize: 12,
    },
    closeTypeModal: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    closeTypeModalTxt: {
        color: colors.textMuted,
        fontWeight: '800',
        fontSize: 12,
    },
    modalLabel: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 10,
    },
    modalInput: {
        color: 'white',
        fontSize: 16,
        backgroundColor: colors.inputBg,
        padding: 16,
        borderRadius: 16,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 32,
    },
    modalCancel: {
        flex: 1,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalCancelText: {
        color: colors.textMuted,
        fontWeight: '700',
    },
    modalAdd: {
        flex: 2,
        backgroundColor: colors.primary,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
    },
    modalAddText: {
        color: 'black',
        fontWeight: '900',
    },
});
