
import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis } from './SmartAdviceSection';

interface UnusedCategoriesCardProps {
    analysis: SpendingAnalysis;
}

interface CategoryInsight {
    category: string;
    icon: string;
    insight: string;
    emoji: string;
    actionText: string;
    type: 'good' | 'neutral' | 'reminder';
}

export default function UnusedCategoriesCard({ analysis }: UnusedCategoriesCardProps): JSX.Element {
    const getCategoryInsights = (): CategoryInsight[] => {
        const insights: CategoryInsight[] = [];
        const { unusedCategories, categoryBreakdown } = analysis;

        // Category mappings with bunny-themed insights
        const categoryData = {
            'Health': {
                icon: 'medical',
                good: 'Amazing! No health expenses this month! Your bunny is proud of your healthy lifestyle! 🐰💚',
                reminder: 'No health expenses tracked. Don\'t forget routine checkups - even bunnies need their carrot vitamins! 🐰🥕',
                emoji: '🐰🏥'
            },
            'Entertainment': {
                icon: 'game-controller',
                good: 'Wow! No entertainment spending! You\'re focusing like a determined bunny! 🐰🎯',
                reminder: 'No fun expenses? Remember to treat yourself sometimes - all work and no play makes bunny sad! 🐰😢',
                emoji: '🐰🎮'
            },
            'Lifestyle': {
                icon: 'shirt',
                good: 'No lifestyle purchases! Your bunny appreciates your minimalist approach! 🐰✨',
                reminder: 'No lifestyle spending tracked. Taking care of yourself is important too! 🐰💅',
                emoji: '🐰👗'
            },
            'Transport': {
                icon: 'car',
                good: 'No transport costs! Walking bunny style is eco-friendly and healthy! 🐰🌱',
                reminder: 'No transport expenses? Make sure you\'re tracking all your travel costs! 🐰🚌',
                emoji: '🐰🚗'
            },
            'Housing': {
                icon: 'home',
                good: 'No housing costs this month! Living rent-free like a wild bunny! 🐰🏠',
                reminder: 'No housing expenses tracked. Don\'t forget utilities and rent! 🐰🏡',
                emoji: '🐰🏠'
            },
            'Food & Drinks': {
                icon: 'restaurant',
                good: 'No food expenses? Are you living on carrots and water like a true bunny? 🐰🥕',
                reminder: 'No food costs tracked? That\'s unusual - even bunnies need their meals! 🐰🍽️',
                emoji: '🐰🍽️'
            },
            'Savings': {
                icon: 'wallet',
                good: 'Great savings momentum from last month! Your carrot fund is growing! 🐰💰',
                reminder: 'No savings this month? Every carrot saved counts for the future! 🐰🥕',
                emoji: '🐰💰'
            },
            'Other': {
                icon: 'ellipsis-horizontal',
                good: 'No miscellaneous expenses! Your bunny loves organized spending! 🐰📋',
                reminder: 'No other expenses tracked. Sometimes unexpected costs hop in! 🐰❓',
                emoji: '🐰📦'
            }
        };

        // Analyze unused categories
        unusedCategories.forEach(category => {
            const data = categoryData[category as keyof typeof categoryData];
            if (data) {
                // Determine if this is good or needs attention based on category type
                const isEssentialCategory = ['Food & Drinks', 'Housing'].includes(category);
                const isHealthCategory = category === 'Health';

                let type: 'good' | 'neutral' | 'reminder' = 'neutral';
                let insight = '';

                if (isEssentialCategory) {
                    type = 'reminder';
                    insight = data.reminder;
                } else if (isHealthCategory) {
                    // Check if it's been more than 2 months without health expenses
                    type = 'good'; // Assume good for now
                    insight = data.good;
                } else {
                    type = 'good';
                    insight = data.good;
                }

                insights.push({
                    category,
                    icon: data.icon,
                    insight,
                    emoji: data.emoji,
                    actionText: type === 'reminder' ? 'Track expenses' : 'Keep it up!',
                    type
                });
            }
        });

        // Also analyze very low spending categories
        Object.entries(categoryBreakdown).forEach(([category, amount]) => {
            if (amount < 50 && !unusedCategories.includes(category)) {
                const data = categoryData[category as keyof typeof categoryData];
                if (data) {
                    insights.push({
                        category,
                        icon: data.icon,
                        insight: `Only ${amount.toFixed(0)} RON on ${category} this month! Your bunny is impressed by your restraint! 🐰👍`,
                        emoji: data.emoji,
                        actionText: 'Great control!',
                        type: 'good'
                    });
                }
            }
        });

        return insights.slice(0, 6); // Limit to 6 insights
    };

    const insights = getCategoryInsights();

    const getInsightColor = (type: string) => {
        switch (type) {
            case 'good': return '#4CAF50';
            case 'reminder': return '#FF9800';
            case 'neutral': return '#2196F3';
            default: return '#91483C';
        }
    };

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'good': return 'checkmark-circle';
            case 'reminder': return 'warning';
            case 'neutral': return 'information-circle';
            default: return 'help-circle';
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
                <Text style={styles.headerEmoji}>🐰📊</Text>
                <Text style={styles.headerTitle}>Category Analysis</Text>
                <Text style={styles.headerSubtitle}>
                    Your spending patterns with bunny wisdom
                </Text>
            </View>

            {insights.length === 0 ? (
                <View style={styles.noInsightsContainer}>
                    <Text style={styles.noInsightsEmoji}>🐰💤</Text>
                    <Text style={styles.noInsightsText}>
                        All categories are active! Your bunny sees balanced spending across all areas.
                    </Text>
                </View>
            ) : (
                <View style={styles.insightsContainer}>
                    {insights.map((insight, index) => (
                        <View key={`${insight.category}-${index}`} style={styles.insightCard}>
                            <View style={styles.insightHeader}>
                                <View style={[
                                    styles.categoryIcon,
                                    { backgroundColor: getInsightColor(insight.type) + '20' }
                                ]}>
                                    <Ionicons
                                        name={insight.icon as any}
                                        size={24}
                                        color={getInsightColor(insight.type)}
                                    />
                                </View>
                                <View style={styles.categoryInfo}>
                                    <Text style={styles.categoryName}>{insight.category}</Text>
                                    <View style={styles.statusContainer}>
                                        <Ionicons
                                            name={getInsightIcon(insight.type) as any}
                                            size={16}
                                            color={getInsightColor(insight.type)}
                                        />
                                        <Text style={[
                                            styles.statusText,
                                            { color: getInsightColor(insight.type) }
                                        ]}>
                                            {insight.type === 'good' ? 'Great job!' :
                                                insight.type === 'reminder' ? 'Check this' : 'Neutral'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.insightEmoji}>{insight.emoji}</Text>
                            </View>

                            <Text style={styles.insightText}>{insight.insight}</Text>

                            <TouchableOpacity
                                style={[
                                    styles.actionButton,
                                    { backgroundColor: getInsightColor(insight.type) }
                                ]}
                            >
                                <Text style={styles.actionButtonText}>{insight.actionText}</Text>
                            </TouchableOpacity>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>🐰 Bunny's Category Summary</Text>
                <Text style={styles.summaryText}>
                    You're actively spending in {Object.keys(analysis.categoryBreakdown).length} out of 8 categories.
                    {analysis.unusedCategories.length > 0
                        ? ` ${analysis.unusedCategories.length} categories haven't been used this month.`
                        : ' All categories are active!'
                    } Keep tracking to get better insights! 🥕
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
    noInsightsContainer: {
        alignItems: 'center',
        padding: 40,
    },
    noInsightsEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    noInsightsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    insightsContainer: {
        gap: 16,
        marginBottom: 20,
    },
    insightCard: {
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
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    categoryIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 4,
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusText: {
        marginLeft: 4,
        fontSize: 14,
        fontWeight: '600',
    },
    insightEmoji: {
        fontSize: 24,
    },
    insightText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
        marginBottom: 16,
    },
    actionButton: {
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
    summaryCard: {
        backgroundColor: '#fff0e8',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#91483C',
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
    },
    summaryText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
    },
});
