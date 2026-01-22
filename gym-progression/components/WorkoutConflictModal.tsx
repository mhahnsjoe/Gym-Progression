import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable } from 'react-native';

const colors = {
    primary: '#00c795',
    background: '#1a1a1a',
    card: '#2C2C2C',
    text: '#ffffff',
    textMuted: '#888888',
    border: 'rgba(255,255,255,0.05)',
};

interface WorkoutConflictModalProps {
    visible: boolean;
    onCancel: () => void;
    onContinue: () => void;
    onFinishAndStartNew: () => void;
    onDeleteAndStartNew: () => void;
}

export default function WorkoutConflictModal({
    visible,
    onCancel,
    onContinue,
    onFinishAndStartNew,
    onDeleteAndStartNew,
}: WorkoutConflictModalProps) {
    return (
        <Modal visible={visible} animationType="slide" transparent>
            <View style={styles.modalOverlay}>
                <View style={styles.modalContent}>
                    <Text style={styles.modalTitle}>Workout in Progress</Text>
                    <Text style={styles.modalDescription}>
                        You already have an active workout session. What would you like to do?
                    </Text>

                    <View style={styles.buttonContainer}>
                        <Pressable style={styles.primaryButton} onPress={onContinue}>
                            <Text style={styles.primaryButtonText}>CONTINUE CURRENT</Text>
                        </Pressable>

                        <Pressable style={styles.secondaryButton} onPress={onFinishAndStartNew}>
                            <Text style={styles.secondaryButtonText}>Finish & Start New</Text>
                        </Pressable>

                        <Pressable style={styles.dangerButton} onPress={onDeleteAndStartNew}>
                            <Text style={styles.dangerButtonText}>Delete & Start New</Text>
                        </Pressable>

                        <Pressable style={styles.cancelButton} onPress={onCancel}>
                            <Text style={styles.cancelButtonText}>Cancel</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
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
        paddingBottom: 40,
    },
    modalTitle: {
        color: colors.text,
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },
    modalDescription: {
        color: colors.textMuted,
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
    },
    buttonContainer: {
        gap: 12,
    },
    primaryButton: {
        backgroundColor: colors.primary,
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        letterSpacing: 1,
    },
    secondaryButton: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    secondaryButtonText: {
        color: colors.text,
        fontSize: 14,
        fontWeight: '600',
    },
    dangerButton: {
        backgroundColor: 'rgba(255,0,0,0.1)',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,0,0,0.2)',
    },
    dangerButtonText: {
        color: '#ff4444',
        fontSize: 14,
        fontWeight: '600',
    },
    cancelButton: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: colors.textMuted,
        fontSize: 14,
        fontWeight: '600',
    },
});
