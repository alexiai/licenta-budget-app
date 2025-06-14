import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis } from './SmartAdviceSection';
import { LinearGradient } from 'expo-linear-gradient';
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

    const {
        weeklyStats,
        spendingPatterns,
        totalThisMonth,
        totalLastMonth,
        averageDailySpending
    } = analysis;

    const screenWidth = Dimensions.get('window').width;
    const chartWidth = screenWidth - 64; // Accounting for padding
    const maxDailyAmount = Math.max(...Object.values(weeklyStats.dailyBreakdown));

    const getBarWidth = (amount: number) => {
        return (amount / maxDailyAmount) * (chartWidth - 100); // Leave space for labels
    };

    const getBarColor = (amount: number) => {
        if (amount > averageDailySpending * 1.5) {
            return ['#FF5252', '#FF8A80'] as [string, string];
        } else if (amount > averageDailySpending * 1.2) {
            return ['#FFA726', '#FFB74D'] as [string, string];
        } else if (amount < averageDailySpending * 0.5) {
            return ['#66BB6A', '#81C784'] as [string, string];
        } else {
            return ['#42A5F5', '#64B5F6'] as [string, string];
        }
    };

    const formatAmount = (amount: number) => {
        return amount.toLocaleString('en-US', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        });
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'increasing':
                return '📈';
            case 'decreasing':
                return '📉';
            default:
                return '➡️';
        }
    };

    const getMonthlyComparison = () => {
        const difference = totalThisMonth - totalLastMonth;
        const percentChange = ((difference / totalLastMonth) * 100);
        const isIncrease = difference > 0;

        return {
            text: `${isIncrease ? 'Up' : 'Down'} ${Math.abs(percentChange).toFixed(1)}%`,
            color: isIncrease ? '#FF5252' : '#66BB6A',
            icon: isIncrease ? '📈' : '📉'
        };
    };

    const monthlyComparison = getMonthlyComparison();

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

            {/* Weekly Overview Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Weekly Overview</Text>
                <View style={styles.weeklyOverview}>
                    <View style={styles.overviewItem}>
                        <Text style={styles.overviewLabel}>This Week</Text>
                        <Text style={styles.overviewAmount}>{formatAmount(weeklyStats.currentWeek)} RON</Text>
                    </View>
                    <View style={styles.trendIndicator}>
                        <Text style={styles.trendIcon}>{getTrendIcon(weeklyStats.trend)}</Text>
                        <Text style={[
                            styles.trendText,
                            { color: weeklyStats.trend === 'increasing' ? '#FF5252' : '#66BB6A' }
                        ]}>
                            {weeklyStats.trend === 'increasing' ? 'Up' : 'Down'}
                        </Text>
                    </View>
                    <View style={styles.overviewItem}>
                        <Text style={styles.overviewLabel}>Last Week</Text>
                        <Text style={styles.overviewAmount}>{formatAmount(weeklyStats.lastWeek)} RON</Text>
                    </View>
                </View>
            </View>

            {/* Daily Breakdown Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Daily Breakdown</Text>
                <Text style={styles.cardSubtitle}>Compare your daily spending with your average</Text>
                <View style={styles.barChart}>
                    {Object.entries(weeklyStats.dailyBreakdown).map(([day, amount]) => {
                        const percentOfAverage = (amount / averageDailySpending) * 100;
                        const status = percentOfAverage > 120 ? 'high' : percentOfAverage < 80 ? 'low' : 'normal';
                        const barColor = getBarColor(amount);
                        
                        return (
                            <View key={day} style={styles.barRow}>
                                <Text style={styles.barLabel}>{day.slice(0, 3)}</Text>
                                <View style={styles.barContainer}>
                                    <LinearGradient
                                        colors={barColor}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                        style={[styles.bar, { width: getBarWidth(amount) }]}
                                    />
                                </View>
                                <View style={styles.barInfo}>
                                    <Text style={styles.barAmount}>{formatAmount(amount)}</Text>
                                    <Text style={[styles.barStatus, styles[`barStatus${status}`]]}>
                                        {Math.round(percentOfAverage)}%
                                    </Text>
                                </View>
                            </View>
                        );
                    })}
                </View>
                <View style={styles.legendContainer}>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#FF5252' }]} />
                        <Text style={styles.legendText}>Above Average ({'>'}120%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#42A5F5' }]} />
                        <Text style={styles.legendText}>Normal (80-120%)</Text>
                    </View>
                    <View style={styles.legendItem}>
                        <View style={[styles.legendDot, { backgroundColor: '#66BB6A' }]} />
                        <Text style={styles.legendText}>Below Average ({'<'}80%)</Text>
                    </View>
                </View>
            </View>

            {/* Monthly Comparison Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Monthly Progress</Text>
                <View style={styles.monthlyComparison}>
                    <View style={styles.monthlyItem}>
                        <Text style={styles.monthlyLabel}>This Month</Text>
                        <Text style={styles.monthlyAmount}>{formatAmount(totalThisMonth)} RON</Text>
                    </View>
                    <View style={[styles.monthlyTrend, { backgroundColor: monthlyComparison.color + '20' }]}>
                        <Text style={styles.monthlyTrendIcon}>{monthlyComparison.icon}</Text>
                        <Text style={[styles.monthlyTrendText, { color: monthlyComparison.color }]}>
                            {monthlyComparison.text}
                        </Text>
                    </View>
                </View>
                <View style={styles.averageContainer}>
                    <Text style={styles.averageLabel}>Daily Average:</Text>
                    <Text style={styles.averageAmount}>{formatAmount(averageDailySpending)} RON</Text>
                </View>
            </View>

            {/* Spending Distribution Card */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Spending Distribution</Text>
                <View style={styles.distributionRow}>
                    <View style={styles.distributionItem}>
                        <Text style={styles.distributionLabel}>Essential</Text>
                        <Text style={styles.distributionAmount}>
                            {formatAmount(spendingPatterns.essentialVsFlexible.essential)} RON
                        </Text>
                        <Text style={styles.distributionPercentage}>
                            {Math.round((spendingPatterns.essentialVsFlexible.essential / totalThisMonth) * 100)}%
                        </Text>
                    </View>
                    <View style={styles.distributionDivider} />
                    <View style={styles.distributionItem}>
                        <Text style={styles.distributionLabel}>Flexible</Text>
                        <Text style={styles.distributionAmount}>
                            {formatAmount(spendingPatterns.essentialVsFlexible.flexible)} RON
                        </Text>
                        <Text style={styles.distributionPercentage}>
                            {Math.round((spendingPatterns.essentialVsFlexible.flexible / totalThisMonth) * 100)}%
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1,
        backgroundColor: '#FFF9E6',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 16,
        marginLeft: -16,
    },
    image: {
        width: 160,
        height: 160,
        marginRight: 16,
        alignSelf: 'center',
        marginLeft: -16,
    },
    headerText: {
        flex: 1,
        paddingTop: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#90483c',
        fontFamily: 'Fredoka',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginTop: 4,
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
    card: {
        backgroundColor: 'rgba(255, 243, 224, 0.9)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 16,
    },
    cardSubtitle: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Fredoka',
        marginBottom: 16,
    },
    weeklyOverview: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    overviewItem: {
        alignItems: 'center',
    },
    overviewLabel: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    overviewAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    trendIndicator: {
        alignItems: 'center',
    },
    trendIcon: {
        fontSize: 24,
        marginBottom: 4,
    },
    trendText: {
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
    barChart: {
        marginTop: 8,
        paddingRight: 16,
    },
    barRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        height: 40,
    },
    barLabel: {
        width: 50,
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Fredoka',
        marginRight: 8,
    },
    barContainer: {
        flex: 1,
        height: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 6,
        overflow: 'hidden',
        marginRight: 16,
    },
    bar: {
        height: '100%',
        borderRadius: 6,
    },
    barInfo: {
        width: 80,
        alignItems: 'flex-end',
    },
    barAmount: {
        fontSize: 14,
        color: '#91483C',
        fontFamily: 'Fredoka',
        fontWeight: 'bold',
    },
    barStatus: {
        fontSize: 12,
        fontFamily: 'Fredoka',
        marginTop: 2,
    },
    barStatushigh: {
        color: '#FF5252',
    },
    barStatuslow: {
        color: '#66BB6A',
    },
    barStatusnormal: {
        color: '#42A5F5',
    },
    monthlyComparison: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    monthlyItem: {
        alignItems: 'flex-start',
    },
    monthlyLabel: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    monthlyAmount: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    monthlyTrend: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
    },
    monthlyTrendIcon: {
        fontSize: 20,
        marginRight: 4,
    },
    monthlyTrendText: {
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
    averageContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
    },
    averageLabel: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Fredoka',
    },
    averageAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    distributionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    distributionItem: {
        flex: 1,
        alignItems: 'center',
    },
    distributionLabel: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    distributionAmount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    distributionPercentage: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Fredoka',
    },
    distributionDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 16,
    },
    legendContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    legendDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 8,
    },
    legendText: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Fredoka',
    },
});
