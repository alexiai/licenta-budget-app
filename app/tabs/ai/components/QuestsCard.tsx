import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SpendingAnalysis } from './SmartAdviceSection';
import { LinearGradient } from 'expo-linear-gradient';
import questsImg from '@assets/decor/aiQuests.png';
import { auth } from '@lib/firebase';
import QuestService from '../../../services/QuestService';

interface Quest {
    id: string;
    title: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly' | 'achievement';
    reward: number;
    progress: number;
    target: number;
    status: 'active' | 'completed' | 'failed' | 'locked' | 'claimed';
    category?: string;
    endDate?: Date;
    streak?: number;
    level: number;
    claimedAt?: Date;
}

interface QuestsCardProps {
    analysis: SpendingAnalysis | null;
    onQuestComplete?: (questId: string) => void;
}

export default function QuestsCard({ analysis, onQuestComplete }: QuestsCardProps): JSX.Element {
    const [expandedQuest, setExpandedQuest] = useState<string | null>(null);
    const [claimedQuests, setClaimedQuests] = useState<string[]>([]);

    useEffect(() => {
        loadClaimedQuests();
    }, []);

    const loadClaimedQuests = async () => {
        const user = auth.currentUser;
        if (!user || !analysis) return;

        try {
            const progress = await QuestService.getUserProgress(user.uid);
            setClaimedQuests(progress.completedQuests || []);
        } catch (error) {
            console.error('Error loading claimed quests:', error);
        }
    };

    if (!analysis) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Image source={questsImg} style={styles.image} resizeMode="contain" />
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Daily Quests</Text>
                        <Text style={styles.headerSubtitle}>Loading your quests...</Text>
                    </View>
                </View>
            </View>
        );
    }

    const generateQuests = (): Quest[] => {
        const quests: Quest[] = [];
        const {
            categoryBreakdown,
            spendingPatterns,
            averageDailySpending,
            totalThisMonth
        } = analysis;

        // Daily Quests
        quests.push({
            id: 'daily-spending-limit',
            title: 'Daily Budget Master',
            description: `Keep today's spending under ${averageDailySpending.toFixed(0)} RON`,
            type: 'daily',
            reward: 50,
            progress: spendingPatterns.todayTotal || 0,
            target: averageDailySpending,
            status: claimedQuests.includes('daily-spending-limit') ? 'claimed' : 'active',
            level: 1
        });

        // Weekly Quests
        if (spendingPatterns.weekdayVsWeekend.weekend > spendingPatterns.weekdayVsWeekend.weekday * 0.4) {
            quests.push({
                id: 'weekend-warrior',
                title: 'Weekend Warrior',
                description: 'Reduce weekend spending by finding free activities',
                type: 'weekly',
                reward: 100,
                progress: spendingPatterns.weekdayVsWeekend.weekend,
                target: spendingPatterns.weekdayVsWeekend.weekday * 0.4,
                status: claimedQuests.includes('weekend-warrior') ? 'claimed' : 'active',
                level: 2
            });
        }

        // Monthly Quests
        const essentialSpending = spendingPatterns.essentialVsFlexible.essential;
        const flexibleSpending = spendingPatterns.essentialVsFlexible.flexible;
        
        if (flexibleSpending > essentialSpending * 0.6) {
            quests.push({
                id: 'flexible-spending',
                title: 'Balance Master',
                description: 'Keep flexible spending below 60% of essential spending',
                type: 'monthly',
                reward: 200,
                progress: flexibleSpending,
                target: essentialSpending * 0.6,
                status: claimedQuests.includes('flexible-spending') ? 'claimed' : 'active',
                level: 3
            });
        }

        // Achievement Quests
        Object.entries(categoryBreakdown).forEach(([category, amount]) => {
            const questId = `category-${category}`;
            if (amount > totalThisMonth * 0.3) {
                quests.push({
                    id: questId,
                    title: `${category} Optimizer`,
                    description: `Reduce ${category} spending to under 30% of total budget`,
                    type: 'achievement',
                    reward: 150,
                    progress: amount,
                    target: totalThisMonth * 0.3,
                    status: claimedQuests.includes(questId) ? 'claimed' : 'active',
                    category,
                    level: 2
                });
            }
        });

        return quests.sort((a, b) => {
            const typeOrder = { daily: 0, weekly: 1, monthly: 2, achievement: 3 };
            return typeOrder[a.type] - typeOrder[b.type];
        });
    };

    const handleQuestComplete = async (questId: string) => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Error', 'You must be logged in to complete quests.');
            return;
        }

        try {
            // Check if already claimed
            if (await QuestService.isQuestClaimed(user.uid, questId)) {
                Alert.alert('Already Claimed', 'You have already claimed this quest!');
                return;
            }

            // Get the quest
            const quest = generateQuests().find(q => q.id === questId);
            if (!quest) return;

            // Update quest progress
            await QuestService.updateQuestProgress(user.uid, questId, quest.progress);

            // Update local state
            setClaimedQuests(prev => [...prev, questId]);

            // Call parent handler if provided
            onQuestComplete?.(questId);

            // Refresh claimed quests
            await loadClaimedQuests();
        } catch (error) {
            console.error('Error completing quest:', error);
            Alert.alert('Error', 'Failed to complete quest. Please try again.');
        }
    };

    const getQuestColor = (type: string): [string, string] => {
        switch (type) {
            case 'daily':
                return ['#4CAF50', '#66BB6A'];
            case 'weekly':
                return ['#2196F3', '#42A5F5'];
            case 'monthly':
                return ['#9C27B0', '#BA68C8'];
            default:
                return ['#FF9800', '#FFA726'];
        }
    };

    const getProgressPercentage = (quest: Quest) => {
        return Math.min(100, (quest.progress / quest.target) * 100);
    };

    const getQuestStatus = (quest: Quest) => {
        if (quest.status === 'claimed') return 'Claimed';
        if (quest.status === 'completed') return 'Ready to claim!';
        const progress = getProgressPercentage(quest);
        return `${progress.toFixed(0)}% Complete`;
    };

    const quests = generateQuests();

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={questsImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Daily Quests</Text>
                    <Text style={styles.headerSubtitle}>
                        Complete quests to earn rewards
                    </Text>
                </View>
            </View>

            {quests.map((quest) => (
                <TouchableOpacity
                    key={quest.id}
                    style={styles.questCard}
                    onPress={() => setExpandedQuest(expandedQuest === quest.id ? null : quest.id)}
                >
                    <LinearGradient
                        colors={getQuestColor(quest.type)}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.questBadge}
                    >
                        <Text style={styles.questType}>{quest.type}</Text>
                    </LinearGradient>

                    <View style={styles.questHeader}>
                        <View style={styles.questTitleRow}>
                            <Text style={styles.questTitle}>{quest.title}</Text>
                            <Text style={styles.questReward}>+{quest.reward}</Text>
                        </View>
                        <Text style={styles.questDescription}>{quest.description}</Text>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${getProgressPercentage(quest)}%`,
                                        backgroundColor: getQuestColor(quest.type)[0]
                                    }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>{getQuestStatus(quest)}</Text>
                    </View>

                    {expandedQuest === quest.id && (
                        <View style={styles.questDetails}>
                            <View style={styles.detailRow}>
                                <Text style={styles.detailLabel}>Level:</Text>
                                <Text style={styles.detailValue}>{quest.level}</Text>
                            </View>
                            {quest.streak && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Streak:</Text>
                                    <Text style={styles.detailValue}>{quest.streak} days</Text>
                                </View>
                            )}
                            {quest.endDate && (
                                <View style={styles.detailRow}>
                                    <Text style={styles.detailLabel}>Ends:</Text>
                                    <Text style={styles.detailValue}>
                                        {new Date(quest.endDate).toLocaleDateString()}
                                    </Text>
                                </View>
                            )}
                            {quest.status !== 'claimed' && quest.progress >= quest.target && (
                                <TouchableOpacity
                                    style={styles.claimButton}
                                    onPress={() => handleQuestComplete(quest.id)}
                                >
                                    <Text style={styles.claimButtonText}>Claim Reward</Text>
                                </TouchableOpacity>
                            )}
                            {quest.status === 'claimed' && (
                                <View style={styles.claimedBadge}>
                                    <Text style={styles.claimedText}>Reward Claimed! 🎉</Text>
                                </View>
                            )}
                        </View>
                    )}
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: '#FFF2D8',
        borderRadius: 16,
        padding: 12,
    },
    image: {
        width: 60,
        height: 60,
        marginRight: 12,
    },
    headerText: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#8B6914',
        fontFamily: 'Fredoka',
    },
    questCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    questBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    questType: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontFamily: 'Fredoka',
    },
    questHeader: {
        marginBottom: 16,
    },
    questTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    questTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        flex: 1,
    },
    questReward: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#4CAF50',
        fontFamily: 'Fredoka',
    },
    questDescription: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Fredoka',
        lineHeight: 20,
    },
    progressContainer: {
        marginBottom: 8,
    },
    progressBar: {
        height: 8,
        backgroundColor: '#F5F5F5',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 4,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#666666',
        fontFamily: 'Fredoka',
        textAlign: 'right',
    },
    questDetails: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#F5F5F5',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Fredoka',
    },
    detailValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    claimButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    claimButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
    claimedBadge: {
        backgroundColor: '#E8F5E9',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    claimedText: {
        color: '#4CAF50',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
}); 