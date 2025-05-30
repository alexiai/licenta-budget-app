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
import tipsImg from '@assets/decor/aiTips.png';

interface SmartTipsCardProps {
    analysis?: SpendingAnalysis | null;
}

interface SmartTip {
    id: string;
    title: string;
    description: string;
    icon: string;
    emoji: string;
    savingsAmount?: number;
    category?: string;
    priority: 'high' | 'medium' | 'low';
    type: 'seasonal' | 'pattern' | 'goal' | 'insight' | 'general';
}

export default function SmartTipsCard({ analysis }: SmartTipsCardProps): JSX.Element {
    const generateSmartTips = (): SmartTip[] => {
        const tips: SmartTip[] = [];
        if (!analysis) return getDefaultTips();

        const {
            topCategories = [],
            totalThisMonth = 0,
            totalLastMonth = 0,
            subcategoryBreakdown = {},
            categoryBreakdown = {},
            spendingPatterns,
            seasonalContext,
            weeklyStats
        } = analysis;

        // 🎄 SEASONAL TIPS
        if (seasonalContext.isHolidaySeason) {
            if (seasonalContext.month === 'December') {
                tips.push({
                    id: 'holiday-budgeting',
                    title: '🎄 Bunny Holiday Plan',
                    description: `Holiday season is here! 🐰🎁 Set a specific gift budget to avoid overspending. Your bunny will still love you even with thoughtful, budget-friendly gifts!`,
                    icon: 'gift',
                    emoji: '🐰🎄',
                    priority: 'high',
                    type: 'seasonal'
                });
            }

            if (seasonalContext.month === 'January') {
                tips.push({
                    id: 'new-year-reset',
                    title: '🌟 New Year, New Bunny Habits',
                    description: `Fresh start time! 🐰✨ January is perfect for setting spending goals. Try the 50/30/20 rule: 50% needs, 30% wants, 20% savings!`,
                    icon: 'star',
                    emoji: '🐰🌟',
                    priority: 'high',
                    type: 'seasonal'
                });
            }
        }

        // 🔥 HIGH SPENDING CATEGORY ALERTS
        topCategories.forEach((categoryData, index) => {
            if (categoryData.percentage > 30 && index === 0) {
                const potentialSavings = Math.round(categoryData.amount * 0.1);
                tips.push({
                    id: `high-spending-${categoryData.category}`,
                    title: `🐰 Bunny Alert: High ${categoryData.category} Spending!`,
                    description: `You spent ${categoryData.amount.toFixed(0)} RON (${categoryData.percentage.toFixed(1)}%) on ${categoryData.category} this month. Try cutting 10% to save ${potentialSavings} RON! Even bunnies budget their carrots! 🥕`,
                    icon: 'warning',
                    emoji: '🐰⚠️',
                    savingsAmount: potentialSavings,
                    category: categoryData.category,
                    priority: 'high',
                    type: 'pattern'
                });
            }
        });

        // 🍕 RESTAURANT VS COOKING ANALYSIS
        const restaurantSpending = Number(subcategoryBreakdown['Restaurant'] || 0);
        const groceriesSpending = Number(subcategoryBreakdown['Groceries'] || 0);

        if (restaurantSpending > groceriesSpending && restaurantSpending > 150) {
            tips.push({
                id: 'restaurant-vs-cooking',
                title: '🍳 Cook More, Save More!',
                description: `You spent ${restaurantSpending.toFixed(0)} RON on restaurants vs ${groceriesSpending.toFixed(0)} RON on groceries. 🐰👨‍🍳 Cooking at home just once more per week could save you ${(restaurantSpending * 0.15).toFixed(0)} RON/month!`,
                savingsAmount: restaurantSpending * 0.15,
                priority: 'medium',
                category: 'Food & Drinks',
                emoji: '🐰🍳',
                icon: 'restaurant',
                type: 'insight'
            });
        }

        // 🚗 TRANSPORT OPTIMIZATION
        const transportSpending = Number(categoryBreakdown['Transport'] || 0);
        const uberSpending = Number(subcategoryBreakdown['Taxi'] || 0);

        if (uberSpending > 100) {
            tips.push({
                id: 'rideshare-optimization',
                title: '🐇 Hop Smart with Transport!',
                description: `You've spent ${uberSpending.toFixed(0)} RON on rideshares this month. 🚌 Try public transport or walking for short trips - your bunny legs are strong! Could save ${(uberSpending * 0.4).toFixed(0)} RON!`,
                savingsAmount: uberSpending * 0.4,
                priority: 'medium',
                category: 'Transport',
                emoji: '🐰🚌',
                icon: 'car',
                type: 'insight'
            });
        }

        // ☕ COFFEE HABIT TRACKER
        const coffeeSpending = Number(subcategoryBreakdown['Coffee'] || 0);
        if (coffeeSpending > 80) {
            const dailyCoffeeAvg = coffeeSpending / new Date().getDate();
            tips.push({
                id: 'coffee-habit',
                title: '☕ Bunny Coffee Analytics',
                description: `Your daily coffee average: ${dailyCoffeeAvg.toFixed(0)} RON! 🐰☕ Making coffee at home 2-3 times per week could save ${(coffeeSpending * 0.3).toFixed(0)} RON while still enjoying your café treats!`,
                savingsAmount: coffeeSpending * 0.3,
                priority: 'low',
                category: 'Food & Drinks',
                emoji: '🐰☕',
                icon: 'cafe',
                type: 'pattern'
            });
        }

        // 📈 SPENDING SPIKE ALERTS
        spendingPatterns.recentSpikes.forEach(spike => {
            if (spike.increase > 30) {
                tips.push({
                    id: `spike-${spike.category}`,
                    title: `📈 ${spike.category} Spike Detected!`,
                    description: `🛍️ Your ${spike.category} spending increased by ${spike.increase.toFixed(0)}% ${spike.timeframe}. Is it a planned expense or retail therapy? Either way, your bunny is watching! 🐰👀`,
                    icon: 'trending-up',
                    emoji: '🐰📊',
                    priority: 'medium',
                    category: spike.category,
                    type: 'pattern'
                });
            }
        });

        // 🎯 GOAL-BASED ADVICE (when total is available)
        if (totalThisMonth > 0) {
            const monthProgress = new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
            const projectedMonthly = totalThisMonth / monthProgress;

            if (projectedMonthly > totalLastMonth * 1.2) {
                tips.push({
                    id: 'monthly-projection',
                    title: '🎯 Monthly Budget Check',
                    description: `You're on track to spend ${projectedMonthly.toFixed(0)} RON this month vs ${totalLastMonth.toFixed(0)} RON last month. 🐰📊 Time to slow down those bunny hops to the store!`,
                    icon: 'analytics',
                    emoji: '🐰🎯',
                    priority: 'high',
                    type: 'goal'
                });
            }
        }

        // 💎 WEEKEND VS WEEKDAY INSIGHTS
        if (spendingPatterns.weekdayVsWeekend.weekend > spendingPatterns.weekdayVsWeekend.weekday * 0.4) {
            tips.push({
                id: 'weekend-spending',
                title: '🎮 Weekend Warrior Alert',
                description: `Weekend spending: ${spendingPatterns.weekdayVsWeekend.weekend.toFixed(0)} RON vs weekdays: ${spendingPatterns.weekdayVsWeekend.weekday.toFixed(0)} RON. 🐰🎉 Weekends are for fun, but try some free activities too - bunny parks are free!`,
                icon: 'calendar',
                emoji: '🐰🎮',
                priority: 'low',
                type: 'insight'
            });
        }

        // 📊 WEEKLY PERFORMANCE
        if (weeklyStats.trend === 'decreasing') {
            tips.push({
                id: 'weekly-improvement',
                title: '📊 Bunny Progress Report',
                description: `Great job! 🎉 This week you spent ${weeklyStats.currentWeek.toFixed(0)} RON vs ${weeklyStats.lastWeek.toFixed(0)} RON last week. Your bunny is proud of your self-control! 🐰👏`,
                icon: 'trending-down',
                emoji: '🐰📉',
                priority: 'low',
                type: 'goal'
            });
        }

        // 🚨 TOP SPENDING DAY INSIGHT
        if (weeklyStats.topSpendingDay.amount > 0) {
            tips.push({
                id: 'top-spending-day',
                title: `🚨 ${weeklyStats.topSpendingDay.day} Spending Spike`,
                description: `${weeklyStats.topSpendingDay.day} was your highest spending day: ${weeklyStats.topSpendingDay.amount.toFixed(0)} RON! 🐰📅 Bunnies tend to overspend on ${weeklyStats.topSpendingDay.day}s - plan ahead next time!`,
                icon: 'calendar',
                emoji: '🐰🚨',
                priority: 'low',
                type: 'pattern'
            });
        }

        // Sort by priority and limit to 6 tips
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 6);
    };

    const getDefaultTips = (): SmartTip[] => {
        return [
            {
                id: 'loading-tip',
                title: '🐰 Getting Ready...',
                description: 'Your bunny is analyzing your spending patterns to give you personalized advice! Add more expenses for better insights.',
                icon: 'hourglass',
                emoji: '🐰⏳',
                priority: 'medium',
                type: 'general'
            }
        ];
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return '#FF6B6B';
            case 'medium': return '#4ECDC4';
            case 'low': return '#45B7D1';
            default: return '#95A5A6';
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'seasonal': return '🎄';
            case 'pattern': return '📊';
            case 'goal': return '🎯';
            case 'insight': return '💡';
            default: return '🐰';
        }
    };

    const tips = generateSmartTips();

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={tipsImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Smart Bunny Tips</Text>
                    <Text style={styles.headerSubtitle}>
                        AI-powered personalized advice based on your spending patterns
                    </Text>
                </View>
            </View>

            {tips.length === 0 ? (
                <View style={styles.noTipsContainer}>
                    <Text style={styles.noTipsEmoji}>🐰💤</Text>
                    <Text style={styles.noTipsText}>
                        Your bunny is still analyzing your spending patterns.
                        Keep adding expenses for personalized tips!
                    </Text>
                </View>
            ) : (
                <View style={styles.tipsContainer}>
                    {tips.map((tip) => (
                        <View key={tip.id} style={[styles.tipCard, { backgroundColor: '#FFF0E0' }]}>
                            <View style={styles.tipHeader}>
                                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(tip.priority) }]}>
                                    <Ionicons name={tip.icon as any} size={16} color="white" />
                                </View>
                                <Text style={styles.tipEmoji}>{tip.emoji}</Text>
                                <Text style={styles.tipType}>{getTypeIcon(tip.type)}</Text>
                            </View>
                            <Text style={styles.tipTitle}>{tip.title}</Text>
                            <Text style={styles.tipDescription}>{tip.description}</Text>
                            {tip.savingsAmount && (
                                <View style={styles.savingsContainer}>
                                    <Ionicons name="leaf" size={16} color="#4CAF50" />
                                    <Text style={styles.savingsText}>
                                        Potential savings: {tip.savingsAmount.toFixed(0)} RON/month
                                    </Text>
                                </View>
                            )}
                        </View>
                    ))}
                </View>
            )}
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
    noTipsContainer: {
        alignItems: 'center',
        padding: 40,
    },
    noTipsEmoji: { fontSize: 48, marginBottom: 16 },
    noTipsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
        fontFamily: 'Fredoka',
    },
    tipsContainer: {
        gap: 16,
        paddingHorizontal: 16,
    },
    tipCard: {
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: '#FFD4A8',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    priorityBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    tipEmoji: {
        fontSize: 20,
        marginRight: 8,
    },
    tipType: {
        fontSize: 16,
        marginLeft: 'auto',
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
        fontFamily: 'Fredoka',
    },
    tipDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
        marginBottom: 12,
        fontFamily: 'Fredoka',
    },
    savingsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E8',
        padding: 8,
        borderRadius: 12,
    },
    savingsText: {
        fontSize: 12,
        color: '#4CAF50',
        fontWeight: 'bold',
        marginLeft: 4,
        fontFamily: 'Fredoka',
    },
});
