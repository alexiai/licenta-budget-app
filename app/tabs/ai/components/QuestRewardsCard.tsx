import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import rewardsImg from '@assets/decor/aiRewards.png';

interface UserProgress {
    level: number;
    totalPoints: number;
    pointsToNextLevel: number;
    questsCompleted: number;
    currentStreak: number;
    badges: Badge[];
}

interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlockedAt: Date;
}

interface QuestRewardsCardProps {
    userProgress: UserProgress | null;
    onClaimReward?: (badgeId: string) => void;
}

export default function QuestRewardsCard({ userProgress, onClaimReward }: QuestRewardsCardProps): JSX.Element {
    useEffect(() => {
        console.log('[QuestRewardsCard] Component mounted with progress:', userProgress);
    }, [userProgress]);

    if (!userProgress) {
        console.log('[QuestRewardsCard] No user progress available');
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Image source={rewardsImg} style={styles.image} resizeMode="contain" />
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Quest Rewards</Text>
                        <Text style={styles.headerSubtitle}>Loading your progress...</Text>
                    </View>
                </View>
            </View>
        );
    }

    const getLevelColor = (level: number): [string, string] => {
        console.log('[QuestRewardsCard] Getting color for level:', level);
        if (level >= 20) return ['#9C27B0', '#BA68C8'];
        if (level >= 15) return ['#F44336', '#EF5350'];
        if (level >= 10) return ['#FF9800', '#FFA726'];
        if (level >= 5) return ['#2196F3', '#42A5F5'];
        return ['#4CAF50', '#66BB6A'];
    };

    const getBadgeColor = (rarity: string): [string, string] => {
        console.log('[QuestRewardsCard] Getting color for badge rarity:', rarity);
        switch (rarity) {
            case 'legendary':
                return ['#FFD700', '#FFC107'];
            case 'epic':
                return ['#9C27B0', '#BA68C8'];
            case 'rare':
                return ['#2196F3', '#42A5F5'];
            default:
                return ['#78909C', '#90A4AE'];
        }
    };

    const getProgressPercentage = () => {
        const totalPointsForLevel = userProgress.pointsToNextLevel;
        const currentPoints = userProgress.totalPoints % totalPointsForLevel;
        const percentage = (currentPoints / totalPointsForLevel) * 100;
        console.log('[QuestRewardsCard] Calculating progress:', { currentPoints, totalPointsForLevel, percentage });
        return percentage;
    };

    const handleBadgeClaim = (badgeId: string) => {
        console.log('[QuestRewardsCard] Attempting to claim badge:', badgeId);
        console.log('[QuestRewardsCard] Current badges:', userProgress.badges);
        console.log('[QuestRewardsCard] onClaimReward handler exists:', !!onClaimReward);
        onClaimReward?.(badgeId);
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={rewardsImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Quest Rewards</Text>
                    <Text style={styles.headerSubtitle}>
                        Level up and earn badges
                    </Text>
                </View>
            </View>

            {/* Level Progress Card */}
            <View style={styles.card}>
                <LinearGradient
                    colors={getLevelColor(userProgress.level)}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.levelBadge}
                >
                    <Text style={styles.levelText}>Level {userProgress.level}</Text>
                </LinearGradient>

                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{userProgress.totalPoints}</Text>
                        <Text style={styles.statLabel}>Total Points</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{userProgress.questsCompleted}</Text>
                        <Text style={styles.statLabel}>Quests Done</Text>
                    </View>
                    <View style={styles.statItem}>
                        <Text style={styles.statValue}>{userProgress.currentStreak}</Text>
                        <Text style={styles.statLabel}>Day Streak</Text>
                    </View>
                </View>

                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <View
                            style={[
                                styles.progressFill,
                                {
                                    width: `${getProgressPercentage()}%`,
                                    backgroundColor: getLevelColor(userProgress.level)[0]
                                }
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        {userProgress.totalPoints % userProgress.pointsToNextLevel} / {userProgress.pointsToNextLevel} XP
                    </Text>
                </View>
            </View>

            {/* Badges Section */}
            <View style={styles.card}>
                <Text style={styles.sectionTitle}>Badges Earned</Text>
                <View style={styles.badgesGrid}>
                    {userProgress.badges.map((badge) => (
                        <TouchableOpacity
                            key={badge.id}
                            style={styles.badgeItem}
                            onPress={() => handleBadgeClaim(badge.id)}
                        >
                            <LinearGradient
                                colors={getBadgeColor(badge.rarity)}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.badgeIcon}
                            >
                                <Text style={styles.badgeEmoji}>{badge.icon}</Text>
                            </LinearGradient>
                            <Text style={styles.badgeName}>{badge.name}</Text>
                            <Text style={styles.badgeRarity}>{badge.rarity}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF9E6',
        borderRadius: 20,
        padding: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 16,
        padding: 12,
        position: 'relative',
        minHeight: 100,
    },
    image: {
        width: 80,
        height: 80,
        position: 'absolute',
        left: 0,
        top: 12,
        zIndex: 1,
    },
    headerText: {
        flex: 1,
        paddingTop: 0,
        marginLeft: 90,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#8B6914',
        fontFamily: 'Fredoka',
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        marginHorizontal: 8,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    levelBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
        marginBottom: 16,
    },
    levelText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statItem: {
        alignItems: 'center',
    },
    statValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#666666',
        fontFamily: 'Fredoka',
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
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 16,
    },
    badgesGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    badgeItem: {
        width: '30%',
        alignItems: 'center',
        marginBottom: 16,
    },
    badgeIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    badgeEmoji: {
        fontSize: 24,
    },
    badgeName: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        textAlign: 'center',
        marginBottom: 4,
    },
    badgeRarity: {
        fontSize: 10,
        color: '#666666',
        fontFamily: 'Fredoka',
        textTransform: 'uppercase',
    },
}); 