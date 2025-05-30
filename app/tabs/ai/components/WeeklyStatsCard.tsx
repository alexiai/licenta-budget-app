
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis } from './SmartAdviceSection';

interface WeeklyStatsCardProps {
    analysis?: SpendingAnalysis;
}

interface WeeklyData {
    week: string;
    amount: number;
    trend: 'up' | 'down' | 'stable';
    startDate: string;
    endDate: string;
}

export default function WeeklyStatsCard({ analysis }: WeeklyStatsCardProps): JSX.Element {
    const [loading, setLoading] = useState(false);

    if (!analysis) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>No data available</Text>
            </View>
        );
    }

    const { weeklyStats, totalThisMonth, averageDailySpending } = analysis;

    const getWeeklyData = (): WeeklyData[] => {
        // Mock weekly data based on current stats
        const currentWeek = weeklyStats.currentWeek;
        const lastWeek = weeklyStats.lastWeek;

        return [
            {
                week: 'This Week',
                amount: currentWeek,
                trend: currentWeek > lastWeek ? 'up' : currentWeek < lastWeek ? 'down' : 'stable',
                startDate: 'Jan 15',
                endDate: 'Jan 21'
            },
            {
                week: 'Last Week',
                amount: lastWeek,
                trend: 'stable',
                startDate: 'Jan 8',
                endDate: 'Jan 14'
            },
            {
                week: '2 Weeks Ago',
                amount: 280,
                trend: 'up',
                startDate: 'Jan 1',
                endDate: 'Jan 7'
            }
        ];
    };

    const weeklyData = getWeeklyData();
    const trendColor = weeklyStats.trend === 'decreasing' ? '#4CAF50' : '#FF9800';
    const trendIcon = weeklyStats.trend === 'decreasing' ? 'trending-down' : 'trending-up';

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerEmoji}>🐰📈</Text>
                <Text style={styles.headerTitle}>Weekly Stats</Text>
                <Text style={styles.headerSubtitle}>
                    Your spending trends with bunny insights
                </Text>
            </View>

            {/* Current Week Summary */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryHeader}>
                    <Text style={styles.summaryTitle}>This Week's Performance</Text>
                    <View style={[styles.trendBadge, { backgroundColor: trendColor + '20' }]}>
                        <Ionicons name={trendIcon as any} size={16} color={trendColor} />
                        <Text style={[styles.trendText, { color: trendColor }]}>
                            {weeklyStats.trend}
                        </Text>
                    </View>
                </View>
                <Text style={styles.summaryAmount}>{weeklyStats.currentWeek} RON</Text>
                <Text style={styles.summaryNote}>
                    {weeklyStats.trend === 'decreasing'
                        ? '🐰 Great job! Your bunny is proud of your spending control!'
                        : '🐰 Your bunny suggests being more mindful of expenses!'}
                </Text>
            </View>

            {/* Weekly Breakdown */}
            <View style={styles.weeklyContainer}>
                <Text style={styles.sectionTitle}>Weekly Breakdown</Text>
                {weeklyData.map((week, index) => (
                    <View key={index} style={styles.weekCard}>
                        <View style={styles.weekHeader}>
                            <View>
                                <Text style={styles.weekTitle}>{week.week}</Text>
                                <Text style={styles.weekDates}>{week.startDate} - {week.endDate}</Text>
                            </View>
                            <View style={styles.weekAmount}>
                                <Text style={styles.amountText}>{week.amount} RON</Text>
                                <View style={[
                                    styles.trendIndicator,
                                    { backgroundColor: week.trend === 'up' ? '#FF9800' : week.trend === 'down' ? '#4CAF50' : '#9E9E9E' }
                                ]}>
                                    <Ionicons
                                        name={week.trend === 'up' ? 'arrow-up' : week.trend === 'down' ? 'arrow-down' : 'remove'}
                                        size={12}
                                        color="white"
                                    />
                                </View>
                            </View>
                        </View>
                    </View>
                ))}
            </View>

            {/* Daily Average */}
            <View style={styles.averageCard}>
                <Text style={styles.averageTitle}>🥕 Daily Average</Text>
                <Text style={styles.averageAmount}>{averageDailySpending} RON/day</Text>
                <Text style={styles.averageNote}>
                    {averageDailySpending > 80
                        ? 'Your bunny thinks you could save more carrots daily!'
                        : 'Perfect! Your bunny loves your daily spending discipline!'}
                </Text>
            </View>

            {/* Monthly Projection */}
            <View style={styles.projectionCard}>
                <Text style={styles.projectionTitle}>🔮 Monthly Projection</Text>
                <Text style={styles.projectionAmount}>
                    {Math.round(averageDailySpending * 30)} RON
                </Text>
                <Text style={styles.projectionNote}>
                    Based on your current daily average, this is your projected monthly spending.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        alignItems: 'center',
        marginBottom: 24,
    },
    headerEmoji: {
        fontSize: 48,
        marginBottom: 8,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 50,
    },
    summaryCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    summaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'capitalize',
    },
    summaryAmount: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
    },
    summaryNote: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    weeklyContainer: {
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 16,
    },
    weekCard: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 2,
    },
    weekHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    weekTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    weekDates: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    weekAmount: {
        alignItems: 'flex-end',
    },
    amountText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
    },
    trendIndicator: {
        width: 24,
        height: 24,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    averageCard: {
        backgroundColor: '#fff0e8',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#91483C',
    },
    averageTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
    },
    averageAmount: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
    },
    averageNote: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    projectionCard: {
        backgroundColor: '#f8f9fa',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    projectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
    },
    projectionAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
    },
    projectionNote: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
});
