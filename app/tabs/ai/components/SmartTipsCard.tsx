import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis } from './types';
import { LinearGradient } from 'expo-linear-gradient';
import tipsImg from '@assets/decor/aiTips.png';
import { useRouter } from 'expo-router';

interface Tip {
    id: string;
    title: string;
    description: string;
    impact: 'high' | 'medium' | 'low';
    icon: string;
    potentialSavings?: number;
    timeframe?: 'recent' | 'weekly' | 'monthly' | 'general';
    actionType: 'update_budget' | 'chat' | 'view_stats' | 'learn_more';
    category?: string;
}

interface SmartTipsCardProps {
    analysis?: SpendingAnalysis | null;
    onUpdateBudget?: (category?: string) => void;
    onOpenChat?: () => void;
}

export default function SmartTipsCard({ analysis, onUpdateBudget, onOpenChat }: SmartTipsCardProps): JSX.Element {
    const router = useRouter();

    if (!analysis) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Image source={tipsImg} style={styles.image} resizeMode="contain" />
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Smart Tips</Text>
                        <Text style={styles.headerSubtitle}>Loading your personalized tips...</Text>
                    </View>
                </View>
            </View>
        );
    }

    const generateSmartTips = (): Tip[] => {
        const tips: Tip[] = [];
        const analysisSafe = analysis || {};

        // High-impact spending pattern tips
        if (analysisSafe.spendingPatterns?.essentialVsFlexible?.flexible > (analysisSafe.spendingPatterns?.essentialVsFlexible?.essential || 0) * 1.5) {
            tips.push({
                id: 'flexible-spending',
                title: 'High Flexible Spending Alert',
                description: `Your flexible spending (${analysisSafe.spendingPatterns.essentialVsFlexible.flexible} RON) is significantly higher than essential spending. Consider reallocating some of this to savings.`,
                impact: 'high',
                icon: '💰',
                potentialSavings: Math.round(analysisSafe.spendingPatterns.essentialVsFlexible.flexible * 0.3),
                actionType: 'learn_more',
                timeframe: 'general'
            });
        }

        // Category-specific insights
        (analysisSafe.topCategories || []).filter(Boolean).forEach(cat => {
            if (cat.percentage > 40) {
                tips.push({
                    id: `high-category-${cat.category}`,
                    title: `High ${cat.category} Spending`,
                    description: `${cat.category} makes up ${cat.percentage}% of your spending. This might be an opportunity to optimize.`,
                    impact: 'high',
                    icon: '💡',
                    potentialSavings: Math.round(cat.amount * 0.2),
                    actionType: 'learn_more',
                    category: cat.category,
                    timeframe: 'general'
                });
            }
        });

        // Weekly trend insights
        if (analysisSafe.weeklyStats?.trend === 'increasing') {
            const difference = (analysisSafe.weeklyStats.currentWeek || 0) - (analysisSafe.weeklyStats.lastWeek || 0);
            tips.push({
                id: 'weekly-trend',
                title: 'Spending Trend Alert',
                description: `Your spending this week is ${Math.round(difference)} RON higher than last week. Let's work on getting back on track!`,
                impact: 'medium',
                icon: '⚠️',
                actionType: 'learn_more',
                timeframe: 'weekly'
            });
        }

        // Daily spending habits
        if ((analysisSafe.weeklyStats?.topSpendingDay?.amount || 0) > (analysisSafe.averageDailySpending || 0) * 1.5) {
            tips.push({
                id: 'high-spending-day',
                title: 'Daily Spending Pattern',
                description: `${analysisSafe.weeklyStats.topSpendingDay.day} tends to be your highest spending day. Planning ahead could help reduce these spikes.`,
                impact: 'medium',
                icon: '🎯',
                actionType: 'learn_more',
                timeframe: 'general'
            });
        }

        // Seasonal advice
        if (analysisSafe.seasonalContext?.isHolidaySeason) {
            tips.push({
                id: 'holiday-planning',
                title: 'Holiday Season Ahead',
                description: 'Holiday expenses can add up quickly. Start planning your holiday budget now to avoid overspending.',
                impact: 'high',
                icon: '💰',
                actionType: 'learn_more',
                timeframe: 'monthly'
            });
        }

        // Weekend vs Weekday patterns
        const weekendAvg = (analysisSafe.spendingPatterns?.weekdayVsWeekend?.weekend || 0) / 2;
        const weekdayAvg = (analysisSafe.spendingPatterns?.weekdayVsWeekend?.weekday || 0) / 5;
        if (weekendAvg > weekdayAvg * 2) {
            tips.push({
                id: 'weekend-spending',
                title: 'Weekend Spending Habits',
                description: `Your average weekend spending (${Math.round(weekendAvg)} RON/day) is much higher than weekdays. Consider some budget-friendly weekend activities.`,
                impact: 'medium',
                icon: '🎯',
                actionType: 'learn_more',
                timeframe: 'general'
            });
        }

        // New: Recurring Expenses Analysis
        const recurringExpenses = analysisSafe.spendingPatterns?.recurringExpenses || [];
        if (recurringExpenses.length > 0) {
            const totalRecurring = recurringExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
            if (totalRecurring > (analysisSafe.averageDailySpending || 0) * 7) {
                tips.push({
                    id: 'recurring-expenses',
                    title: 'Recurring Expenses Review',
                    description: `You have ${recurringExpenses.length} recurring expenses totaling ${Math.round(totalRecurring)} RON. Review these to ensure they're all necessary.`,
                    impact: 'high',
                    icon: '🔄',
                    actionType: 'learn_more',
                    timeframe: 'monthly'
                });
            }
        }

        // New: Savings Opportunity
        const potentialSavings = (analysisSafe.spendingPatterns?.essentialVsFlexible?.flexible || 0) * 0.2;
        if (potentialSavings > 100) {
            tips.push({
                id: 'savings-opportunity',
                title: 'Savings Opportunity',
                description: `You could save up to ${Math.round(potentialSavings)} RON by reducing flexible spending by 20%.`,
                impact: 'high',
                icon: '💎',
                potentialSavings: Math.round(potentialSavings),
                actionType: 'learn_more',
                timeframe: 'monthly'
            });
        }

        // New: Category Balance
        const unbalancedCategories = (analysisSafe.topCategories || []).filter(cat => cat && cat.percentage > 30);
        if (unbalancedCategories.length > 1) {
            tips.push({
                id: 'category-balance',
                title: 'Category Balance Alert',
                description: `Your spending is concentrated in ${unbalancedCategories.length} categories. Consider diversifying your expenses.`,
                impact: 'medium',
                icon: '⚖️',
                actionType: 'learn_more',
                timeframe: 'general'
            });
        }

        // New: Spending Frequency
        const highFrequencyCategories = (analysisSafe.spendingPatterns?.categoryFrequency || []).filter(cat => cat && cat.frequency > 5);
        if (highFrequencyCategories.length > 0) {
            tips.push({
                id: 'spending-frequency',
                title: 'Frequent Spending Alert',
                description: `You're making frequent purchases in ${highFrequencyCategories.length} categories. Consider bulk buying or subscription services.`,
                impact: 'medium',
                icon: '🛒',
                actionType: 'learn_more',
                timeframe: 'weekly'
            });
        }

        // New: Time-based Spending
        const eveningSpending = analysisSafe.spendingPatterns?.timeBasedSpending?.evening || 0;
        const morningSpending = analysisSafe.spendingPatterns?.timeBasedSpending?.morning || 0;
        if (eveningSpending > morningSpending * 2) {
            tips.push({
                id: 'time-based-spending',
                title: 'Evening Spending Pattern',
                description: 'You tend to spend more in the evening. Consider planning your purchases earlier in the day.',
                impact: 'low',
                icon: '🌙',
                actionType: 'learn_more',
                timeframe: 'general'
            });
        }

        // New: Location-based Spending
        const locationEntries = Object.entries(analysisSafe.spendingPatterns?.locationBasedSpending || {});
        const maxLocation = locationEntries.reduce((max, [loc, amount]) =>
            (typeof amount === 'number' && amount > max.amount) ? { location: loc, amount } : max,
            { location: '', amount: 0 }
        );
        if (maxLocation.amount > (analysisSafe.averageDailySpending || 0) * 3) {
            tips.push({
                id: 'location-spending',
                title: 'Location-based Spending',
                description: `You spend significantly more in ${maxLocation.location}. Consider alternative locations for better deals.`,
                impact: 'medium',
                icon: '📍',
                actionType: 'learn_more',
                timeframe: 'general'
            });
        }

        return tips;
    };

    const tips = generateSmartTips();

    const getImpactColor = (impact: 'high' | 'medium' | 'low'): [string, string] => {
        switch (impact) {
            case 'high':
                return ['#FF6B6B', '#FF8787'];
            case 'medium':
                return ['#4ECDC4', '#7EE6DF'];
            case 'low':
                return ['#95A5A6', '#BDC3C7'];
        }
    };

    const getTypeIcon = (type: 'saving' | 'habit' | 'insight' | 'warning') => {
        switch (type) {
            case 'saving':
                return '💰';
            case 'habit':
                return '🎯';
            case 'insight':
                return '💡';
            case 'warning':
                return '⚠️';
        }
    };

    const handleTipAction = (tip: Tip) => {
        switch (tip.actionType) {
            case 'update_budget':
                onUpdateBudget?.(tip.category);
                break;
            case 'chat':
                onOpenChat?.();
                break;
            case 'view_stats':
                // Navigate to stats section
                router.push('/(tabs)/stats' as any);
                break;
            default:
                // Open chat with context about the tip
                onOpenChat?.();
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={tipsImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Smart Tips</Text>
                    <Text style={styles.headerSubtitle}>
                        Personalized insights to help you save
                    </Text>
                </View>
            </View>

            {tips.map((tip, index) => (
                <View key={index} style={styles.tipCard}>
                    <LinearGradient
                        colors={getImpactColor(tip.impact)}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.impactBadge}
                    >
                        <Text style={styles.impactText}>{tip.impact}</Text>
                    </LinearGradient>

                    <View style={styles.tipHeader}>
                        <Text style={styles.typeIcon}>{getTypeIcon(tip.icon as any)}</Text>
                        <Text style={styles.tipTitle}>{tip.title}</Text>
                    </View>

                    <Text style={styles.tipDescription}>{tip.description}</Text>

                    {tip.potentialSavings && (
                        <View style={styles.savingsContainer}>
                            <Text style={styles.savingsLabel}>Potential Savings:</Text>
                            <Text style={styles.savingsAmount}>{tip.potentialSavings} RON</Text>
                        </View>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.actionButton,
                            { backgroundColor: getImpactColor(tip.impact)[0] }
                        ]}
                        onPress={() => handleTipAction(tip)}
                    >
                        <Text style={styles.actionButtonText}>
                            {tip.actionType === 'update_budget' ? 'Update Budget' :
                             tip.actionType === 'chat' ? 'Get Advice' :
                             tip.actionType === 'view_stats' ? 'View Stats' : 'Learn More'}
                        </Text>
                        <Ionicons
                            name={tip.actionType === 'chat' ? 'chatbubble-outline' :
                                  tip.actionType === 'update_budget' ? 'wallet-outline' :
                                  tip.actionType === 'view_stats' ? 'stats-chart-outline' : 'arrow-forward-outline'}
                            size={20}
                            color="#FFFFFF"
                            style={styles.actionIcon}
                        />
                    </TouchableOpacity>

                    {tip.timeframe && (
                        <Text style={styles.timeframe}>
                            {tip.timeframe === 'recent' ? 'Based on recent activity' :
                             tip.timeframe === 'weekly' ? 'Weekly analysis' :
                             tip.timeframe === 'monthly' ? 'Monthly insight' : 'General advice'}
                        </Text>
                    )}
                </View>
            ))}
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
        fontSize: 28,
        fontWeight: 'bold',
        color: '#90483c',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginTop: 0,
    },
    tipCard: {
        backgroundColor: 'rgba(255, 243, 224, 0.9)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        marginHorizontal: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    impactBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 1,
    },
    impactText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontFamily: 'Fredoka',
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 24,
    },
    typeIcon: {
        fontSize: 24,
        marginRight: 8,
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        flex: 1,
    },
    tipDescription: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 16,
        lineHeight: 20,
        fontFamily: 'Fredoka',
    },
    savingsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F8E9',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#C5E1A5',
    },
    savingsLabel: {
        fontSize: 14,
        color: '#558B2F',
        fontFamily: 'Fredoka',
        marginRight: 8,
    },
    savingsAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#558B2F',
        fontFamily: 'Fredoka',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
        marginRight: 8,
    },
    actionIcon: {
        marginLeft: 4,
    },
    timeframe: {
        fontSize: 12,
        color: '#95A5A6',
        fontFamily: 'Fredoka',
        marginTop: 8,
        textAlign: 'right',
    },
});
