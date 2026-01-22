import { View, Text, StyleSheet, ScrollView, Pressable, Dimensions, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useDatabase } from '../../db/DatabaseContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import {
    getWorkoutVolumeHistory,
    getActiveProgram,
    VolumeStat,
    Timeframe,
    getTimeframeVolumeStats,
    TimeframeStats
} from '../../db/queries';

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

export default function StatsScreen() {
    const router = useRouter();
    const db = useDatabase();

    const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('month');
    const [stats, setStats] = useState<TimeframeStats>({ totalVolume: 0, averageVolume: 0, workoutCount: 0 });
    const [activeProgramName, setActiveProgramName] = useState<string | null>(null);
    const [history, setHistory] = useState<VolumeStat[]>([]);
    const [maxVolume, setMaxVolume] = useState(1);

    const loadData = useCallback(async () => {
        try {
            const timeframeStats = await getTimeframeVolumeStats(db, selectedTimeframe);
            setStats(timeframeStats);

            const activeProg = await getActiveProgram(db);
            setActiveProgramName(activeProg?.name || null);

            const hist = await getWorkoutVolumeHistory(db, 7);
            setHistory(hist);

            if (hist.length > 0) {
                const max = Math.max(...hist.map(h => h.volume));
                setMaxVolume(max > 0 ? max : 1);
            }
        } catch (e) {
            console.error(e);
        }
    }, [db, selectedTimeframe]);

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [loadData])
    );

    const formatVolume = (vol: number) => {
        if (vol >= 1000000) return (vol / 1000000).toFixed(2) + 'M kg';
        if (vol >= 1000) return (vol / 1000).toFixed(1) + 'k kg';
        return Math.round(vol).toString() + ' kg';
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
    };

    const timeframeLabel = {
        week: 'This Week',
        month: 'This Month',
        year: 'This Year',
        all: 'All Time'
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Statistics</Text>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>

                {/* Timeframe Selector */}
                <View style={styles.selectorContainer}>
                    {(['week', 'month', 'year', 'all'] as Timeframe[]).map((tf) => (
                        <Pressable
                            key={tf}
                            onPress={() => setSelectedTimeframe(tf)}
                            style={[
                                styles.selectorItem,
                                selectedTimeframe === tf && styles.selectorItemActive
                            ]}
                        >
                            <Text style={[
                                styles.selectorText,
                                selectedTimeframe === tf && styles.selectorTextActive
                            ]}>
                                {tf.toUpperCase()}
                            </Text>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.sectionTitle}>VOLUME OVERVIEW - {timeframeLabel[selectedTimeframe].toUpperCase()}</Text>

                {/* Stats Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <View style={styles.iconContainer}>
                            <MaterialCommunityIcons name="calculator" size={20} color={colors.primary} />
                        </View>
                        <Text style={styles.statValue}>{formatVolume(stats.averageVolume)}</Text>
                        <Text style={styles.statLabel}>AVG / WORKOUT</Text>
                    </View>

                    <View style={styles.statCard}>
                        <View style={[styles.iconContainer, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                            <MaterialCommunityIcons name="sigma" size={20} color="#3B82F6" />
                        </View>
                        <Text style={styles.statValue}>{formatVolume(stats.totalVolume)}</Text>
                        <Text style={[styles.statLabel, { color: '#3B82F6' }]}>TOTAL LIFTED</Text>
                    </View>
                </View>

                {/* Workout Count Info */}
                <View style={styles.infoRow}>
                    <MaterialCommunityIcons name="calendar-check" size={16} color={colors.textMuted} />
                    <Text style={styles.infoText}>
                        Based on {stats.workoutCount} finished workouts {selectedTimeframe !== 'all' ? timeframeLabel[selectedTimeframe].toLowerCase() : ''}
                    </Text>
                </View>

                {/* Chart Section */}
                <View style={styles.chartCard}>
                    <Text style={styles.chartTitle}>Recent Progress (Volume)</Text>
                    <View style={styles.chartContainer}>
                        {history.length === 0 ? (
                            <Text style={styles.noDataText}>No workout data yet</Text>
                        ) : (
                            history.map((item, index) => {
                                const heightPercentage = (item.volume / maxVolume) * 100;
                                return (
                                    <View key={index} style={styles.barContainer}>
                                        <View style={styles.barWrapper}>
                                            <View style={[styles.bar, { height: `${heightPercentage}%` }]} />
                                        </View>
                                        <Text style={styles.barDate}>{formatDate(item.date)}</Text>
                                        <Text style={styles.barValue}>{formatVolume(item.volume).replace(' kg', '')}</Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                </View>

                {activeProgramName && (
                    <View style={styles.programBanner}>
                        <MaterialCommunityIcons name="trophy-variant" size={20} color={colors.primary} />
                        <Text style={styles.programBannerText}>ACTIVE PROGRAM: {activeProgramName.toUpperCase()}</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
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
    content: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    selectorContainer: {
        flexDirection: 'row',
        backgroundColor: colors.card,
        borderRadius: 16,
        padding: 4,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: colors.border,
    },
    selectorItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 12,
    },
    selectorItemActive: {
        backgroundColor: colors.surface,
    },
    selectorText: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    selectorTextActive: {
        color: colors.primary,
    },
    sectionTitle: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '900',
        letterSpacing: 2,
        marginBottom: 16,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    statCard: {
        flex: 1,
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 14,
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    statValue: {
        color: 'white',
        fontSize: 20,
        fontWeight: '900',
        marginBottom: 4,
    },
    statLabel: {
        color: colors.primary,
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 24,
        paddingHorizontal: 4,
    },
    infoText: {
        color: colors.textMuted,
        fontSize: 12,
        fontWeight: '600',
    },
    chartCard: {
        backgroundColor: colors.card,
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: colors.border,
        height: 300,
        marginBottom: 24,
    },
    chartTitle: {
        color: 'white',
        fontSize: 16,
        fontWeight: '800',
        marginBottom: 24,
    },
    chartContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingBottom: 20,
    },
    noDataText: {
        color: colors.textMuted,
        width: '100%',
        textAlign: 'center',
        marginTop: 80,
    },
    barContainer: {
        alignItems: 'center',
        flex: 1,
        height: '100%',
        justifyContent: 'flex-end',
    },
    barWrapper: {
        flex: 1,
        width: 8,
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderRadius: 4,
        overflow: 'hidden',
        justifyContent: 'flex-end',
        marginBottom: 8,
    },
    bar: {
        width: '100%',
        backgroundColor: colors.primary,
        borderRadius: 4,
        minHeight: 4,
    },
    barDate: {
        color: colors.textMuted,
        fontSize: 10,
        marginBottom: 2,
    },
    barValue: {
        color: 'white',
        fontSize: 8,
        fontWeight: '700',
    },
    programBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(34, 197, 94, 0.05)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.1)',
    },
    programBannerText: {
        color: colors.primary,
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.5,
    }
});

