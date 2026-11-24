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
import { SpendingAnalysis, ExpenseData } from './types';
import QuestService from '@services/QuestService';
import { useAuth } from '../../../../app/_layout';
import questsImg from '@assets/decor/aiQuests.png';
import { UserQuest, UserProgress } from '@lib/types';
import { LinearGradient } from 'expo-linear-gradient';

interface MiniQuestsCardProps {
    analysis?: SpendingAnalysis | null;
    expenses?: ExpenseData[] | null;
}

export default function MiniQuestsCard({ analysis, expenses = [] }: MiniQuestsCardProps): JSX.Element {
    const { user } = useAuth();
    const { data: userProgress, loading: loadingProgress } = QuestService.useUserProgress(user?.uid || '');
    const [quests, setQuests] = useState<UserQuest[]>([]);
    const [loading, setLoading] = useState(true);
    const [showQuestInfo, setShowQuestInfo] = useState(false);
    const [showLevelInfo, setShowLevelInfo] = useState(false);
    const [showBadgeInfo, setShowBadgeInfo] = useState(false);

    console.log('[MiniQuestsCard] Received analysis:', analysis);
    if (analysis) {
        console.log('[MiniQuestsCard] analysis.totalSpent type:', typeof analysis.totalSpent, analysis.totalSpent);
        console.log('[MiniQuestsCard] analysis.topCategories type:', Array.isArray(analysis.topCategories), analysis.topCategories);
        console.log('[MiniQuestsCard] analysis.categoryBreakdown:', analysis.categoryBreakdown);
    }

    useEffect(() => {
        const loadQuests = async () => {
            if (!user || !analysis) {
                setLoading(false);
                return;
            }

            try {
                const userQuests = await QuestService.generateQuests(user.uid, analysis);
                setQuests(userQuests);
            } catch (error) {
                console.error('Error loading quests:', error);
                Alert.alert('Error', 'Failed to load quests. Please try again.');
            } finally {
                setLoading(false);
            }
        };

        loadQuests();
    }, [user, analysis]);

    if (!user || loadingProgress || loading) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Image source={questsImg} style={styles.image} resizeMode="contain" />
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Daily Quests</Text>
                        <Text style={styles.headerSubtitle}>Loading your quests...</Text>
                    </View>
                </View>
                <ActivityIndicator size="large" color="#91483C" />
            </View>
        );
    }

    const handleQuestComplete = async (questId: string) => {
        try {
            await QuestService.updateQuest(questId, { status: 'completed' });
            Alert.alert('Quest Completed! 🎉', 'You earned some carrot coins!');
            // Reload quests after completion
            const userQuests = await QuestService.generateQuests(user.uid, analysis!);
            setQuests(userQuests);
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

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={questsImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Daily Quests</Text>
                    <Text style={styles.headerSubtitle}>Complete quests to earn rewards</Text>
                </View>
            </View>

            {/* Stats Summary Card */}
            <View style={styles.statsCard}>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userProgress?.totalPoints || 0}</Text>
                    <Text style={styles.statLabel}>Carrot Coins</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{userProgress?.level || 1}</Text>
                    <Text style={styles.statLabel}>Level</Text>
                </View>
                <View style={styles.statItem}>
                    <Text style={styles.statValue}>{quests?.filter((q: UserQuest) => q.status === 'completed').length || 0}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                </View>
            </View>

            {/* Quests List */}
            {quests?.filter(q => q.status !== 'claimed').map((quest: UserQuest) => {
                // Unique key
                const questKey = `${quest.id}-${quest.startDate}`;
                // Determine if quest can be claimed (period is over)
                const now = new Date();
                const questEnd = quest.endDate ? new Date(quest.endDate) : null;
                const canClaim = quest.status === 'completed' && questEnd && questEnd < now;
                console.log('Quest:', quest.title, 'Status:', quest.status, 'canClaim:', canClaim, 'endDate:', quest.endDate, 'now:', now);
                return (
                    <View key={questKey} style={styles.questCard}>
                        <LinearGradient
                            colors={getQuestColor(quest.type)}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.questBadge}
                        >
                            <Text style={styles.questType}>{quest.type}</Text>
                        </LinearGradient>

                        <View style={styles.questHeader}>
                            <Text style={styles.questTitle}>{quest.title}</Text>
                            <Text style={styles.questDescription}>{quest.description}</Text>
                        </View>

                        <View style={styles.questProgress}>
                            <View style={styles.progressBar}>
                                <View 
                                    style={[
                                        styles.progressFill,
                                        { width: `${(quest.progress / quest.target) * 100}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>
                                {quest.progress} / {quest.target}
                            </Text>
                        </View>

                        <View style={styles.questFooter}>
                            <View style={styles.rewardContainer}>
                                <Text style={styles.rewardText}>Reward: {quest.reward} 🥕</Text>
                            </View>
                            {canClaim ? (
                                <TouchableOpacity
                                    style={[styles.completeButton, styles.completedButton]}
                                    onPress={() => handleQuestComplete(quest.id)}
                                >
                                    <Text style={styles.completeButtonText}>Claim Reward</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity
                                    style={styles.completeButton}
                                    disabled={true}
                                >
                                    <Text style={styles.completeButtonText}>
                                        {quest.status === 'completed' ? 'Waiting...' : 'Complete'}
                                    </Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                );
            })}

            {(!quests || quests.length === 0) && (
                <View style={styles.emptyCard}>
                    <Text style={styles.emptyText}>No active quests</Text>
                    <Text style={styles.emptySubtext}>Check back later for new quests!</Text>
                </View>
            )}

            {/* Quest System Information */}
            <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>Quest System Information</Text>
                
                <TouchableOpacity 
                    style={styles.infoHeader}
                    onPress={() => setShowQuestInfo(!showQuestInfo)}
                >
                    <Text style={styles.infoHeaderText}>
                        Quest Types & Rewards {showQuestInfo ? '⤴' : '⤵'}
                    </Text>
                </TouchableOpacity>
                {showQuestInfo && (
                    <View style={styles.infoContent}>
                        <Text style={styles.infoText}>• Daily Quests: Quick tasks, 50-100 points</Text>
                        <Text style={styles.infoText}>• Weekly Quests: Medium tasks, 200-500 points</Text>
                        <Text style={styles.infoText}>• Monthly Quests: Major goals, 1000+ points</Text>
                    </View>
                )}

                <TouchableOpacity 
                    style={styles.infoHeader}
                    onPress={() => setShowLevelInfo(!showLevelInfo)}
                >
                    <Text style={styles.infoHeaderText}>
                        Level System {showLevelInfo ? '⤴' : '⤵'}
                    </Text>
                </TouchableOpacity>
                {showLevelInfo && (
                    <View style={styles.infoContent}>
                        <Text style={styles.infoText}>• Each level requires 1000 points</Text>
                        <Text style={styles.infoText}>• Level colors:</Text>
                        <Text style={styles.infoText}>  1-4: Green | 5-9: Blue | 10-14: Orange</Text>
                        <Text style={styles.infoText}>  15-19: Red | 20+: Purple</Text>
                    </View>
                )}

                <TouchableOpacity 
                    style={styles.infoHeader}
                    onPress={() => setShowBadgeInfo(!showBadgeInfo)}
                >
                    <Text style={styles.infoHeaderText}>
                        Badge Rarities {showBadgeInfo ? '⤴' : '⤵'}
                    </Text>
                </TouchableOpacity>
                {showBadgeInfo && (
                    <View style={styles.infoContent}>
                        <Text style={styles.infoText}>• Common: Basic achievements</Text>
                        <Text style={styles.infoText}>• Rare: Streak milestones</Text>
                        <Text style={styles.infoText}>• Epic: Special combinations</Text>
                        <Text style={styles.infoText}>• Legendary: Major milestones</Text>
                        <Text style={styles.infoNote}>View complete achievements in Profile Awards!</Text>
                    </View>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF9E6',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 16,
        marginLeft: -16,
    },
    image: {
        width: 160,
        height: 160,
        marginRight: 16,
        alignSelf: 'center',
        marginLeft: -16,
    },
    headerText: {
        flex: 1,
        paddingTop: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#90483c',
        fontFamily: 'Fredoka',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#8B6914',
        fontFamily: 'Fredoka',
        marginTop: 4,
    },
    statsCard: {
        flexDirection: 'row',
        justifyContent: 'space-around',
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
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    statLabel: {
        fontSize: 14,
        color: '#8B6914',
        fontFamily: 'Fredoka',
        marginTop: 4,
    },
    questCard: {
        backgroundColor: 'rgba(255, 243, 224, 0.9)',
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
    questTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 8,
    },
    questDescription: {
        fontSize: 14,
        color: '#666666',
        fontFamily: 'Fredoka',
        lineHeight: 20,
    },
    questProgress: {
        marginBottom: 16,
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
        backgroundColor: '#4CAF50',
        borderRadius: 4,
    },
    progressText: {
        fontSize: 12,
        color: '#666666',
        fontFamily: 'Fredoka',
        textAlign: 'right',
    },
    questFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    rewardContainer: {
        backgroundColor: '#FFF8E1',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 6,
    },
    rewardText: {
        color: '#FFA000',
        fontSize: 14,
        fontWeight: '500',
        fontFamily: 'Fredoka',
    },
    completeButton: {
        backgroundColor: '#4CAF50',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    completedButton: {
        backgroundColor: '#91483C',
    },
    completeButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
    emptyCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#8B6914',
        fontFamily: 'Fredoka',
        textAlign: 'center',
    },
    infoSection: {
        backgroundColor: '#FFF8E1',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
    },
    infoTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 12,
        textAlign: 'center',
    },
    infoHeader: {
        backgroundColor: '#FFE4B5',
        borderRadius: 12,
        padding: 12,
        marginVertical: 6,
    },
    infoHeaderText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    infoContent: {
        paddingHorizontal: 8,
        paddingVertical: 12,
    },
    infoText: {
        fontSize: 14,
        color: '#8B6914',
        fontFamily: 'Fredoka',
        marginBottom: 6,
    },
    infoNote: {
        fontSize: 14,
        color: '#91483C',
        fontFamily: 'Fredoka',
        fontWeight: 'bold',
        marginTop: 8,
        textAlign: 'center',
    },
});
