import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis } from './SmartAdviceSection';
import statsImg from '@assets/decor/aiStats.png';

interface WeeklyStatsCardProps {
    analysis?: SpendingAnalysis | null;
}

export default function WeeklyStatsCard({ analysis }: WeeklyStatsCardProps): JSX.Element {
    if (!analysis) {
        return (
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <Image source={statsImg} style={styles.image} resizeMode="contain" />
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Weekly Insights</Text>
                        <Text style={styles.headerSubtitle}>
                            Loading your bunny analytics...
                        </Text>
                    </View>
                </View>

                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingEmoji}>🐰📊</Text>
                    <Text style={styles.loadingText}>
                        Your bunny is crunching the numbers!
                    </Text>
                </View>
            </ScrollView>
        );
    }

    const { weeklyStats, totalThisMonth, averageDailySpending, spendingPatterns } = analysis;

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'increasing': return 'trending-up';
            case 'decreasing': return 'trending-down';
            default: return 'remove';
        }
    };

    const getTrendColor = (trend: string) => {
        switch (trend) {
            case 'increasing': return '#FF6B6B';
            case 'decreasing': return '#4ECDC4';
            default: return '#95A5A6';
        }
    };

    const getTrendMessage = (trend: string) => {
        switch (trend) {
            case 'increasing': return 'Spending is up - time to hop back to budget! 🐰⬆️';
            case 'decreasing': return 'Great job! Your spending is down! 🐰📉';
            default: return 'Steady as she goes, bunny! 🐰➡️';
        }
    };

    const dailyData = Object.entries(weeklyStats.dailyBreakdown).map(([day, amount]) => ({
        day: day.substring(0, 3), // Mon, Tue, etc.
        amount,
        percentage: weeklyStats.currentWeek > 0 ? (amount / weeklyStats.currentWeek) * 100 : 0
    }));

    const getBarHeight = (percentage: number) => {
        return Math.max(percentage * 1.5, 5); // Minimum height of 5
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={statsImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Weekly Insights</Text>
                    <Text style={styles.headerSubtitle}>
                        Your bunny's weekly spending analysis
                    </Text>
                </View>
            </View>

            {/* Weekly Comparison */}
            <View style={styles.statsCard}>
                <View style={styles.statsHeader}>
                    <Text style={styles.cardTitle}>📊 Week Comparison</Text>
                    <Ionicons
                        name={getTrendIcon(weeklyStats.trend)}
                        size={24}
                        color={getTrendColor(weeklyStats.trend)}
                    />
                </View>

                <View style={styles.weeklyComparison}>
                    <View style={styles.weeklyItem}>
                        <Text style={styles.weeklyLabel}>This Week</Text>
                        <Text style={styles.weeklyAmount}>{weeklyStats.currentWeek.toFixed(0)} RON</Text>
                    </View>
                    <View style={styles.weeklyItem}>
                        <Text style={styles.weeklyLabel}>Last Week</Text>
                        <Text style={[styles.weeklyAmount, { color: '#666' }]}>
                            {weeklyStats.lastWeek.toFixed(0)} RON
                        </Text>
                    </View>
                </View>

                <Text style={styles.trendMessage}>
                    {getTrendMessage(weeklyStats.trend)}
                </Text>
            </View>

            {/* Daily Breakdown Chart */}
            <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>📅 Daily Breakdown</Text>
                <View style={styles.chartContainer}>
                    {dailyData.map((item, index) => (
                        <View key={index} style={styles.barContainer}>
                            <Text style={styles.barAmount}>{item.amount.toFixed(0)}</Text>
                            <View style={styles.barWrapper}>
                                <View
                                    style={[
                                        styles.bar,
                                        {
                                            height: getBarHeight(item.percentage),
                                            backgroundColor: item.day === weeklyStats.topSpendingDay.day.substring(0, 3)
                                                ? '#FF6B6B' : '#4ECDC4'
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.barLabel}>{item.day}</Text>
                        </View>
                    ))}
                </View>

                {weeklyStats.topSpendingDay.amount > 0 && (
                    <View style={styles.insightContainer}>
                        <Text style={styles.insightText}>
                            🚨 Highest spending: {weeklyStats.topSpendingDay.day} ({weeklyStats.topSpendingDay.amount.toFixed(0)} RON)
                        </Text>
                    </View>
                )}
            </View>

            {/* Top Spending Category */}
            <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>🎯 Monthly Highlights</Text>

                <View style={styles.highlightRow}>
                    <View style={styles.highlightItem}>
                        <Text style={styles.highlightLabel}>Total This Month</Text>
                        <Text style={styles.highlightValue}>{totalThisMonth.toFixed(0)} RON</Text>
                    </View>
                    <View style={styles.highlightItem}>
                        <Text style={styles.highlightLabel}>Daily Average</Text>
                        <Text style={styles.highlightValue}>{averageDailySpending.toFixed(0)} RON</Text>
                    </View>
                </View>

                <View style={styles.spendingTypeContainer}>
                    <Text style={styles.spendingTypeTitle}>💰 Spending Breakdown</Text>
                    <View style={styles.spendingTypeRow}>
                        <View style={styles.spendingTypeItem}>
                            <View style={[styles.spendingTypeDot, { backgroundColor: '#4ECDC4' }]} />
                            <Text style={styles.spendingTypeLabel}>Essential</Text>
                            <Text style={styles.spendingTypeAmount}>
                                {spendingPatterns.essentialVsFlexible.essential.toFixed(0)} RON
                            </Text>
                        </View>
                        <View style={styles.spendingTypeItem}>
                            <View style={[styles.spendingTypeDot, { backgroundColor: '#FF6B6B' }]} />
                            <Text style={styles.spendingTypeLabel}>Flexible</Text>
                            <Text style={styles.spendingTypeAmount}>
                                {spendingPatterns.essentialVsFlexible.flexible.toFixed(0)} RON
                            </Text>
                        </View>
                    </View>
                </View>
            </View>
            {/* Weekend vs Weekday */}
            <View style={styles.statsCard}>
                <Text style={styles.cardTitle}>🗓️ Weekend vs Weekday</Text>

                <View style={styles.weekendWeekdayContainer}>
                    <View style={styles.weekendWeekdayItem}>
                        <Text style={styles.weekendWeekdayEmoji}>💼</Text>
                        <Text style={styles.weekendWeekdayLabel}>Weekdays</Text>
                        <Text style={styles.weekendWeekdayAmount}>
                            {spendingPatterns.weekdayVsWeekend.weekday.toFixed(0)} RON
                        </Text>
                    </View>
                    <View style={styles.weekendWeekdayItem}>
                        <Text style={styles.weekendWeekdayEmoji}>🎉</Text>
                        <Text style={styles.weekendWeekdayLabel}>Weekends</Text>
                        <Text style={styles.weekendWeekdayAmount}>
                            {spendingPatterns.weekdayVsWeekend.weekend.toFixed(0)} RON
                        </Text>
                    </View>
                </View>

                {spendingPatterns.weekdayVsWeekend.weekend > spendingPatterns.weekdayVsWeekend.weekday * 0.3 && (
                    <Text style={styles.weekendInsight}>
                        🐰 Weekend warrior detected! Your weekend spending is quite active!
                    </Text>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 20,
        paddingBottom: 16,
        paddingRight: 20,
    },
    image: {
        width: 200,
        height: 200,
        marginRight: 0,
    },
    headerText: { flex: 1 },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#90483c',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 40,
    },
    loadingEmoji: { fontSize: 48, marginBottom: 16 },
    loadingText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
    statsCard: {
        backgroundColor: '#FFF0E0',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#FFD4A8',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    weeklyComparison: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    weeklyItem: {
        alignItems: 'center',
    },
    weeklyLabel: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    weeklyAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    trendMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
        fontFamily: 'Fredoka',
    },
    chartContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-end',
        height: 120,
        marginVertical: 16,
    },
    barContainer: {
        alignItems: 'center',
        flex: 1,
    },
    barAmount: {
        fontSize: 10,
        color: '#666',
        marginBottom: 4,
        fontFamily: 'Fredoka',
    },
    barWrapper: {
        height: 80,
        justifyContent: 'flex-end',
        width: 20,
    },
    bar: {
        width: 20,
        borderRadius: 10,
        minHeight: 5,
    },
    barLabel: {
        fontSize: 12,
        color: '#91483C',
        marginTop: 4,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
    insightContainer: {
        backgroundColor: '#FFE6E6',
        padding: 12,
        borderRadius: 12,
        marginTop: 16,
    },
    insightText: {
        fontSize: 12,
        color: '#D32F2F',
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
    highlightRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    highlightItem: {
        alignItems: 'center',
    },
    highlightLabel: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    highlightValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    spendingTypeContainer: {
        marginTop: 16,
    },
    spendingTypeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 12,
        fontFamily: 'Fredoka',
    },
    spendingTypeRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    spendingTypeItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    spendingTypeDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    spendingTypeLabel: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
        fontFamily: 'Fredoka',
    },
    spendingTypeAmount: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    weekendWeekdayContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 16,
    },
    weekendWeekdayItem: {
        alignItems: 'center',
        flex: 1,
    },
    weekendWeekdayEmoji: {
        fontSize: 32,
        marginBottom: 8,
    },
    weekendWeekdayLabel: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    weekendWeekdayAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    weekendInsight: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
        fontStyle: 'italic',
        fontFamily: 'Fredoka',
    },
});
