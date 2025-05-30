
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Image,
    Alert,
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
    type: 'spending_limit' | 'category_avoid' | 'save_target' | 'daily_limit';
    category?: string;
    emoji: string;
    difficulty: 'easy' | 'medium' | 'hard';
    points: number;
    timeframe: 'daily' | 'weekly' | 'monthly';
    isCompleted: boolean;
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
}

export default function MiniQuestsCard({ analysis, expenses }: MiniQuestsCardProps): JSX.Element {
    const [quests, setQuests] = useState<Quest[]>([]);
    const [userProgress, setUserProgress] = useState<UserProgress>({
        completedQuests: [],
        totalPoints: 0,
        badges: [],
        questsCompleted: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (auth.currentUser && analysis) {
            loadUserProgress();
            generateQuests();
        }
    }, [analysis, expenses]);

    const loadUserProgress = async () => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            const progressDoc = await getDoc(doc(db, 'userProgress', userId));
            if (progressDoc.exists()) {
                const data = progressDoc.data();
                setUserProgress({
                    completedQuests: data.completedQuests || [],
                    totalPoints: data.totalPoints || 0,
                    badges: data.badges || [],
                    questsCompleted: data.questsCompleted || 0
                });
            }
        } catch (error) {
            console.error('Error loading user progress:', error);
        } finally {
            setLoading(false);
        }
    };

    const canCompleteQuest = (quest: Quest): boolean => {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const weeklyExpenses = expenses.filter(e => new Date(e.date) >= startOfWeek);
        const weeklyTotal = weeklyExpenses.reduce((sum, e) => sum + e.amount, 0);

        switch (quest.id) {
            case 'weekly-limit':
                return weeklyTotal <= quest.target;
            case 'no-coffee-shop':
                const coffeeThisWeek = weeklyExpenses.filter(e => e.subcategory === 'Coffee').length;
                return coffeeThisWeek === 0 && new Date().getDay() >= 3;
            case 'restaurant-limit':
                const restaurantThisWeek = weeklyExpenses.filter(e => e.subcategory === 'Restaurant').length;
                return restaurantThisWeek <= quest.target;
            case 'daily-limit':
                const todayExpenses = expenses.filter(e => {
                    const today = new Date().toISOString().split('T')[0];
                    return e.date.split('T')[0] === today;
                });
                const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
                return todayTotal <= quest.target;
            case 'holiday-budget':
                return analysis ? analysis.totalThisMonth <= quest.target : false;
            default:
                return quest.current >= quest.target;
        }
    };

    const saveUserProgress = async (newProgress: UserProgress) => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            await setDoc(doc(db, 'userProgress', userId), newProgress, { merge: true });
            setUserProgress(newProgress);
        } catch (error) {
            console.error('Error saving user progress:', error);
        }
    };

    const generateQuests = () => {
        if (!analysis) return;

        const newQuests: Quest[] = [];
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Initialize badges if they don't exist
        if (userProgress.badges.length === 0) {
            const initialBadges = checkForNewBadges(userProgress);
            setUserProgress(prev => ({
                ...prev,
                badges: initialBadges
            }));
        }

        // Weekly spending limit quest
        const weeklyExpenses = expenses.filter(e => new Date(e.date) >= startOfWeek);
        const weeklyTotal = weeklyExpenses.reduce((sum, e) => sum + e.amount, 0);

        newQuests.push({
            id: 'weekly-limit',
            title: '🎯 Weekly Budget Challenge',
            description: 'Keep your weekly spending under 300 RON',
            target: 300,
            current: weeklyTotal,
            type: 'spending_limit',
            emoji: '🐰💰',
            difficulty: 'medium',
            points: 15,
            timeframe: 'weekly',
            isCompleted: weeklyTotal <= 300
        });

        // No coffee shop quest (if user has coffee spending)
        const coffeeThisWeek = weeklyExpenses
            .filter(e => e.subcategory === 'Coffee')
            .length;

        if (analysis.subcategoryBreakdown['Coffee'] > 50) {
            newQuests.push({
                id: 'no-coffee-shop',
                title: '☕ Home Brew Hero',
                description: 'Skip coffee shops for 3 days this week',
                target: 3,
                current: Math.max(0, 3 - coffeeThisWeek),
                type: 'category_avoid',
                category: 'Coffee',
                emoji: '🐰☕',
                difficulty: 'easy',
                points: 10,
                timeframe: 'weekly',
                isCompleted: coffeeThisWeek === 0 && new Date().getDay() >= 3
            });
        }

        // Restaurant limit quest
        const restaurantThisWeek = weeklyExpenses
            .filter(e => e.subcategory === 'Restaurant')
            .length;

        newQuests.push({
            id: 'restaurant-limit',
            title: '🍽️ Cooking Champion',
            description: 'Eat out maximum 2 times this week',
            target: 2,
            current: restaurantThisWeek,
            type: 'category_avoid',
            category: 'Restaurant',
            emoji: '🐰👨‍🍳',
            difficulty: 'medium',
            points: 20,
            timeframe: 'weekly',
            isCompleted: restaurantThisWeek <= 2
        });

        // Daily spending quest
        const todayExpenses = expenses.filter(e => {
            const today = new Date().toISOString().split('T')[0];
            return e.date.split('T')[0] === today;
        });
        const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);

        newQuests.push({
            id: 'daily-limit',
            title: '📅 Daily Discipline',
            description: 'Keep today\'s spending under 50 RON',
            target: 50,
            current: todayTotal,
            type: 'daily_limit',
            emoji: '🐰🎯',
            difficulty: 'easy',
            points: 5,
            timeframe: 'daily',
            isCompleted: todayTotal <= 50
        });

        // Seasonal quest based on month
        if (analysis.seasonalContext.month === 'December') {
            newQuests.push({
                id: 'holiday-budget',
                title: '🎄 Holiday Budget Master',
                description: 'Keep holiday spending under 500 RON',
                target: 500,
                current: analysis.totalThisMonth,
                type: 'spending_limit',
                emoji: '🐰🎁',
                difficulty: 'hard',
                points: 30,
                timeframe: 'monthly',
                isCompleted: analysis.totalThisMonth <= 500
            });
        }

        // Update progress for existing quests
        const updatedQuests = newQuests.map(quest => ({
            ...quest,
            isCompleted: userProgress.completedQuests.includes(quest.id) || quest.isCompleted
        }));

        setQuests(updatedQuests);
    };

    const completeQuest = async (quest: Quest) => {
        if (quest.isCompleted || userProgress.completedQuests.includes(quest.id)) {
            return;
        }

        // Check if quest can actually be completed
        if (!canCompleteQuest(quest)) {
            Alert.alert('Quest Not Ready', 'You haven\'t met the requirements for this quest yet!');
            return;
        }

        const newProgress = {
            ...userProgress,
            completedQuests: [...userProgress.completedQuests, quest.id],
            totalPoints: userProgress.totalPoints + quest.points,
            questsCompleted: userProgress.questsCompleted + 1
        };

        // Check for new badges
        const newBadges = checkForNewBadges(newProgress);
        newProgress.badges = newBadges;

        await saveUserProgress(newProgress);

        // Update quest status
        setQuests(prev => prev.map(q =>
            q.id === quest.id ? { ...q, isCompleted: true } : q
        ));

        // Show completion message
        Alert.alert(
            '🎉 Quest Completed!',
            `You earned ${quest.points} CarrotCoins! ${quest.emoji}`,
            [{ text: 'Hop on!', style: 'default' }]
        );

        // Check if user earned a new badge
        const earnedBadge = newBadges.find(b =>
            b.earned && !userProgress.badges.find(ub => ub.id === b.id)?.earned
        );

        if (earnedBadge) {
            setTimeout(() => {
                Alert.alert(
                    '🏆 New Badge Earned!',
                    `${earnedBadge.emoji} ${earnedBadge.name}\n${earnedBadge.description}`,
                    [{ text: 'Amazing!', style: 'default' }]
                );
            }, 1000);
        }
    };

    const checkForNewBadges = (progress: UserProgress): Badge[] => {
        const badges: Badge[] = [
            {
                id: 'curious-bunny',
                name: 'Curious Bunny',
                emoji: '🐰🔍',
                description: 'Completed your first quest',
                requirement: 1,
                earned: progress.questsCompleted >= 1
            },
            {
                id: 'mini-hops',
                name: 'Mini Hops',
                emoji: '🐰🥉',
                description: 'Completed 5 quests',
                requirement: 5,
                earned: progress.questsCompleted >= 5
            },
            {
                id: 'hop-master',
                name: 'Hop Master',
                emoji: '🐰🥈',
                description: 'Completed 10 quests',
                requirement: 10,
                earned: progress.questsCompleted >= 10
            },
            {
                id: 'quest-legend',
                name: 'Quest Legend',
                emoji: '🐰🥇',
                description: 'Completed 25 quests',
                requirement: 25,
                earned: progress.questsCompleted >= 25
            },
            {
                id: 'bunny-hero',
                name: 'Bunny Hero',
                emoji: '🐰🦸',
                description: 'Completed 50 quests',
                requirement: 50,
                earned: progress.questsCompleted >= 50
            },
            {
                id: 'golden-whiskers',
                name: 'Golden Whiskers',
                emoji: '🐰👑',
                description: 'Completed 100 quests',
                requirement: 100,
                earned: progress.questsCompleted >= 100
            }
        ];

        return badges.map(badge => {
            const existingBadge = progress.badges.find(b => b.id === badge.id);
            return {
                ...badge,
                earnedDate: badge.earned && !existingBadge?.earned
                    ? new Date()
                    : existingBadge?.earnedDate || undefined
            };
        });
    };

    const getProgressWidth = (quest: Quest) => {
        if (quest.type === 'category_avoid') {
            return Math.min((quest.current / quest.target) * 100, 100);
        }
        return Math.min((quest.current / quest.target) * 100, 100);
    };

    const getProgressColor = (quest: Quest) => {
        const progress = getProgressWidth(quest);
        if (quest.isCompleted) return '#4CAF50';
        if (progress > 80) return '#FF6B6B';
        if (progress > 50) return '#FFA726';
        return '#4ECDC4';
    };

    if (loading) {
        return (
            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                <View style={styles.headerRow}>
                    <Image source={questsImg} style={styles.image} resizeMode="contain" />
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Bunny Quests</Text>
                        <Text style={styles.headerSubtitle}>Loading your challenges...</Text>
                    </View>
                </View>
            </ScrollView>
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
                    </View>
                ))}
            </View>

            {/* Badges Section */}
            {userProgress.badges.length > 0 && (
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
    progressCard: {
        backgroundColor: '#E8F5E8',
        borderRadius: 20,
        padding: 20,
        marginHorizontal: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#4CAF50',
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
        paddingHorizontal: 16,
        gap: 16,
    },
    questCard: {
        backgroundColor: '#FFF0E0',
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
    completedQuestCard: {
        backgroundColor: '#F1F8E9',
        borderColor: '#4CAF50',
    },
    questHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    questEmoji: {
        fontSize: 24,
        marginRight: 12,
    },
    questInfo: {
        flex: 1,
    },
    questTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    questDescription: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Fredoka',
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
        marginRight: 12,
        overflow: 'hidden',
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
        backgroundColor: '#E0E0E0',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
    },
    questButtonActive: {
        backgroundColor: '#4CAF50',
    },
    questButtonText: {
        fontSize: 14,
        color: '#666',
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
    questButtonTextActive: {
        color: 'white',
    },
    badgesContainer: {
        marginTop: 24,
        paddingHorizontal: 16,
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
});
