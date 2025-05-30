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
import categoryImg from '@assets/decor/aiCategories.png';

interface UnusedCategoriesCardProps {
    analysis?: SpendingAnalysis;
}

interface CategoryInsight {
    category: string;
    icon: string;
    insight: string;
    emoji: string;
    type: 'good' | 'neutral' | 'reminder';
}

export default function UnusedCategoriesCard({ analysis }: UnusedCategoriesCardProps): JSX.Element {
    const getCategoryInsights = (): CategoryInsight[] => {
        const insights: CategoryInsight[] = [];
        if (!analysis) return insights;

        const { unusedCategories = [], categoryBreakdown = {} } = analysis;

        const categoryData = {
            'Health': {
                icon: 'medical',
                good: 'Amazing! No health expenses this month! Your bunny is proud of your healthy lifestyle! 🐰💚',
                reminder: 'No health expenses tracked. Don\'t forget routine checkups - even bunnies need their carrot vitamins! 🐰🥕',
                emoji: '🐰🏥',
            },
            'Entertainment': {
                icon: 'game-controller',
                good: 'Wow! No entertainment spending! You\'re focusing like a determined bunny! 🐰🎯',
                reminder: 'No fun expenses? Remember to treat yourself sometimes - all work and no play makes bunny sad! 🐰😢',
                emoji: '🐰🎮',
            },
            'Lifestyle': {
                icon: 'shirt',
                good: 'No lifestyle purchases! Your bunny appreciates your minimalist approach! 🐰✨',
                reminder: 'No lifestyle spending tracked. Taking care of yourself is important too! 🐰💅',
                emoji: '🐰👗',
            },
            'Transport': {
                icon: 'car',
                good: 'No transport costs! Walking bunny style is eco-friendly and healthy! 🐰🌱',
                reminder: 'No transport expenses? Make sure you\'re tracking all your travel costs! 🐰🚌',
                emoji: '🐰🚗',
            },
            'Housing': {
                icon: 'home',
                good: 'No housing costs this month! Living rent-free like a wild bunny! 🐰🏠',
                reminder: 'No housing expenses tracked. Don\'t forget utilities and rent! 🐰🏡',
                emoji: '🐰🏠',
            },
            'Food & Drinks': {
                icon: 'restaurant',
                good: 'No food expenses? Are you living on carrots and water like a true bunny? 🐰🥕',
                reminder: 'No food costs tracked? That\'s unusual - even bunnies need their meals! 🐰🍽️',
                emoji: '🐰🍽️',
            },
            'Savings': {
                icon: 'wallet',
                good: 'Great savings momentum from last month! Your carrot fund is growing! 🐰💰',
                reminder: 'No savings this month? Every carrot saved counts for the future! 🐰🥕',
                emoji: '🐰💰',
            },
            'Other': {
                icon: 'ellipsis-horizontal',
                good: 'No miscellaneous expenses! Your bunny loves organized spending! 🐰📋',
                reminder: 'No other expenses tracked. Sometimes unexpected costs hop in! 🐰❓',
                emoji: '🐰📦',
            },
        };

        unusedCategories.forEach(category => {
            const data = categoryData[category as keyof typeof categoryData];
            if (data) {
                let type: 'good' | 'neutral' | 'reminder' = 'neutral';
                let insight = '';

                if (['Food & Drinks', 'Housing'].includes(category)) {
                    type = 'reminder';
                    insight = data.reminder;
                } else if (category === 'Health') {
                    type = 'good';
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
                    type,
                });
            }
        });

        Object.entries(categoryBreakdown).forEach(([category, amount]) => {
            if (amount < 50 && !unusedCategories.includes(category)) {
                const data = categoryData[category as keyof typeof categoryData];
                if (data) {
                    insights.push({
                        category,
                        icon: data.icon,
                        insight: `Only ${amount.toFixed(0)} RON on ${category} this month! Your bunny is impressed by your restraint! 🐰👍`,
                        emoji: data.emoji,
                        type: 'good',
                    });
                }
            }
        });

        return insights.slice(0, 6);
    };

    const insights = getCategoryInsights();

    const getInsightColor = (type: string) => {
        switch (type) {
            case 'good': return '#FFB84C';
            case 'reminder': return '#FF7043';
            case 'neutral': return '#FDD835';
            default: return '#CCC';
        }
    };

    const getInsightIcon = (type: string) => {
        switch (type) {
            case 'good': return 'happy';
            case 'reminder': return 'alert-circle';
            case 'neutral': return 'information-circle';
            default: return 'help';
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={categoryImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Category Analysis</Text>
                    <Text style={styles.headerSubtitle}>Your spending patterns with bunny wisdom</Text>
                </View>
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
                                <View style={[styles.categoryIcon, { backgroundColor: getInsightColor(insight.type) + '33' }]}>
                                    <Ionicons
                                        name={insight.icon as any}
                                        size={22}
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
                                        <Text style={[styles.statusText, { color: getInsightColor(insight.type) }]}>
                                            {insight.type === 'good' ? 'Awesome!' :
                                                insight.type === 'reminder' ? 'Heads up!' : 'Info'}
                                        </Text>
                                    </View>
                                </View>
                                <Text style={styles.insightEmoji}>{insight.emoji}</Text>
                            </View>

                            <Text style={styles.insightText}>{insight.insight}</Text>
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
                        : ' All categories are active!'}
                    Keep tracking to get better insights! 🥕
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
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
    headerText: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Fredoka',
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
        paddingHorizontal: 16,
    },
    insightCard: {
        backgroundColor: '#FFF6EE',
        borderRadius: 18,
        padding: 20,
        borderWidth: 2,
        borderColor: '#FFD9B5',
        shadowColor: '#FFB84C',
        shadowOpacity: 0.2,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    categoryIcon: {
        width: 42,
        height: 42,
        borderRadius: 21,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    statusContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 2,
    },
    statusText: {
        marginLeft: 4,
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Fredoka',
    },
    insightEmoji: {
        fontSize: 24,
    },
    insightText: {
        fontSize: 15,
        color: '#333',
        lineHeight: 22,
        fontFamily: 'Fredoka',
    },
    summaryCard: {
        backgroundColor: '#FFF0E5',
        borderRadius: 20,
        padding: 20,
        margin: 16,
        borderColor: '#FFB84C',
        borderWidth: 2,
    },
    summaryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 8,
    },
    summaryText: {
        fontSize: 15,
        color: '#444',
        lineHeight: 22,
        fontFamily: 'Fredoka',
    },
});
