import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../../db/DatabaseContext';
import { getAllPrograms, setActiveProgram, deleteProgram } from '../../db/queries';
import { Program } from '../../db/schema';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ConfirmationModal from '../../components/ConfirmationModal';

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

export default function ProgramsScreen() {
    const router = useRouter();
    const db = useDatabase();
    const [programs, setPrograms] = useState<Program[]>([]);
    const [programToDelete, setProgramToDelete] = useState<Program | null>(null);

    const loadPrograms = useCallback(async () => {
        const all = await getAllPrograms(db);
        setPrograms(all);
    }, [db]);

    useFocusEffect(
        useCallback(() => {
            loadPrograms();
        }, [loadPrograms])
    );

    const handleActivate = async (id: number) => {
        await setActiveProgram(db, id);
        loadPrograms();
    };

    const handleDelete = async () => {
        if (programToDelete) {
            await deleteProgram(db, programToDelete.id);
            setProgramToDelete(null);
            loadPrograms();
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Pressable onPress={() => router.back()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="white" />
                </Pressable>
                <Text style={styles.headerTitle}>Programs</Text>
                <Pressable onPress={() => router.push('/programs/new')} style={styles.addButton}>
                    <MaterialCommunityIcons name="plus" size={24} color={colors.primary} />
                </Pressable>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
                {programs.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <MaterialCommunityIcons name="format-list-bulleted-type" size={64} color={colors.border} />
                        <Text style={styles.emptyTitle}>No Programs Yet</Text>
                        <Text style={styles.emptySubtitle}>Create a custom program cycle to track your long-term progression.</Text>
                        <Pressable style={styles.emptyAddButton} onPress={() => router.push('/programs/new')}>
                            <Text style={styles.emptyAddText}>Create Program</Text>
                        </Pressable>
                    </View>
                ) : (
                    programs.map((program) => (
                        <View key={program.id} style={[styles.programCard, program.is_active && styles.activeCard]}>
                            <View style={styles.programHeader}>
                                <View>
                                    <Text style={styles.programName}>{program.name}</Text>
                                    <Text style={styles.programDesc}>{program.description || 'Custom cycle'}</Text>
                                </View>
                                {program.is_active && (
                                    <View style={styles.activeLabel}>
                                        <Text style={styles.activeText}>ACTIVE</Text>
                                    </View>
                                )}
                            </View>

                            <View style={styles.actions}>
                                {!program.is_active && (
                                    <Pressable style={styles.actionBtn} onPress={() => handleActivate(program.id)}>
                                        <MaterialCommunityIcons name="play" size={20} color={colors.primary} />
                                        <Text style={styles.actionText}>Activate</Text>
                                    </Pressable>
                                )}
                                <Pressable
                                    style={styles.actionBtn}
                                    onPress={() => router.push(`/programs/${program.id}`)}
                                >
                                    <MaterialCommunityIcons name="eye-outline" size={20} color={colors.text} />
                                    <Text style={[styles.actionText, { color: colors.text }]}>View</Text>
                                </Pressable>
                                <Pressable
                                    style={styles.actionBtn}
                                    onPress={() => router.push(`/programs/${program.id}/edit`)}
                                >
                                    <MaterialCommunityIcons name="pencil-outline" size={20} color={colors.textMuted} />
                                    <Text style={[styles.actionText, { color: colors.textMuted }]}>Edit</Text>
                                </Pressable>
                                <Pressable
                                    style={styles.actionBtn}
                                    onPress={() => setProgramToDelete(program)}
                                >
                                    <MaterialCommunityIcons name="delete-outline" size={20} color="#EF4444" />
                                    <Text style={[styles.actionText, { color: '#EF4444' }]}>Delete</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))
                )}
            </ScrollView>

            <ConfirmationModal
                visible={!!programToDelete}
                title="Delete Program"
                description={`Are you sure you want to delete "${programToDelete?.name}"?`}
                confirmLabel="Delete"
                isDanger
                onConfirm={handleDelete}
                onCancel={() => setProgramToDelete(null)}
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
        fontSize: 20,
        fontWeight: '800',
    },
    backButton: {
        padding: 8,
    },
    addButton: {
        padding: 8,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderRadius: 12,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        gap: 16,
    },
    programCard: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    activeCard: {
        borderColor: colors.primary,
        borderWidth: 2,
    },
    programHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    programName: {
        color: 'white',
        fontSize: 18,
        fontWeight: '700',
    },
    programDesc: {
        color: colors.textMuted,
        fontSize: 12,
        marginTop: 4,
    },
    activeLabel: {
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    activeText: {
        color: 'black',
        fontSize: 10,
        fontWeight: '900',
    },
    actions: {
        flexDirection: 'row',
        gap: 16,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        paddingTop: 16,
    },
    actionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        color: colors.primary,
        fontSize: 14,
        fontWeight: '700',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 100,
        gap: 16,
        paddingHorizontal: 40,
    },
    emptyTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '800',
    },
    emptySubtitle: {
        color: colors.textMuted,
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyAddButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 16,
        marginTop: 8,
    },
    emptyAddText: {
        color: 'black',
        fontSize: 16,
        fontWeight: '800',
    },
});
