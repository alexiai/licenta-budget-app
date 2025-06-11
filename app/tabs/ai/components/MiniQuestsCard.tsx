import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis, ExpenseData } from './SmartAdviceSection';
import { auth, db } from '../../../../lib/firebase';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import questsImg from '@assets/decor/aiQuests.png';

interface MiniQuestsCardProps {
    analysis?: SpendingAnalysis | null;
    expenses: ExpenseData[];
}

interface Quest {
    id: string;
    title: string;
    description: string;
    target: number;
    current: number;
    type: 'spending_limit' | 'category_avoid' | 'save_target' | 'daily_limit' | 'streak' | 'category_balance' | 'smart_saving';
    category?: string;
    emoji: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    timeframe: 'daily' | 'weekly' | 'monthly';
    isCompleted: boolean;
    streak?: number;
    expiresAt?: Date;
    milestones?: {
        target: number;
        reward: number;
        achieved: boolean;
    }[];
}

interface Badge {
    id: string;
    name: string;
    emoji: string;
    description: string;
    requirement: number;
    earned: boolean;
    earnedDate?: Date;
}

interface UserProgress {
    completedQuests: string[];
    totalPoints: number;
    badges: Badge[];
    questsCompleted: number;
    currentStreak: number;
    lastCompletedDate?: string;
    level: number;
    xp: number;
}

export default function MiniQuestsCard({ analysis, expenses }: MiniQuestsCardProps): JSX.Element {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [userProgress, setUserProgress] = useState<UserProgress>({
        completedQuests: [],
        totalPoints: 0,
        badges: [],
        questsCompleted: 0,
        currentStreak: 0,
        level: 1,
        xp: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadUserProgress = async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    setLoading(false);
                    return;
                }

                const userProgressRef = doc(db, 'userProgress', user.uid);
                const userProgressDoc = await getDoc(userProgressRef);
                const progress = userProgressDoc.data() as UserProgress;

                if (progress) {
                    setUserProgress(progress);
                }

                // Generate quests based on user's spending patterns
                const generatedQuests = generateQuests(expenses, analysis || null);
                setQuests(generatedQuests);

                setLoading(false);
            } catch (error) {
                console.error('Error loading user progress:', error);
                setLoading(false);
            }
        };

        loadUserProgress();
    }, [expenses, analysis]);

    const generateQuests = (expenses: ExpenseData[], analysis: SpendingAnalysis | null): Quest[] => {
        const quests: Quest[] = [];
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        // Daily spending limit quest
        if (analysis) {
            const dailyLimit = Math.round(analysis.averageDailySpending * 0.8);
            quests.push({
                id: 'daily-limit',
                title: 'Daily Budget Master',
                description: `Keep today's spending under ${dailyLimit} RON`,
                target: dailyLimit,
                current: analysis.spendingPatterns.todayTotal,
                type: 'daily_limit',
                emoji: '🎯',
                difficulty: 'medium',
                points: 50,
                timeframe: 'daily',
                isCompleted: analysis.spendingPatterns.todayTotal <= dailyLimit
            });
        }

        // Category avoidance quest
        const highSpendingCategory = analysis?.topCategories[0]?.category;
        if (highSpendingCategory) {
            quests.push({
                id: 'category-avoid',
                title: `Skip ${highSpendingCategory} Today`,
                description: `Avoid spending in the ${highSpendingCategory} category today`,
                target: 0,
                current: expenses.filter(e => 
                    e.category === highSpendingCategory && 
                    e.date.split('T')[0] === today
                ).length,
                type: 'category_avoid',
                emoji: '🚫',
                difficulty: 'hard',
                points: 100,
                timeframe: 'daily',
                isCompleted: false
            });
        }

        // Weekly saving target
        if (analysis) {
            const weeklyTarget = Math.round(analysis.weeklyStats.lastWeek * 0.9);
            quests.push({
                id: 'weekly-save',
                title: 'Weekly Saver',
                description: `Keep this week's spending under ${weeklyTarget} RON`,
                target: weeklyTarget,
                current: analysis.weeklyStats.currentWeek,
                type: 'save_target',
                emoji: '💰',
                difficulty: 'medium',
                points: 75,
                timeframe: 'weekly',
                isCompleted: analysis.weeklyStats.currentWeek <= weeklyTarget
            });
        }

        // Category balance quest
        if (analysis) {
            const essentialRatio = analysis.spendingPatterns.essentialVsFlexible.essential / 
                (analysis.spendingPatterns.essentialVsFlexible.essential + analysis.spendingPatterns.essentialVsFlexible.flexible);
            
            if (essentialRatio < 0.5) {
                quests.push({
                    id: 'category-balance',
                    title: 'Essential Balance',
                    description: 'Increase essential spending to 50% of total',
                    target: 50,
                    current: Math.round(essentialRatio * 100),
                    type: 'category_balance',
                    emoji: '⚖️',
                    difficulty: 'hard',
                    points: 100,
                    timeframe: 'monthly',
                    isCompleted: essentialRatio >= 0.5
                });
            }
        }

        // Smart saving quest
        if (analysis) {
            const monthlyTarget = Math.round(analysis.totalThisMonth * 0.85);
            quests.push({
                id: 'smart-save',
                title: 'Smart Saver',
                description: `Keep this month's spending under ${monthlyTarget} RON`,
                target: monthlyTarget,
                current: analysis.totalThisMonth,
                type: 'smart_saving',
                emoji: '🧠',
                difficulty: 'hard',
                points: 150,
                timeframe: 'monthly',
                isCompleted: analysis.totalThisMonth <= monthlyTarget
            });
        }

        return quests;
    };

    const canCompleteQuest = (quest: Quest): boolean => {
        if (quest.isCompleted) return false;
        return quest.current >= quest.target;
    };

    const completeQuest = async (quest: Quest) => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to complete quests.');
                return;
            }

            const userProgressRef = doc(db, 'userProgress', user.uid);
            const userProgressDoc = await getDoc(userProgressRef);
            const currentProgress = userProgressDoc.data() as UserProgress || {
                completedQuests: [],
                totalPoints: 0,
                badges: [],
                questsCompleted: 0,
                currentStreak: 0,
                level: 1,
                xp: 0
            };

            // Update user progress
            const updatedProgress: UserProgress = {
                ...currentProgress,
                completedQuests: [...currentProgress.completedQuests, quest.id],
                totalPoints: currentProgress.totalPoints + quest.points,
                questsCompleted: currentProgress.questsCompleted + 1,
                currentStreak: quest.type === 'streak' ? currentProgress.currentStreak + 1 : currentProgress.currentStreak,
                lastCompletedDate: new Date().toISOString().split('T')[0]
            };

            // Check for badge unlocks
            const updatedBadges = currentProgress.badges.map(badge => {
                if (!badge.earned && updatedProgress.questsCompleted >= badge.requirement) {
                    return {
                        ...badge,
                        earned: true,
                        earnedDate: new Date()
                    };
                }
                return badge;
            });

            updatedProgress.badges = updatedBadges;

            // Update level and XP
            const xpGained = quest.points * 10;
            const newXP = currentProgress.xp + xpGained;
            const xpPerLevel = 1000;
            const newLevel = Math.floor(newXP / xpPerLevel) + 1;

            updatedProgress.xp = newXP;
            updatedProgress.level = newLevel;

            // Save to Firestore
            await setDoc(userProgressRef, updatedProgress);

            // Update local state
            setUserProgress(updatedProgress);
            setQuests(quests.map(q => 
                q.id === quest.id ? { ...q, isCompleted: true } : q
            ));

            // Show completion message
            Alert.alert(
                '🎉 Quest Completed!',
                `Congratulations! You've earned ${quest.points} CarrotCoins and ${xpGained} XP!${
                    newLevel > currentProgress.level ? `\n\n🌟 Level Up! You're now level ${newLevel}!` : ''
                }`,
                [{ text: 'OK', style: 'default' }]
            );
        } catch (error) {
            console.error('Error completing quest:', error);
            Alert.alert('Error', 'Failed to complete quest. Please try again.');
        }
    };

    const getProgressWidth = (quest: Quest): number => {
        if (quest.isCompleted) return 100;
        if (quest.target === 0) return 0;
        const progress = (quest.current / quest.target) * 100;
        return Math.min(Math.max(progress, 0), 100);
    };

    const getProgressColor = (quest: Quest): string => {
        if (quest.isCompleted) return '#4CAF50';
        const progress = getProgressWidth(quest);
        if (progress >= 75) return '#4CAF50';
        if (progress >= 50) return '#FF8F00';
        if (progress >= 25) return '#F97850';
        return '#4ECDC4';
    };

    const getTimeframeText = (timeframe: string): string => {
        switch (timeframe) {
            case 'daily':
                return 'Daily Quest';
            case 'weekly':
                return 'Weekly Quest';
            case 'monthly':
                return 'Monthly Quest';
            default:
                return 'Quest';
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Image source={questsImg} style={styles.image} resizeMode="contain" />
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Bunny Quests</Text>
                        <Text style={styles.headerSubtitle}>Loading your challenges...</Text>
                    </View>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#91483C" />
                    <Text style={styles.loadingText}>Loading your quests...</Text>
                </View>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={questsImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Bunny Quests</Text>
                    <Text style={styles.headerSubtitle}>
                        Complete challenges to earn CarrotCoins!
                    </Text>
                </View>
            </View>

            {/* Progress Overview */}
            <View style={styles.progressCard}>
                <View style={styles.progressHeader}>
                    <Text style={styles.progressTitle}>🏆 Your Progress</Text>
                    <Text style={styles.carrotCoins}>🥕 {userProgress.totalPoints} CarrotCoins</Text>
                </View>
                <View style={styles.progressStats}>
                    <Text style={styles.progressStat}>
                        Quests Completed: {userProgress.questsCompleted}
                    </Text>
                    <Text style={styles.progressStat}>
                        Badges Earned: {userProgress.badges.filter(b => b.earned).length}
                    </Text>
                </View>
            </View>

            {/* Active Quests */}
            <View style={styles.questsContainer}>
                {quests.map((quest) => (
                    <View key={quest.id} style={[
                        styles.questCard,
                        quest.isCompleted && styles.completedQuestCard
                    ]}>
                        <View style={styles.questHeader}>
                            <Text style={styles.questEmoji}>{quest.emoji}</Text>
                            <View style={styles.questInfo}>
                                <Text style={styles.questTitle}>{quest.title}</Text>
                                <Text style={styles.questDescription}>{quest.description}</Text>
                            </View>
                            <View style={styles.questPoints}>
                                <Text style={styles.pointsText}>🥕{quest.points}</Text>
                            </View>
                        </View>

                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: `${getProgressWidth(quest)}%`,
                                            backgroundColor: getProgressColor(quest)
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {quest.type === 'category_avoid' || quest.type === 'spending_limit'
                                    ? `${quest.current}/${quest.target}`
                                    : `${quest.current}/${quest.target}`}
                            </Text>
                        </View>

                        {quest.isCompleted ? (
                            <View style={styles.completedBadge}>
                                <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                                <Text style={styles.completedText}>Completed! 🎉</Text>
                            </View>
                        ) : (
                            <TouchableOpacity
                                style={[
                                    styles.questButton,
                                    canCompleteQuest(quest) && styles.questButtonActive
                                ]}
                                onPress={() => canCompleteQuest(quest) && completeQuest(quest)}
                                disabled={!canCompleteQuest(quest)}
                            >
                                <Text style={[
                                    styles.questButtonText,
                                    canCompleteQuest(quest) && styles.questButtonTextActive
                                ]}>
                                    {canCompleteQuest(quest) ? 'Claim Reward! 🎁' : 'In Progress...'}
                                </Text>
                            </TouchableOpacity>
                        )}

                        <Text style={styles.timeframe}>
                            {getTimeframeText(quest.timeframe)}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Badges Section */}
            {userProgress.badges && userProgress.badges.length > 0 && (
                <View style={styles.badgesContainer}>
                    <Text style={styles.badgesTitle}>🏆 Your Badges</Text>
                    <View style={styles.badgesGrid}>
                        {userProgress.badges.map((badge) => (
                            <View key={badge.id} style={[
                                styles.badgeItem,
                                badge.earned && styles.earnedBadge
                            ]}>
                                <Text style={[
                                    styles.badgeEmoji,
                                    !badge.earned && styles.unearnedBadge
                                ]}>
                                    {badge.emoji}
                                </Text>
                                <Text style={styles.badgeName}>{badge.name}</Text>
                                <Text style={styles.badgeRequirement}>
                                    {badge.earned ? '✅ Earned!' : `${badge.requirement} quests`}
                                </Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    image: {
        width: 120,
        height: 120,
        marginRight: 16,
        alignSelf: 'center',
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
    progressCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#f0f0f0',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    progressTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2E7D32',
        fontFamily: 'Fredoka',
    },
    carrotCoins: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF8F00',
        fontFamily: 'Fredoka',
    },
    progressStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    progressStat: {
        fontSize: 14,
        color: '#2E7D32',
        fontFamily: 'Fredoka',
    },
    questsContainer: {
        marginBottom: 16,
    },
    questCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#E0E0E0',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    completedQuestCard: {
        backgroundColor: '#F1F8E9',
        borderColor: '#4CAF50',
    },
    questHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    questEmoji: {
        fontSize: 24,
        marginRight: 12,
    },
    questInfo: {
        flex: 1,
    },
    questTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    questDescription: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Fredoka',
        marginBottom: 8,
    },
    questPoints: {
        backgroundColor: '#FF8F00',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    pointsText: {
        fontSize: 12,
        color: 'white',
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressBar: {
        flex: 1,
        height: 8,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        overflow: 'hidden',
        marginRight: 12,
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'Fredoka',
        fontWeight: 'bold',
        minWidth: 60,
        textAlign: 'right',
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8F5E8',
        borderRadius: 12,
        padding: 8,
    },
    completedText: {
        fontSize: 14,
        color: '#4CAF50',
        fontWeight: 'bold',
        marginLeft: 8,
        fontFamily: 'Fredoka',
    },
    questButton: {
        backgroundColor: '#F97850',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    questButtonActive: {
        backgroundColor: '#4CAF50',
    },
    questButtonText: {
        color: '#FFFFFF',
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
        fontSize: 14,
    },
    questButtonTextActive: {
        color: 'white',
    },
    badgesContainer: {
        marginTop: 24,
        marginBottom: 20,
    },
    badgesTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 16,
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    badgeItem: {
        backgroundColor: '#F5F5F5',
        borderRadius: 16,
        padding: 12,
        alignItems: 'center',
        width: '30%',
        borderWidth: 2,
        borderColor: '#E0E0E0',
    },
    earnedBadge: {
        backgroundColor: '#FFF3E0',
        borderColor: '#FF8F00',
    },
    badgeEmoji: {
        fontSize: 24,
        marginBottom: 8,
    },
    unearnedBadge: {
        opacity: 0.3,
    },
    badgeName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#91483C',
        textAlign: 'center',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    badgeRequirement: {
        fontSize: 10,
        color: '#666',
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
    timeframe: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'Fredoka',
        fontWeight: 'bold',
        marginTop: 8,
        textAlign: 'right',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        fontSize: 14,
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginTop: 8,
    },
});
