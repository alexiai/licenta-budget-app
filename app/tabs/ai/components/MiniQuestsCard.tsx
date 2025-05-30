import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis, ExpenseData } from './SmartAdviceSection';
import questsImg from '@assets/decor/aiQuests.png';

interface MiniQuestsCardProps {
    analysis: SpendingAnalysis;
    expenses: ExpenseData[];
}

interface Quest {
    id: string;
    title: string;
    description: string;
    emoji: string;
    difficulty: 'easy' | 'medium' | 'hard';
    reward: string;
    progress: number;
    target: number;
    completed: boolean;
    category?: string;
    type: 'spending' | 'saving' | 'tracking' | 'challenge';
}

export default function MiniQuestsCard({ analysis, expenses }: MiniQuestsCardProps): JSX.Element {
    const quests = generateQuests();

    function generateQuests(): Quest[] {
        const quests: Quest[] = [];
        const { subcategoryBreakdown, totalThisMonth, topCategories, categoryBreakdown, averageDailySpending } = analysis;

        const coffeeSpending = subcategoryBreakdown['Coffee'] || 0;
        if (coffeeSpending > 50) {
            quests.push({
                id: 'coffee-challenge',
                title: '☕ Bunny\'s Brew Challenge',
                description: 'Make coffee at home for 3 days straight! Save those carrots! 🥕',
                emoji: '🐰☕',
                difficulty: 'easy',
                reward: '50 Carrot Coins',
                progress: 0,
                target: 3,
                completed: false,
                category: 'Food & Drinks',
                type: 'challenge'
            });
        }

        const restaurantSpending = subcategoryBreakdown['Restaurant'] || 0;
        if (restaurantSpending > 200) {
            quests.push({
                id: 'cooking-challenge',
                title: '👨‍🍳 Master Chef Bunny',
                description: 'Cook at home for 5 days! Show those restaurants who\'s boss! 🍳',
                emoji: '🐰👨‍🍳',
                difficulty: 'medium',
                reward: '100 Carrot Coins',
                progress: 0,
                target: 5,
                completed: false,
                category: 'Food & Drinks',
                type: 'challenge'
            });
        }

        const taxiSpending = subcategoryBreakdown['Taxi'] || 0;
        if (taxiSpending > 100) {
            quests.push({
                id: 'walk-challenge',
                title: '🚶‍♂️ Hopping Bunny',
                description: 'Walk or use public transport for a week! Healthy bunny = happy bunny! 🐰',
                emoji: '🐰🚌',
                difficulty: 'medium',
                reward: '75 Carrot Coins',
                progress: 0,
                target: 7,
                completed: false,
                category: 'Transport',
                type: 'challenge'
            });
        }

        if (averageDailySpending > 80) {
            quests.push({
                id: 'daily-limit',
                title: '💰 Bunny Budget Master',
                description: 'Stay under 70 RON per day for 5 days! Control is key! 🗝️',
                emoji: '🐰💰',
                difficulty: 'hard',
                reward: '150 Carrot Coins',
                progress: 0,
                target: 5,
                completed: false,
                type: 'spending'
            });
        }

        const savingsSpending = categoryBreakdown['Savings'] || 0;
        if (savingsSpending < totalThisMonth * 0.1) {
            const suggestedSavings = Math.round(totalThisMonth * 0.1);
            quests.push({
                id: 'savings-challenge',
                title: '🥕 Carrot Stash Challenge',
                description: `Save ${suggestedSavings} RON this month! Every carrot counts for winter! ❄️`,
                emoji: '🐰🥕',
                difficulty: 'medium',
                reward: '200 Carrot Coins',
                progress: savingsSpending,
                target: suggestedSavings,
                completed: false,
                category: 'Savings',
                type: 'saving'
            });
        }

        const daysWithExpenses = new Set(expenses.map(exp => exp.date.split('T')[0])).size;
        const daysInMonth = new Date().getDate();
        if (daysWithExpenses < daysInMonth * 0.8) {
            quests.push({
                id: 'tracking-challenge',
                title: '📝 Bunny Bookkeeper',
                description: 'Track expenses every day for a week! Knowledge is power! 💪',
                emoji: '🐰📋',
                difficulty: 'easy',
                reward: '80 Carrot Coins',
                progress: 0,
                target: 7,
                completed: false,
                type: 'tracking'
            });
        }

        if (topCategories.length > 0 && topCategories[0].percentage > 40) {
            quests.push({
                id: 'balance-challenge',
                title: '⚖️ Balanced Bunny',
                description: `Reduce ${topCategories[0].category} spending by 20%! Balance is beautiful! ✨`,
                emoji: '🐰⚖️',
                difficulty: 'hard',
                reward: '180 Carrot Coins',
                progress: 0,
                target: 1,
                completed: false,
                category: topCategories[0].category,
                type: 'spending'
            });
        }

        const entertainmentSpending = categoryBreakdown['Entertainment'] || 0;
        if (entertainmentSpending > 150) {
            quests.push({
                id: 'free-fun',
                title: '🎮 Free Fun Bunny',
                description: 'Find 3 free activities this week! Best things in life are free! 🌳',
                emoji: '🐰🌳',
                difficulty: 'easy',
                reward: '60 Carrot Coins',
                progress: 0,
                target: 3,
                completed: false,
                category: 'Entertainment',
                type: 'challenge'
            });
        }

        return quests.slice(0, 6);
    }

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return '#4CAF50';
            case 'medium': return '#FF9800';
            case 'hard': return '#F44336';
            default: return '#91483C';
        }
    };

    const getDifficultyIcon = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'leaf';
            case 'medium': return 'flash';
            case 'hard': return 'flame';
            default: return 'star';
        }
    };

    const getQuestTypeIcon = (type: string) => {
        switch (type) {
            case 'spending': return 'wallet';
            case 'saving': return 'save';
            case 'tracking': return 'create';
            case 'challenge': return 'trophy';
            default: return 'star';
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={questsImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Mini Quests</Text>
                    <Text style={styles.headerSubtitle}>
                        Fun challenges to improve your financial habits
                    </Text>
                </View>
            </View>

            {quests.length === 0 ? (
                <View style={styles.noQuestsContainer}>
                    <Text style={styles.noQuestsEmoji}>🐰😴</Text>
                    <Text style={styles.noQuestsText}>
                        Your spending is so good that bunny can’t think of any challenges right now! 🥕
                    </Text>
                </View>
            ) : (
                <View style={styles.questsContainer}>
                    {quests.map((quest) => (
                        <View key={quest.id} style={styles.questCard}>
                            <View style={styles.questHeader}>
                                <View style={styles.questTitleRow}>
                                    <Text style={styles.questEmoji}>{quest.emoji}</Text>
                                    <Text style={styles.questTitle}>{quest.title}</Text>
                                </View>
                                <View style={styles.questMeta}>
                                    <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(quest.difficulty) }]}>
                                        <Ionicons name={getDifficultyIcon(quest.difficulty) as any} size={12} color="white" />
                                        <Text style={styles.difficultyText}>{quest.difficulty.toUpperCase()}</Text>
                                    </View>
                                    <View style={styles.typeBadge}>
                                        <Ionicons name={getQuestTypeIcon(quest.type) as any} size={12} color="#91483C" />
                                    </View>
                                </View>
                            </View>
                            <Text style={styles.questDescription}>{quest.description}</Text>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.motivationCard}>
                <Text style={styles.motivationTitle}>🐰💡 Smart Bunny Tips</Text>
                <Text style={styles.motivationText}>
                    Complete these helpful tasks and become a wiser spender—no Carrot Coins needed!
                </Text>
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
    noQuestsContainer: {
        alignItems: 'center',
        padding: 40,
    },
    noQuestsEmoji: { fontSize: 48, marginBottom: 16 },
    noQuestsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    questsContainer: { gap: 16, padding: 16 },
    questCard: {
        backgroundColor: '#FFE8CC', // portocaliu cald pastel
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#F5CBA7',
        shadowColor: '#FF9800',
        shadowOpacity: 0.12,
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        elevation: 4,
        marginBottom: 12,
    },

    questHeader: { marginBottom: 12 },
    questTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    questEmoji: { fontSize: 24, marginRight: 8 },
    questTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        flex: 1,
    },
    questMeta: {
        flexDirection: 'row',
        gap: 8,
    },
    difficultyBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    difficultyText: { fontSize: 10, fontWeight: 'bold', color: 'white' },
    typeBadge: {
        backgroundColor: '#fff0e8',
        padding: 6,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    questDescription: {
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
        marginBottom: 8,
    },
    motivationCard: {
        backgroundColor: '#fff0e8',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#91483C',
        margin: 16,
    },
    motivationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
    },
    motivationText: {
        fontSize: 16,
        color: '#333',
        lineHeight: 22,
    },
});
