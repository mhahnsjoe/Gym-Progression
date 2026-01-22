import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Alert, Image } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useDatabase } from '../../db/DatabaseContext';
import { createProgram, addProgramDay, addProgramDayExercise } from '../../db/queries';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ConfirmationModal from '../../components/ConfirmationModal';

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

const PROGRAM_IMAGES = [
    'https://lh3.googleusercontent.com/aida-public/AB6AXuBrPOttjjqe2V4DxPLoAspONU-P0tMp2cbFCvKLtGfjSXwUrF4m5-zG4oAEpWoyaFFb5_d_bSyXkkNZ8xB3b5Jlwj4Z-4vItay99XYRqGFw08gdPf8WbJOGxacXQXYt-5kx9q4scHJzGVHReNgR4jsszj-06BWjtueq9RnXTV5D_5PjyWTg86HLSd8LeQNtgpXk7KcPYZmYDz1Ylf_qNwCbrccjAsxNnbWg65h5BQIzfES8NJkDFBj0QDLoWbwM2Jp3vqWjEBfC46Y',
    'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=2069&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop',
];

export default function NewProgramScreen() {
    const router = useRouter();
    const db = useDatabase();
    const [programName, setProgramName] = useState('');
    const [description, setDescription] = useState('');
    const [selectedImageIndex, setSelectedImageIndex] = useState(0); // Default to first image
    const [customImageUri, setCustomImageUri] = useState<string | null>(null);
    const [days, setDays] = useState<ProgramDayEntry[]>([
        { dayIndex: 0, name: 'Day 1', exercises: [], isRestDay: true }
    ]);

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

    const handleAddDay = (type: 'workout' | 'rest', atIndex?: number) => {
        if (days.length >= 14) return; // Increased limit slightly for flexibility

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

        // Re-calculate indices (sequence stays the same)
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

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [16, 9],
            quality: 0.8,
        });

        if (!result.canceled) {
            setCustomImageUri(result.assets[0].uri);
            setSelectedImageIndex(-2); // Special index for custom image
        }
    };

    const handleSave = async () => {
        if (!programName.trim()) {
            setErrorMsg('Please enter a program name.');
            setShowErrorModal(true);
            return;
        }

        try {
            const finalImageIndex = selectedImageIndex === -2 ? -1 : selectedImageIndex;
            const programId = await createProgram(db, programName.trim(), description.trim(), finalImageIndex, customImageUri || undefined);


            for (const day of days) {
                const finalName = day.name.trim() || `Day ${day.dayIndex + 1}`;
                const dayId = await addProgramDay(db, programId, day.dayIndex, finalName);
                if (!day.isRestDay) {
                    for (const ex of day.exercises) {
                        await addProgramDayExercise(db, dayId, ex.name, ex.sets);
                    }
                }
            }

            router.back();
        } catch (error) {
            console.error('Failed to create program:', error);
            setErrorMsg('Failed to save program. Please try again.');
            setShowErrorModal(true);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="close" size={24} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>New Program</Text>
                <Pressable onPress={handleSave} style={styles.saveButton}>
                    <Text style={styles.saveText}>Save</Text>
                </Pressable>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
                <View style={styles.inputGroup}>
                    <TextInput
                        style={styles.nameInput}
                        placeholder="Program Name (e.g. Strength 1.0)"
                        placeholderTextColor="#666"
                        value={programName}
                        onChangeText={setProgramName}
                    />
                    <TextInput
                        style={styles.descInput}
                        placeholder="Short description (optional)"
                        placeholderTextColor="#444"
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                {/* Image Picker */}
                <View style={styles.sectionHeader}>
                    <Text style={styles.label}>COVER IMAGE</Text>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.imageScroll} contentContainerStyle={styles.imageScrollContent}>
                    {PROGRAM_IMAGES.map((uri, index) => (
                        <Pressable
                            key={index}
                            style={[
                                styles.imageOption,
                                selectedImageIndex === index && styles.imageOptionSelected
                            ]}
                            onPress={() => setSelectedImageIndex(index)}
                        >
                            <Image
                                source={{ uri }}
                                style={styles.imageOptionImg}
                            />
                            {selectedImageIndex === index && (
                                <View style={styles.checkIcon}>
                                    <MaterialCommunityIcons name="check" size={16} color="black" />
                                </View>
                            )}
                        </Pressable>
                    ))}
                    {/* Custom Image option */}
                    <Pressable
                        style={[
                            styles.imageOption,
                            selectedImageIndex === -2 && styles.imageOptionSelected,
                            { backgroundColor: 'rgba(34, 197, 94, 0.1)', justifyContent: 'center', alignItems: 'center' }
                        ]}
                        onPress={pickImage}
                    >
                        {customImageUri ? (
                            <Image source={{ uri: customImageUri }} style={styles.imageOptionImg} />
                        ) : (
                            <MaterialCommunityIcons name="image-plus" size={24} color={colors.primary} />
                        )}

                        {!customImageUri && <Text style={{ color: colors.primary, fontSize: 10, fontWeight: '700', marginTop: 4 }}>GALLERY</Text>}

                        {selectedImageIndex === -2 && (
                            <View style={styles.checkIcon}>
                                <MaterialCommunityIcons name="check" size={16} color="black" />
                            </View>
                        )}
                    </Pressable>

                    {/* No image option */}
                    <Pressable
                        style={[
                            styles.imageOption,
                            styles.noImageOption,
                            selectedImageIndex === -1 && styles.imageOptionSelected
                        ]}
                        onPress={() => setSelectedImageIndex(-1)}
                    >
                        <MaterialCommunityIcons name="image-off-outline" size={24} color={selectedImageIndex === -1 ? 'white' : colors.textMuted} />
                        <Text style={[styles.noImageText, selectedImageIndex === -1 && styles.noImageTextSelected]}>None</Text>
                        {selectedImageIndex === -1 && (
                            <View style={styles.checkIcon}>
                                <MaterialCommunityIcons name="check" size={16} color="black" />
                            </View>
                        )}
                    </Pressable>
                </ScrollView>

                <View style={styles.sectionDivider} />

                <View style={styles.sectionHeader}>
                    <Text style={styles.label}>CYCLE SEQUENCE</Text>
                    {days.length < 14 && (
                        <Pressable style={styles.addDayBtn} onPress={() => openTypePicker()}>
                            <MaterialCommunityIcons name="plus" size={16} color={colors.primary} />
                            <Text style={styles.addDayTxt}>ADD DAY</Text>
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
                            <View style={styles.dayCardHeader}>
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
                                            style={styles.dayNameInput}
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
                                    <Pressable onPress={() => handleRemoveDay(day.dayIndex)} style={styles.deleteBtn}>
                                        <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                                    </Pressable>
                                )}
                            </View>

                            {!day.isRestDay && (
                                <View style={styles.exercisesContainer}>
                                    {day.exercises.map((ex, idx) => (
                                        <View key={idx} style={styles.exerciseRow}>
                                            <View style={styles.exerciseInfo}>
                                                <Text style={styles.exerciseName}>{ex.name}</Text>
                                                <Text style={styles.exerciseSets}>{ex.sets} sets</Text>
                                            </View>
                                            <Pressable onPress={() => removeExercise(day.dayIndex, idx)}>
                                                <MaterialCommunityIcons name="close-circle" size={18} color={colors.textMuted} />
                                            </Pressable>
                                        </View>
                                    ))}
                                    <Pressable style={styles.addExerciseCardBtn} onPress={() => openAddExercise(day.dayIndex)}>
                                        <MaterialCommunityIcons name="plus" size={18} color={colors.primary} />
                                        <Text style={styles.addExerciseCardTxt}>ADD EXERCISE</Text>
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

            <Modal visible={showExerciseModal} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Add Exercise</Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Exercise name"
                            placeholderTextColor="#666"
                            autoFocus
                            value={tempExerciseName}
                            onChangeText={setTempExerciseName}
                        />
                        <View style={styles.setsInputContainer}>
                            <Text style={styles.modalLabel}>DEFAULT SETS:</Text>
                            <TextInput
                                style={styles.setsInput}
                                keyboardType="number-pad"
                                value={tempSets}
                                onChangeText={setTempSets}
                            />
                        </View>
                        <View style={styles.modalActions}>
                            <Pressable style={styles.modalCancel} onPress={() => setShowExerciseModal(false)}>
                                <Text style={styles.modalCancelTxt}>CANCEL</Text>
                            </Pressable>
                            <Pressable style={styles.modalConfirm} onPress={handleAddExercise}>
                                <Text style={styles.modalConfirmTxt}>ADD</Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <ConfirmationModal
                visible={showErrorModal}
                title="Whoops"
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
        fontWeight: '900',
    },
    backButton: {
        padding: 8,
    },
    saveButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 12,
    },
    saveText: {
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
    inputGroup: {
        marginBottom: 32,
    },
    nameInput: {
        fontSize: 24,
        fontWeight: '900',
        color: 'white',
        marginBottom: 8,
    },
    descInput: {
        fontSize: 14,
        color: colors.textMuted,
        fontWeight: '500',
    },
    imageScroll: {
        marginBottom: 24,
        marginHorizontal: -16,
    },
    imageScrollContent: {
        paddingHorizontal: 16,
        gap: 12,
    },
    imageOption: {
        width: 100,
        height: 60,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    imageOptionSelected: {
        borderColor: colors.primary,
    },
    imageOptionImg: {
        width: '100%',
        height: '100%',
    },
    noImageOption: {
        backgroundColor: colors.card,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: colors.border,
    },
    noImageText: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '700',
        marginTop: 4,
    },
    noImageTextSelected: {
        color: 'white',
    },
    checkIcon: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: colors.primary,
        width: 20,
        height: 20,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionDivider: {
        height: 1,
        backgroundColor: colors.border,
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
    },
    addDayBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    addDayTxt: {
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
    dayCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    dayLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    reorderBtns: {
        gap: 4,
    },
    dayNameInput: {
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
    dayName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 4,
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
    deleteBtn: {
        padding: 4,
    },
    exercisesContainer: {
        gap: 10,
    },
    exerciseRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.03)',
        padding: 12,
        borderRadius: 12,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        color: 'white',
        fontSize: 14,
        fontWeight: '700',
    },
    exerciseSets: {
        color: colors.textMuted,
        fontSize: 11,
        marginTop: 2,
    },
    addExerciseCardBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderStyle: 'dashed',
        borderColor: 'rgba(34, 197, 94, 0.3)',
        marginTop: 4,
    },
    addExerciseCardTxt: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '800',
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
        backgroundColor: '#1E1E1E',
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
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '800',
    },
    modalInput: {
        backgroundColor: colors.background,
        borderRadius: 16,
        padding: 16,
        color: 'white',
        fontSize: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: colors.border,
    },
    setsInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 24,
    },
    setsInput: {
        backgroundColor: colors.background,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        width: 60,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    modalActions: {
        flexDirection: 'row',
        gap: 12,
    },
    modalCancel: {
        flex: 1,
        paddingVertical: 14,
        alignItems: 'center',
    },
    modalCancelTxt: {
        color: colors.textMuted,
        fontWeight: '800',
        fontSize: 12,
    },
    modalConfirm: {
        flex: 2,
        backgroundColor: colors.primary,
        paddingVertical: 14,
        borderRadius: 14,
        alignItems: 'center',
    },
    modalConfirmTxt: {
        color: 'black',
        fontWeight: '900',
        fontSize: 14,
    },
});
