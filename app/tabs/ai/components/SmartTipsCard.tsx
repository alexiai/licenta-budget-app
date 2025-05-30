// SmartTipsCard.tsx
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
    analysis?: SpendingAnalysis;
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

export default function SmartTipsCard({ analysis }: SmartTipsCardProps): JSX.Element {
    const generateSmartTips = (): SmartTip[] => {
        const tips: SmartTip[] = [];
        if (!analysis) return tips;

        const {
            topCategories = [],
            totalThisMonth = 0,
            totalLastMonth = 0,
            subcategoryBreakdown = {},
            categoryBreakdown = {}
        } = analysis;

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

        const restaurantSpending = Number(subcategoryBreakdown['Restaurant'] || 0);
        const groceriesSpending = Number(subcategoryBreakdown['Groceries'] || 0);

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

        const transportSpending = Number(categoryBreakdown['Transport'] || 0);
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

        const entertainmentSpending = Number(categoryBreakdown['Entertainment'] || 0);
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

        const savingsSpending = Number(categoryBreakdown['Savings'] || 0);
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

        const averageDailySpending = analysis.averageDailySpending || 0;
        if (averageDailySpending > 100) {
            tips.push({
                id: 'daily-spending',
                title: '📅 Bunny\'s Daily Wisdom',
                description: `Average daily spending: ${averageDailySpending.toFixed(0)} RON. Try setting a daily limit of 80 RON. Small hops lead to big journeys! 🐰👣`,
                icon: 'calendar',
                emoji: '🐰📅',
                priority: 'medium'
            });
        }

        const priorityOrder = { high: 0, medium: 1, low: 2 };
        return tips.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]).slice(0, 6);
    };

    const tips = generateSmartTips();

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return '#FF8C42';
            case 'medium': return '#FFA94D';
            case 'low': return '#FFD6A5';
            default: return '#FFE0B2';
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={tipsImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Smart Bunny Tips</Text>
                    <Text style={styles.headerSubtitle}>
                        Personalized advice based on your spending patterns
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
    tipEmoji: { fontSize: 24 },
    tipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF6B00',
        marginBottom: 8,
    },
    tipDescription: {
        fontSize: 16,
        color: '#91483C',
        lineHeight: 22,
        marginBottom: 12,
    },
    savingsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#E8F5E8',
        padding: 12,
        borderRadius: 8,
    },
    savingsText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#4CAF50',
    },
});
