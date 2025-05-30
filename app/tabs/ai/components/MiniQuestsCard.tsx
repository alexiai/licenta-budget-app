
import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis, ExpenseData } from './SmartAdviceSection';

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
    const [completedQuests, setCompletedQuests] = useState<string[]>([]);

    const generateQuests = (): Quest[] => {
        const quests: Quest[] = [];
        const { subcategoryBreakdown, totalThisMonth, topCategories } = analysis;

        // Coffee Challenge
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

        // No Restaurant Challenge
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

        // Transport Challenge
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

        // Daily Spending Limit
        if (analysis.averageDailySpending > 80) {
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

        // Savings Challenge
        const savingsSpending = analysis.categoryBreakdown['Savings'] || 0;
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

        // Expense Tracking Challenge
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

        // Category Balance Challenge
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

        // Free Fun Challenge
        const entertainmentSpending = analysis.categoryBreakdown['Entertainment'] || 0;
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

        return quests.slice(0, 6); // Limit to 6 quests
    };

    const quests = generateQuests();

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

    const handleQuestAction = (quest: Quest) => {
        if (quest.completed) {
            Alert.alert(
                '🐰 Quest Completed!',
                `You've already completed this quest and earned ${quest.reward}!`,
                [{ text: 'Yay! 🥕', style: 'default' }]
            );
            return;
        }

        Alert.alert(
            `🐰 ${quest.title}`,
            `${quest.description}\n\nReward: ${quest.reward}\n\nAre you ready to start this quest?`,
            [
                { text: 'Not yet 🐰', style: 'cancel' },
                {
                    text: 'Let\'s hop! 🥕',
                    style: 'default',
                    onPress: () => startQuest(quest)
                }
            ]
        );
    };

    const startQuest = (quest: Quest) => {
        // In a real app, you'd save this to a database
        Alert.alert(
            '🐰 Quest Started!',
            `Great! Your bunny is cheering for you! Remember to track your progress and come back to claim your reward! 🥕`,
            [{ text: 'I got this! 💪', style: 'default' }]
        );
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
            <View style={styles.header}>
                <Text style={styles.headerEmoji}>🐰🎯</Text>
                <Text style={styles.headerTitle}>Mini Quests</Text>
                <Text style={styles.headerSubtitle}>
                    Fun challenges to improve your financial habits
                </Text>
            </View>

            {quests.length === 0 ? (
                <View style={styles.noQuestsContainer}>
                    <Text style={styles.noQuestsEmoji}>🐰😴</Text>
                    <Text style={styles.noQuestsText}>
                        Your spending is so good that bunny can't think of any challenges right now!
                        Keep it up and check back later! 🥕
                    </Text>
                </View>
            ) : (
                <View style={styles.questsContainer}>
                    {quests.map((quest) => (
                        <TouchableOpacity
                            key={quest.id}
                            style={styles.questCard}
                            onPress={() => handleQuestAction(quest)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.questHeader}>
                                <View style={styles.questInfo}>
                                    <View style={styles.questTitleRow}>
                                        <Text style={styles.questEmoji}>{quest.emoji}</Text>
                                        <Text style={styles.questTitle}>{quest.title}</Text>
                                    </View>
                                    <View style={styles.questMeta}>
                                        <View style={[
                                            styles.difficultyBadge,
                                            { backgroundColor: getDifficultyColor(quest.difficulty) }
                                        ]}>
                                            <Ionicons
                                                name={getDifficultyIcon(quest.difficulty) as any}
                                                size={12}
                                                color="white"
                                            />
                                            <Text style={styles.difficultyText}>
                                                {quest.difficulty.toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.typeBadge}>
                                            <Ionicons
                                                name={getQuestTypeIcon(quest.type) as any}
                                                size={12}
                                                color="#91483C"
                                            />
                                        </View>
                                    </View>
                                </View>
                            </View>

                            <Text style={styles.questDescription}>{quest.description}</Text>

                            {quest.progress > 0 && (
                                <View style={styles.progressContainer}>
                                    <View style={styles.progressBar}>
                                        <View
                                            style={[
                                                styles.progressFill,
                                                { width: `${(quest.progress / quest.target) * 100}%` }
                                            ]}
                                        />
                                    </View>
                                    <Text style={styles.progressText}>
                                        {quest.progress}/{quest.target}
                                    </Text>
                                </View>
                            )}

                            <View style={styles.questFooter}>
                                <View style={styles.rewardContainer}>
                                    <Ionicons name="gift" size={16} color="#FF9800" />
                                    <Text style={styles.rewardText}>{quest.reward}</Text>
                                </View>
                                <View style={styles.actionButton}>
                                    <Text style={styles.actionButtonText}>
                                        {quest.completed ? 'Completed!' : 'Start Quest'}
                                    </Text>
                                    <Ionicons
                                        name={quest.completed ? "checkmark-circle" : "arrow-forward"}
                                        size={16}
                                        color="white"
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <View style={styles.motivationCard}>
                <Text style={styles.motivationTitle}>🐰💪 Bunny's Motivation</Text>
                <Text style={styles.motivationText}>
                    Every small step counts! Complete quests to earn Carrot Coins and build better financial habits.
                    Remember, even the longest journey starts with a single hop! 🥕✨
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
    noQuestsContainer: {
        alignItems: 'center',
        padding: 40,
    },
    noQuestsEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    noQuestsText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    questsContainer: {
        gap: 16,
        marginBottom: 20,
    },
    questCard: {
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
    questHeader: {
        marginBottom: 12,
    },
    questInfo: {
        flex: 1,
    },
    questTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    questEmoji: {
        fontSize: 24,
        marginRight: 8,
    },
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
    difficultyText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: 'white',
    },
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
        marginBottom: 16,
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#f0f0f0',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'right',
    },
    questFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    rewardContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3E0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    rewardText: {
        marginLeft: 6,
        fontSize: 14,
        fontWeight: '600',
        color: '#FF9800',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#91483C',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    actionButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    motivationCard: {
        backgroundColor: '#fff0e8',
        borderRadius: 16,
        padding: 20,
        borderWidth: 2,
        borderColor: '#91483C',
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
