import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis, ExpenseData } from './SmartAdviceSection';

interface WeeklyStatsCardProps {
    analysis: SpendingAnalysis;
    expenses: ExpenseData[];
}

interface WeeklyData {
    week: string;
    amount: number;
    dayCount: number;
    averageDaily: number;
    trend: 'up' | 'down' | 'stable';
    emoji: string;
    message: string;
}

const { width } = Dimensions.get('window');

export default function WeeklyStatsCard({ analysis, expenses }: WeeklyStatsCardProps): JSX.Element {
    const getWeeklyStats = (): WeeklyData[] => {
        const weeks: WeeklyData[] = [];
        const now = new Date();

        // Get last 4 weeks of data
        for (let i = 0; i < 4; i++) {
            const weekStart = new Date(now);
            weekStart.setDate(now.getDate() - (i * 7) - (now.getDay()));
            weekStart.setHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            weekEnd.setHours(23, 59, 59, 999);

            const weekExpenses = expenses.filter(exp => {
                const expDate = new Date(exp.date);
                return expDate >= weekStart && expDate <= weekEnd;
            });

            const totalAmount = weekExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
            const dayCount = weekExpenses.length > 0 ?
                new Set(weekExpenses.map(exp => exp.date.split('T')[0])).size : 0;
            const averageDaily = dayCount > 0 ? totalAmount / dayCount : 0;

            // Generate week label
            const weekLabel = i === 0 ? 'This Week' :
                i === 1 ? 'Last Week' :
                    `${i + 1} weeks ago`;

            weeks.push({
                week: weekLabel,
                amount: totalAmount,
                dayCount,
                averageDaily,
                trend: 'stable', // Will be calculated below
                emoji: '🐰',
                message: ''
            });
        }

        // Calculate trends and messages
        weeks.forEach((week, index) => {
            if (index < weeks.length - 1) {
                const prevWeek = weeks[index + 1];
                const difference = week.amount - prevWeek.amount;
                const percentChange = prevWeek.amount > 0 ? (difference / prevWeek.amount) * 100 : 0;

                if (percentChange > 10) {
                    week.trend = 'up';
                    week.emoji = '🐰📈';
                    week.message = `Spending increased by ${Math.abs(percentChange).toFixed(0)}%. Bunny suggests reviewing your budget! 🥕`;
                } else if (percentChange < -10) {
                    week.trend = 'down';
                    week.emoji = '🐰📉';
                    week.message = `Great job! Spending decreased by ${Math.abs(percentChange).toFixed(0)}%. Your bunny is proud! 🎉`;
                } else {
                    week.trend = 'stable';
                    week.emoji = '🐰⚖️';
                    week.message = `Stable spending pattern. Consistency is key, just like a bunny's routine! 🥕`;
                }
            } else {
                // First week (oldest)
                week.emoji = '🐰📅';
                week.message = 'Starting point for comparison';
            }
        });

        return weeks.reverse(); // Show oldest first
    };

    const getCurrentWeekProgress = () => {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);

        const currentWeekExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= startOfWeek;
        });

        const totalThisWeek = currentWeekExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
        const daysSpent = new Set(currentWeekExpenses.map(exp => exp.date.split('T')[0])).size;
        const daysPassed = now.getDay() + 1; // 1-7
        const averageDaily = daysSpent > 0 ? totalThisWeek / daysSpent : 0;

        // Project end of week
        const projectedWeekTotal = averageDaily * 7;

        return {
            totalThisWeek,
            daysSpent,
            daysPassed,
            averageDaily,
            projectedWeekTotal,
            remainingDays: 7 - daysPassed
        };
    };

    const weeklyStats = getWeeklyStats();
    const currentProgress = getCurrentWeekProgress();

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'up': return 'trending-up';
            case 'down': return 'trending-down';
            case 'stable': return 'remove';
            default: return 'calendar';
        }
    };

    const getTrendColor = (trend: string) => {
        switch (trend) {
            case 'up': return '#FF6B6B';
            case 'down': return '#4ECDC4';
            case 'stable': return '#45B7D1';
            default: return '#91483C';
        }
    };

    const getBunnyMotivation = () => {
        const avgWeeklySpending = weeklyStats.reduce((sum, week) => sum + week.amount, 0) / weeklyStats.length;

        if (currentProgress.projectedWeekTotal < avgWeeklySpending * 0.8) {
            return {
                emoji: '🐰🏆',
                message: 'Excellent control this week! You\'re on track to spend less than average. Your bunny is doing a victory dance! 💃🐰'
            };
        } else if (currentProgress.projectedWeekTotal > avgWeeklySpending * 1.2) {
            return {
                emoji: '🐰⚠️',
                message: 'Spending is higher than usual this week. Time to hop back to your budget plan! Remember, even bunnies pace themselves. 🥕'
            };
        } else {
            return {
                emoji: '🐰✅',
                message: 'You\'re maintaining a steady spending pace! Consistency is the bunny way to financial success! 🥕💚'
            };
        }
    };

    const motivation = getBunnyMotivation();

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerEmoji}>🐰📊</Text>
                <Text style={styles.headerTitle}>Weekly Stats</Text>
                <Text style={styles.headerSubtitle}>
                    Your spending patterns with bunny insights
                </Text>
            </View>

            {/* Current Week Progress */}
            <View style={styles.progressCard}>
                <Text style={styles.progressTitle}>🗓️ This Week Progress</Text>
                <View style={styles.progressContent}>
                    <View style={styles.progressItem}>
                        <Text style={styles.progressLabel}>Spent so far</Text>
                        <Text style={styles.progressValue}>{(currentProgress.totalThisWeek || 0).toFixed(0)} RON</Text>
                    </View>
                    <View style={styles.progressItem}>
                        <Text style={styles.progressLabel}>Daily average</Text>
                        <Text style={styles.progressValue}>{(currentProgress.averageDaily || 0).toFixed(0)} RON</Text>
                    </View>
                    <View style={styles.progressItem}>
                        <Text style={styles.progressLabel}>Week projection</Text>
                        <Text style={styles.progressValue}>{(currentProgress.projectedWeekTotal || 0).toFixed(0)} RON</Text>
                    </View>
                </View>

                <View style={styles.motivationContainer}>
                    <Text style={styles.motivationEmoji}>{motivation.emoji}</Text>
                    <Text style={styles.motivationText}>{motivation.message}</Text>
                </View>
            </View>

            {/* Weekly Comparison */}
            <View style={styles.statsContainer}>
                <Text style={styles.sectionTitle}>📈 Weekly Comparison</Text>
                {weeklyStats.map((week, index) => (
                    <View key={`week-${index}`} style={styles.weekCard}>
                        <View style={styles.weekHeader}>
                            <View style={styles.weekInfo}>
                                <Text style={styles.weekLabel}>{week.week}</Text>
                                <Text style={styles.weekAmount}>{Number(week.amount || 0).toFixed(0)} RON</Text>
                            </View>
                            <View style={styles.trendContainer}>
                                <Text style={styles.weekEmoji}>{week.emoji}</Text>
                                <Ionicons
                                    name={getTrendIcon(week.trend) as any}
                                    size={20}
                                    color={getTrendColor(week.trend)}
                                />
                            </View>
                        </View>

                        <View style={styles.weekDetails}>
                            <Text style={styles.weekDetailText}>
                                {week.dayCount} spending days • {(week.averageDaily || 0).toFixed(0)} RON/day avg
                            </Text>
                        </View>

                        {week.message && (
                            <Text style={styles.weekMessage}>{week.message}</Text>
                        )}
                    </View>
                ))}
            </View>

            {/* Weekly Insights */}
            <View style={styles.insightsCard}>
                <Text style={styles.insightsTitle}>🐰💡 Bunny's Weekly Insights</Text>
                <View style={styles.insightsList}>
                    <View style={styles.insightItem}>
                        <Ionicons name="calendar" size={20} color="#91483C" />
                        <Text style={styles.insightText}>
                            Most active day: {getCurrentMostActiveDay()}
                        </Text>
                    </View>
                    <View style={styles.insightItem}>
                        <Ionicons name="trending-up" size={20} color="#91483C" />
                        <Text style={styles.insightText}>
                            Best week: {getBestWeek(weeklyStats)}
                        </Text>
                    </View>
                    <View style={styles.insightItem}>
                        <Ionicons name="star" size={20} color="#91483C" />
                        <Text style={styles.insightText}>
                            Weekly average: {(weeklyStats.reduce((sum, w) => sum + (w.amount || 0), 0) / weeklyStats.length || 0).toFixed(0)} RON
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );

    function getCurrentMostActiveDay(): string {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const daySpending: { [key: number]: number } = {};

        expenses.forEach(exp => {
            const day = new Date(exp.date).getDay();
            daySpending[day] = (daySpending[day] || 0) + exp.amount;
        });

        const mostActiveDay = Object.entries(daySpending)
            .sort(([,a], [,b]) => b - a)[0];

        return mostActiveDay ? dayNames[parseInt(mostActiveDay[0])] : 'No data';
    }

    function getBestWeek(weeks: WeeklyData[]): string {
        const bestWeek = weeks.reduce((best, current) =>
            current.amount < best.amount ? current : best
        );
        return `${bestWeek.week} (${(bestWeek.amount || 0).toFixed(0)} RON)`;
    }
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
    progressCard: {
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
    progressTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 16,
    },
    progressContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    progressItem: {
        alignItems: 'center',
        flex: 1,
    },
    progressLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    progressValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#91483C',
    },
    motivationContainer: {
        backgroundColor: '#fff0e8',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
    },
    motivationEmoji: {
        fontSize: 24,
        marginRight: 12,
    },
    motivationText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    statsContainer: {
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
        marginBottom: 8,
    },
    weekInfo: {
        flex: 1,
    },
    weekLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#91483C',
    },
    weekAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    trendContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    weekEmoji: {
        fontSize: 20,
        marginRight: 8,
    },
    weekDetails: {
        marginBottom: 8,
    },
    weekDetailText: {
        fontSize: 14,
        color: '#666',
    },
    weekMessage: {
        fontSize: 14,
        color: '#333',
        fontStyle: 'italic',
        lineHeight: 18,
    },
    insightsCard: {
        backgroundColor: '#fff0e8',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#91483C',
    },
    insightsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 16,
    },
    insightsList: {
        gap: 12,
    },
    insightItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    insightText: {
        marginLeft: 12,
        fontSize: 16,
        color: '#333',
        flex: 1,
    },
});
