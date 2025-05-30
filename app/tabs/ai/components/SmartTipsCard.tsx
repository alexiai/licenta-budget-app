import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis, ExpenseData } from './SmartAdviceSection';

interface SmartTipsCardProps {
    analysis: SpendingAnalysis;
    expenses: ExpenseData[];
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
}

export default function SmartTipsCard({ analysis, expenses }: SmartTipsCardProps): JSX.Element {
    const generateSmartTips = (): SmartTip[] => {
        const tips: SmartTip[] = [];

        // Analyze spending patterns and generate contextual tips
        const { topCategories, totalThisMonth, totalLastMonth, subcategoryBreakdown, categoryBreakdown } = analysis;

        // High spending category tips
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
                    priority: 'high'
                });
            }
        });

        // Coffee/drinks optimization
        const coffeeSpending = subcategoryBreakdown['Coffee'] || 0;
        const drinksSpending = subcategoryBreakdown['Drinks'] || 0;
        const totalBeverage = coffeeSpending + drinksSpending;

        if (totalBeverage > 150) {
            const homeBrewSavings = Math.round(totalBeverage * 0.6);
            tips.push({
                id: 'coffee-optimization',
                title: '☕ Bunny\'s Brew Tip',
                description: `You spent ${totalBeverage.toFixed(0)} RON on coffee & drinks! Making coffee at home could save you ${homeBrewSavings} RON/month. That's a lot of carrots! 🥕☕`,
                icon: 'cafe',
                emoji: '🐰☕',
                savingsAmount: homeBrewSavings,
                category: 'Food & Drinks',
                priority: 'medium'
            });
        }

        // Month-over-month comparison
        const spendingIncrease = totalThisMonth - totalLastMonth;
        if (spendingIncrease > 200) {
            tips.push({
                id: 'spending-increase',
                title: '📈 Bunny Budget Alert!',
                description: `Your spending increased by ${spendingIncrease.toFixed(0)} RON this month! Time to hop back to your budget plan. Even energetic bunnies need rest! 🐰💤`,
                icon: 'trending-up',
                emoji: '🐰📊',
                priority: 'high'
            });
        } else if (spendingIncrease < -100) {
            tips.push({
                id: 'spending-decrease',
                title: '🎉 Bunny Celebration Time!',
                description: `Amazing! You saved ${Math.abs(spendingIncrease).toFixed(0)} RON compared to last month! Your bunny is so proud! Keep hopping toward your goals! 🐰🎊`,
                icon: 'trophy',
                emoji: '🐰🏆',
                priority: 'low'
            });
        }

        // Food & Drinks optimization
        const restaurantSpending = Number((subcategoryBreakdown && subcategoryBreakdown['Restaurant']) || 0);
        const groceriesSpending = Number((subcategoryBreakdown && subcategoryBreakdown['Groceries']) || 0);
        const totalFoodSpending = Number((categoryBreakdown && categoryBreakdown['Food & Drinks']) || 0);

        if (restaurantSpending > groceriesSpending && restaurantSpending > 150) {
            tips.push({
                id: 'restaurant-vs-cooking',
                title: 'Cook More, Save More! 🐰🍳',
                description: `You spent ${restaurantSpending.toFixed(0)} RON on restaurants vs ${groceriesSpending.toFixed(0)} RON on groceries. Cooking at home could save you ${(restaurantSpending * 0.6).toFixed(0)} RON/month!`,
                savingsAmount: restaurantSpending * 0.6,
                priority: 'medium',
                category: 'Food & Drinks',
                emoji: '🐰🍳',
                icon: 'restaurant'
            });
        }

        // Transport optimization
        const transportSpending = Number((categoryBreakdown && categoryBreakdown['Transport']) || 0);
        if (transportSpending > 300) {
            tips.push({
                id: 'transport-optimization',
                title: 'Hop Smart, Save Big! 🐰🚌',
                description: `Transport costs ${transportSpending.toFixed(0)} RON/month. Consider public transport or carpooling to save ${(transportSpending * 0.3).toFixed(0)} RON monthly!`,
                savingsAmount: transportSpending * 0.3,
                priority: 'medium',
                category: 'Transport',
                emoji: '🐰🚌',
                icon: 'car'
            });
        }

        // Entertainment spending check
        const entertainmentSpending = Number((categoryBreakdown && categoryBreakdown['Entertainment']) || 0);
        if (totalThisMonth > 0 && entertainmentSpending > totalThisMonth * 0.15) {
            tips.push({
                id: 'entertainment-budget',
                title: 'Fun Police Alert! 🐰🚨',
                description: `Entertainment is ${((entertainmentSpending / totalThisMonth) * 100).toFixed(1)}% of your budget. Consider setting a monthly entertainment limit of ${(totalThisMonth * 0.1).toFixed(0)} RON.`,
                savingsAmount: entertainmentSpending - (totalThisMonth * 0.1),
                priority: 'medium',
                category: 'Entertainment',
                emoji: '🐰🎮',
                icon: 'game-controller'
            });
        }

        // Savings encouragement
        const savingsSpending = Number(analysis.categoryBreakdown['Savings'] || 0);
        const savingsPercentage = totalThisMonth > 0 ? (savingsSpending / totalThisMonth) * 100 : 0;

        if (savingsPercentage < 10) {
            const suggestedSavings = Math.round(totalThisMonth * 0.1);
            tips.push({
                id: 'savings-encouragement',
                title: '🥕 Bunny\'s Carrot Fund',
                description: `Only ${savingsPercentage.toFixed(1)}% saved this month! Try saving ${suggestedSavings} RON (10% of spending). Every carrot counts for winter! 🐰❄️`,
                icon: 'wallet',
                emoji: '🐰💰',
                savingsAmount: suggestedSavings,
                category: 'Savings',
                priority: 'high'
            });
        } else if (savingsPercentage > 20) {
            tips.push({
                id: 'savings-celebration',
                title: '💎 Bunny\'s Treasure Achievement',
                description: `Wow! ${savingsPercentage.toFixed(1)}% saved! You're a savings superstar! Your future bunny-self will thank you! 🐰✨`,
                icon: 'diamond',
                emoji: '🐰💎',
                priority: 'low'
            });
        }

        // Daily spending pattern
        if (analysis.averageDailySpending > 100) {
            tips.push({
                id: 'daily-spending',
                title: '📅 Bunny\'s Daily Wisdom',
                description: `Average daily spending: ${analysis.averageDailySpending.toFixed(0)} RON. Try setting a daily limit of 80 RON. Small hops lead to big journeys! 🐰👣`,
                icon: 'calendar',
                emoji: '🐰📅',
                priority: 'medium'
            });
        }

        // Sort tips by priority
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 6);
    };

    const tips = generateSmartTips();

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return '#FF6B6B';
            case 'medium': return '#4ECDC4';
            case 'low': return '#45B7D1';
            default: return '#91483C';
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerEmoji}>🐰🧠</Text>
                <Text style={styles.headerTitle}>Smart Bunny Tips</Text>
                <Text style={styles.headerSubtitle}>
                    Personalized advice based on your spending patterns
                </Text>
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
                    {tips.map((tip, index) => (
                        <View key={tip.id} style={styles.tipCard}>
                            <View style={styles.tipHeader}>
                                <View style={[
                                    styles.priorityBadge,
                                    { backgroundColor: getPriorityColor(tip.priority) }
                                ]}>
                                    <Ionicons
                                        name={tip.icon as any}
                                        size={16}
                                        color="white"
                                    />
                                </View>
                                <Text style={styles.tipEmoji}>{tip.emoji}</Text>
                            </View>

                            <Text style={styles.tipTitle}>{tip.title}</Text>
                            <Text style={styles.tipDescription}>{tip.description}</Text>

                            {tip.savingsAmount && (
                                <View style={styles.savingsContainer}>
                                    <Ionicons name="trending-down" size={16} color="#4CAF50" />
                                    <Text style={styles.savingsText}>
                                        Potential savings: {tip.savingsAmount} RON/month
                                    </Text>
                                </View>
                            )}

                            <TouchableOpacity style={styles.actionButton}>
                                <Text style={styles.actionButtonText}>Got it! 🐰</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}
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
    noTipsContainer: {
        alignItems: 'center',
        padding: 40,
    },
    noTipsEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    noTipsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    tipsContainer: {
        gap: 16,
    },
    tipCard: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#f0f0f0',
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
        fontSize: 24,
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
    },
    tipDescription: {
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
        marginBottom: 16,
    },
    savingsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    savingsText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#4CAF50',
    },
    actionButton: {
        backgroundColor: '#91483C',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 20,
        alignItems: 'center',
    },
    actionButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
});
