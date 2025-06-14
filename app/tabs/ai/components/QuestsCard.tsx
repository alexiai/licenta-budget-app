import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { SpendingAnalysis } from './SmartAdviceSection';
import { LinearGradient } from 'expo-linear-gradient';
import questsImg from '@assets/decor/aiQuests.png';
import { auth } from '@lib/firebase';
import QuestService from '../../../services/QuestService';
import { UserQuest } from '@lib/types';

// Add immediate logging to verify the module is loaded
console.log('[QuestsCard] Module loaded, QuestService:', !!QuestService);

interface QuestsCardProps {
    analysis: SpendingAnalysis | null;
    onQuestComplete?: (questId: string) => void;
}

export default function QuestsCard({ analysis, onQuestComplete }: QuestsCardProps): JSX.Element {
    console.log('[QuestsCard] Component initializing');
    
    const [expandedQuest, setExpandedQuest] = useState<string | null>(null);
    const [quests, setQuests] = useState<UserQuest[]>([]);
    const [loading, setLoading] = useState(true);

    // Add initialization effect
    useEffect(() => {
        console.log('[QuestsCard] Initial mount effect');
        return () => {
            console.log('[QuestsCard] Component unmounting');
        };
    }, []);

    useEffect(() => {
        console.log('[QuestsCard] Component mounted with analysis:', analysis);
        console.log('[QuestsCard] Current auth user:', auth.currentUser?.uid);
        loadQuests();
    }, [analysis]);

    const loadQuests = async () => {
        console.log('[QuestsCard] Loading quests...');
        const user = auth.currentUser;
        
        if (!user || !analysis) {
            console.log('[QuestsCard] No user logged in or no analysis data');
            console.log('[QuestsCard] User:', user?.uid);
            console.log('[QuestsCard] Analysis:', !!analysis);
            setLoading(false);
            return;
        }

        try {
            console.log('[QuestsCard] Before generating quests');
            console.log('[QuestsCard] QuestService available:', !!QuestService);
            console.log('[QuestsCard] QuestService methods:', Object.keys(QuestService));
            
            const userQuests = await QuestService.generateQuests(user.uid, analysis);
            console.log('[QuestsCard] Quests generated:', userQuests);
            setQuests(userQuests);
        } catch (err) {
            const error = err as Error;
            console.error('[QuestsCard] Error loading quests:', error);
            console.error('[QuestsCard] Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            Alert.alert('Error', 'Failed to load quests. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleQuestComplete = async (questId: string) => {
        const user = auth.currentUser;
        console.log('[QuestsCard] Attempting to complete quest:', questId);
        console.log('[QuestsCard] Current user:', user?.uid);

        if (!user) {
            console.log('[QuestsCard] No user logged in');
            Alert.alert('Error', 'You must be logged in to complete quests.');
            return;
        }

        try {
            console.log('[QuestsCard] Checking if quest is already claimed...');
            const isQuestClaimed = await QuestService.isQuestClaimed(user.uid, questId);
            console.log('[QuestsCard] Quest claimed status:', isQuestClaimed);

            if (isQuestClaimed) {
                console.log('[QuestsCard] Quest already claimed');
                Alert.alert('Already Claimed', 'You have already claimed this quest!');
                return;
            }

            // Get the quest
            const quest = quests.find(q => q.id === questId);
            console.log('[QuestsCard] Quest to complete:', quest);
            if (!quest) {
                console.log('[QuestsCard] Quest not found');
                return;
            }

            console.log('[QuestsCard] Claiming quest reward...');
            await QuestService.claimQuestReward(user.uid, questId);
            console.log('[QuestsCard] Quest reward claimed successfully');

            // Call parent handler if provided
            if (onQuestComplete) {
                console.log('[QuestsCard] Calling parent completion handler');
                onQuestComplete(questId);
            }

            console.log('[QuestsCard] Refreshing quests...');
            await loadQuests();
            console.log('[QuestsCard] Quests refreshed successfully');
        } catch (error) {
            console.error('[QuestsCard] Error completing quest:', error);
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

    const getProgressPercentage = (quest: UserQuest) => {
        return Math.min(100, (quest.progress / quest.target) * 100);
    };

    const getQuestStatus = (quest: UserQuest) => {
        if (quest.status === 'claimed') return 'Claimed';
        if (quest.status === 'completed') return 'Ready to claim!';
        const progress = getProgressPercentage(quest);
        return `${progress.toFixed(0)}% Complete`;
    };

    if (loading) {
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
        backgroundColor: 'rgba(255, 243, 224, 0.9)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#FFE0B2',
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
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 24,
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