import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

interface PRCelebrationProps {
    exerciseName: string;
    weight: number;
    reps: number;
    onComplete: () => void;
}

export default function PRCelebration({ exerciseName, weight, reps, onComplete }: PRCelebrationProps) {
    const translateY = new Animated.Value(50);
    const opacity = new Animated.Value(0);
    const scale = new Animated.Value(0.8);

    useEffect(() => {
        Animated.sequence([
            Animated.parallel([
                Animated.timing(translateY, { toValue: 0, duration: 400, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
                Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }),
            ]),
            Animated.delay(2500),
            Animated.parallel([
                Animated.timing(translateY, { toValue: -50, duration: 400, useNativeDriver: true }),
                Animated.timing(opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
            ]),
        ]).start(() => onComplete());
    }, []);

    return (
        <View style={styles.container} pointerEvents="none">
            <Animated.View style={[
                styles.card,
                {
                    transform: [{ translateY }, { scale }],
                    opacity,
                }
            ]}>
                <View style={styles.iconContainer}>
                    <MaterialCommunityIcons name="trophy" size={32} color="#FBBF24" />
                </View>
                <View style={styles.textContainer}>
                    <Text style={styles.title}>NEW PERSONAL RECORD!</Text>
                    <Text style={styles.exercise}>{exerciseName.toUpperCase()}</Text>
                    <Text style={styles.stats}>{weight}kg × {reps} reps</Text>
                </View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 100,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 1000,
    },
    card: {
        backgroundColor: '#1E1B4B', // Deep indigo
        padding: 20,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        width: width * 0.85,
        borderWidth: 2,
        borderColor: '#4F46E5', // Indigo-600
        shadowColor: '#4F46E5',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    textContainer: {
        flex: 1,
    },
    title: {
        color: '#FBBF24',
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 4,
    },
    exercise: {
        color: 'white',
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 2,
    },
    stats: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '600',
    }
});
