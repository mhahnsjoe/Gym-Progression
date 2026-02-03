import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../../db/DatabaseContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    getTotalStrengthVolume,
    getStrengthWorkoutCount,
    getWeeklyStrengthWorkouts,
    getMuscleVolumeDistribution,
    getRecentPRs,
    getTotalCardioDuration,
    getCardioWorkoutCount,
    getWeeklyCardioMinutes,
    getCardioDistribution,
    getTotalCardioCalories
} from '../../db/statsQueries';
import { formatDuration } from '../../utils/calculations';
import { getActivityLabel } from '../../db/cardioQueries';

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

type StatPeriod = 7 | 30 | 90 | 365;

interface StatsData {
    strengthVolume: number;
    strengthCount: number;
    cardioDuration: number;
    cardioCount: number;
    cardioCalories: number;
    muscleDistribution: { muscle: string; volume: number; percentage: number }[];
    recentPRs: any[];
    cardioMix: { type: string; duration: number; percentage: number }[];
    strengthChart: { week: string; count: number }[];
    cardioChart: { week: string; minutes: number }[];
}

export default function StatsScreen() {
    const router = useRouter();
    const db = useDatabase();

    const [period, setPeriod] = useState<StatPeriod>(30);
    const [stats, setStats] = useState<StatsData>({
        strengthVolume: 0,
        strengthCount: 0,
        cardioDuration: 0,
        cardioCount: 0,
        cardioCalories: 0,
        muscleDistribution: [],
        recentPRs: [],
        cardioMix: [],
        strengthChart: [],
        cardioChart: []
    });

    const loadData = useCallback(async () => {
        try {
            const [
                vol,
                sCount,
                cDur,
                cCount,
                cCal,
                mDist,
                prs,
                cDist,
                sChart,
                cChart
            ] = await Promise.all([
                getTotalStrengthVolume(db, period),
                getStrengthWorkoutCount(db, period),
                getTotalCardioDuration(db, period),
                getCardioWorkoutCount(db, period),
                getTotalCardioCalories(db, period),
                getMuscleVolumeDistribution(db, period),
                getRecentPRs(db, period),
                getCardioDistribution(db, period),
                getWeeklyStrengthWorkouts(db, 8),
                getWeeklyCardioMinutes(db, 8)
            ]);

            setStats({
                strengthVolume: vol,
                strengthCount: sCount,
                cardioDuration: cDur,
                cardioCount: cCount,
                cardioCalories: cCal,
                muscleDistribution: mDist,
                recentPRs: prs,
                cardioMix: cDist,
                strengthChart: sChart,
                cardioChart: cChart
            });
        } catch (e) {
            console.error('Failed to load stats:', e);
        }
    }, [db, period]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const formatWeight = (vol: number) => {
        if (vol >= 1000) return (vol / 1000).toFixed(1) + 'k';
        return Math.round(vol).toString();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Insights</Text>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>

                {/* Period Selector */}
                <View style={styles.selectorContainer}>
                    {[7, 30, 90, 365].map((p) => (
                        <Pressable
                            key={p}
                            onPress={() => setPeriod(p as StatPeriod)}
                            style={[
                                styles.selectorItem,
                                period === p && styles.selectorItemActive
                            ]}
                        >
                            <Text style={[
                                styles.selectorText,
                                period === p && styles.selectorTextActive
                            ]}>
                                {p === 365 ? '1Y' : `${p}D`}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                {/* Top Level Summary Cards */}
                <View style={styles.summaryRow}>
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryHeader}>
                            <MaterialCommunityIcons name="weight-lifter" size={20} color={colors.primary} />
                            <Text style={styles.summaryTitle}>STRENGTH</Text>
                        </View>
                        <Text style={styles.summaryValue}>{formatWeight(stats.strengthVolume)}<Text style={styles.unit}>kg</Text></Text>
                        <Text style={styles.summarySub}>{stats.strengthCount} Workouts</Text>
                    </View>

                    <View style={styles.summaryCard}>
                        <View style={styles.summaryHeader}>
                            <MaterialCommunityIcons name="heart-pulse" size={20} color="#EF4444" />
                            <Text style={[styles.summaryTitle, { color: '#EF4444' }]}>CARDIO</Text>
                        </View>
                        <View style={styles.cardioSummaryGrid}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{formatDuration(stats.cardioDuration)}</Text>
                                <Text style={styles.statLabel}>DURATION</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.cardioCalories.toLocaleString()}</Text>
                                <Text style={styles.statLabel}>CALORIES</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{stats.cardioCount}</Text>
                                <Text style={styles.statLabel}>SESSIONS</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Muscle Distribution */}
                <View style={styles.card}>
                    <Text style={styles.cardTitle}>Muscle Focus</Text>
                    {stats.muscleDistribution.length > 0 ? (
                        stats.muscleDistribution.slice(0, 5).map((item, idx) => (
                            <View key={item.muscle} style={styles.distRow}>
                                <View style={styles.distLabelContainer}>
                                    <Text style={styles.distLabel}>{item.muscle.toUpperCase()}</Text>
                                    <Text style={styles.distPercent}>{item.percentage}%</Text>
                                </View>
                                <View style={styles.barBg}>
                                    <View style={[styles.barFill, { width: `${item.percentage}%` }]} />
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noDataText}>No strength data for this period</Text>
                    )}
                </View>

                {/* Recent PRs */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>Recent PRs</Text>
                        <MaterialCommunityIcons name="trophy" size={20} color="#FBBF24" />
                    </View>
                    {stats.recentPRs.length > 0 ? (
                        stats.recentPRs.slice(0, 3).map((pr, idx) => (
                            <View key={pr.id} style={styles.prRow}>
                                <Text style={styles.prName}>{pr.exercise_name}</Text>
                                <View style={styles.prValues}>
                                    <Text style={styles.prValueMain}>{pr.weight}kg</Text>
                                    <Text style={styles.prValueSub}>× {pr.reps}</Text>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noDataText}>No records in this period</Text>
                    )}
                    <Pressable
                        style={styles.viewMoreButton}
                        onPress={() => {/* TODO: Show all PRs screen */ }}
                    >
                        <Text style={styles.viewMoreText}>VIEW ALL RECORDS</Text>
                    </Pressable>
                </View>

                {/* Cardio Distribution */}
                {stats.cardioMix.length > 0 && (
                    <View style={[styles.card, { marginBottom: 32 }]}>
                        <Text style={styles.cardTitle}>Cardio Mix</Text>
                        <View style={styles.distTable}>
                            {stats.cardioMix.map((item) => (
                                <View key={item.type} style={styles.distRow}>
                                    <View style={styles.distLabelContainer}>
                                        <Text style={styles.distLabel}>{getActivityLabel(item.type as any).toUpperCase()}</Text>
                                        <Text style={styles.distPercent}>{Math.round(item.duration / 60)} min</Text>
                                    </View>
                                    <View style={styles.barBg}>
                                        <View style={[styles.barFill, { width: `${item.percentage}%`, backgroundColor: '#EF4444' }]} />
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

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
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        alignItems: 'center',
    },
    headerTitle: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
        letterSpacing: 1,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    selectorContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 12,
        padding: 4,
        marginBottom: 24,
    },
    selectorItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },
    selectorItemActive: {
        backgroundColor: colors.surface,
    },
    selectorText: {
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '800',
    },
    selectorTextActive: {
        color: colors.primary,
    },
    summaryRow: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    summaryTitle: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    summaryValue: {
        color: 'white',
        fontSize: 24,
        fontWeight: '900',
    },
    unit: {
        fontSize: 12,
        color: colors.textMuted,
        marginLeft: 2,
    },
    summarySub: {
        color: colors.textMuted,
        fontSize: 12,
        marginTop: 4,
    },
    cardioSummaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 8,
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
    },
    statLabel: {
        color: colors.textMuted,
        fontSize: 8,
        fontWeight: '800',
        marginTop: 4,
    },
    card: {
        backgroundColor: colors.card,
        borderRadius: 20,
        padding: 20,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    cardTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 20,
    },
    distRow: {
        marginBottom: 16,
    },
    distLabelContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    distLabel: {
        color: 'white',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    distPercent: {
        color: colors.textMuted,
        fontSize: 11,
        fontWeight: '700',
    },
    distTable: {
        gap: 4,
    },
    barBg: {
        height: 6,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: 3,
    },
    prRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.05)',
    },
    prName: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    prValues: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 4,
    },
    prValueMain: {
        color: 'white',
        fontSize: 16,
        fontWeight: '900',
    },
    prValueSub: {
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
    },
    viewMoreButton: {
        alignItems: 'center',
        marginTop: 20,
        paddingVertical: 10,
    },
    viewMoreText: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 1,
    },
    noDataText: {
        color: colors.textMuted,
        fontSize: 12,
        textAlign: 'center',
        marginVertical: 20,
    }
});
