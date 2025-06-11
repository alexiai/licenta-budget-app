import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, runTransaction } from 'firebase/firestore';
import { db } from '@lib/firebase';
import { SpendingAnalysis } from '@tabs/ai/components/SmartAdviceSection';

export interface UserQuest {
    id: string;
    userId: string;
    title: string;
    description: string;
    type: 'daily' | 'weekly' | 'monthly' | 'achievement';
    reward: number;
    progress: number;
    target: number;
    status: 'active' | 'completed' | 'claimed' | 'failed' | 'locked';
    category?: string;
    startDate: Date;
    endDate?: Date;
    streak?: number;
    level: number;
    claimedAt?: Date;
}

export interface UserProgress {
    userId: string;
    level: number;
    totalPoints: number;
    pointsToNextLevel: number;
    questsCompleted: number;
    currentStreak: number;
    lastQuestDate?: Date;
    badges: Badge[];
    completedQuests: string[]; // Array of completed quest IDs
}

export interface Badge {
    id: string;
    name: string;
    description: string;
    icon: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    unlockedAt: Date;
}

class QuestService {
    private readonly POINTS_PER_LEVEL = 1000;
    private readonly questsCollection;
    private readonly progressCollection;

    constructor() {
        this.questsCollection = collection(db, 'quests');
        this.progressCollection = collection(db, 'userProgress');
    }

    async getUserProgress(userId: string): Promise<UserProgress> {
        const progressDoc = doc(this.progressCollection, userId);
        const progressSnap = await getDoc(progressDoc);

        if (!progressSnap.exists()) {
            // Initialize new user progress
            const initialProgress: UserProgress = {
                userId,
                level: 1,
                totalPoints: 0,
                pointsToNextLevel: this.POINTS_PER_LEVEL,
                questsCompleted: 0,
                currentStreak: 0,
                badges: [],
                completedQuests: []
            };
            await setDoc(progressDoc, initialProgress);
            return initialProgress;
        }

        return progressSnap.data() as UserProgress;
    }

    async getQuests(userId: string): Promise<UserQuest[]> {
        const q = query(this.questsCollection, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as UserQuest);
    }

    async generateQuests(userId: string, analysis: SpendingAnalysis): Promise<UserQuest[]> {
        const quests: UserQuest[] = [];
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // Daily spending limit quest
        quests.push({
            id: `daily-${now.toISOString().split('T')[0]}`,
            userId,
            title: 'Daily Budget Master',
            description: `Keep today's spending under ${analysis.averageDailySpending.toFixed(0)} RON`,
            type: 'daily',
            reward: 50,
            progress: analysis.spendingPatterns.todayTotal || 0,
            target: analysis.averageDailySpending,
            status: 'active',
            startDate: now,
            endDate: tomorrow,
            level: 1
        });

        // Weekly quests
        if (analysis.spendingPatterns.weekdayVsWeekend.weekend > analysis.spendingPatterns.weekdayVsWeekend.weekday * 0.4) {
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
            quests.push({
                id: `weekly-${now.toISOString().split('T')[0]}`,
                userId,
                title: 'Weekend Warrior',
                description: 'Reduce weekend spending by finding free activities',
                type: 'weekly',
                reward: 100,
                progress: analysis.spendingPatterns.weekdayVsWeekend.weekend,
                target: analysis.spendingPatterns.weekdayVsWeekend.weekday * 0.4,
                status: 'active',
                startDate: now,
                endDate: weekEnd,
                level: 2
            });
        }

        // Save generated quests
        await Promise.all(quests.map(quest => 
            setDoc(doc(this.questsCollection, quest.id), quest)
        ));

        return quests;
    }

    async isQuestClaimed(userId: string, questId: string): Promise<boolean> {
        const progressDoc = doc(this.progressCollection, userId);
        const progressSnap = await getDoc(progressDoc);
        
        if (!progressSnap.exists()) return false;
        
        const progress = progressSnap.data() as UserProgress;
        return progress.completedQuests.includes(questId);
    }

    async updateQuestProgress(userId: string, questId: string, progress: number): Promise<void> {
        const questDoc = doc(this.questsCollection, questId);
        const progressDoc = doc(this.progressCollection, userId);

        try {
            await runTransaction(db, async (transaction) => {
                // Get latest quest and progress data within transaction
                const questSnap = await transaction.get(questDoc);
                const progressSnap = await transaction.get(progressDoc);

                if (!questSnap.exists() || !progressSnap.exists()) {
                    throw new Error('Quest or progress document not found');
                }

                const quest = questSnap.data() as UserQuest;
                const userProgress = progressSnap.data() as UserProgress;

                // Check if quest is already claimed
                if (userProgress.completedQuests.includes(questId)) {
                    throw new Error('Quest already claimed');
                }

                // Update quest progress
                const newStatus = progress >= quest.target ? 'completed' : 'active';
                transaction.update(questDoc, {
                    progress,
                    status: newStatus
                });

                // If completed, award it immediately
                if (newStatus === 'completed') {
                    const now = new Date();
                    
                    // Calculate new points and level
                    const newTotalPoints = userProgress.totalPoints + quest.reward;
                    const level = Math.floor(newTotalPoints / this.POINTS_PER_LEVEL) + 1;
                    const pointsToNextLevel = level * this.POINTS_PER_LEVEL - newTotalPoints;

                    // Update streak
                    let streak = userProgress.currentStreak;
                    const lastQuestDate = userProgress.lastQuestDate ? new Date(userProgress.lastQuestDate) : null;

                    if (lastQuestDate) {
                        const dayDiff = Math.floor((now.getTime() - lastQuestDate.getTime()) / (1000 * 60 * 60 * 24));
                        streak = dayDiff === 1 ? streak + 1 : 1;
                    } else {
                        streak = 1;
                    }

                    // Update badges
                    const badges = [...userProgress.badges];
                    if (streak >= 7 && !badges.some(b => b.id === 'weekly-streak')) {
                        badges.push({
                            id: 'weekly-streak',
                            name: 'Weekly Warrior',
                            description: 'Complete quests for 7 days in a row',
                            icon: '🎯',
                            rarity: 'rare',
                            unlockedAt: now
                        });
                    }
                    if (streak >= 30 && !badges.some(b => b.id === 'monthly-streak')) {
                        badges.push({
                            id: 'monthly-streak',
                            name: 'Monthly Master',
                            description: 'Complete quests for 30 days in a row',
                            icon: '🏆',
                            rarity: 'epic',
                            unlockedAt: now
                        });
                    }

                    // Update progress document
                    transaction.update(progressDoc, {
                        level,
                        totalPoints: newTotalPoints,
                        pointsToNextLevel,
                        questsCompleted: userProgress.questsCompleted + 1,
                        currentStreak: streak,
                        lastQuestDate: now,
                        badges,
                        completedQuests: [...userProgress.completedQuests, questId]
                    });

                    // Update quest document
                    transaction.update(questDoc, {
                        status: 'claimed',
                        claimedAt: now
                    });
                }
            });
        } catch (error) {
            console.error('Error in quest progress transaction:', error);
            throw error;
        }
    }

    async claimBadge(userId: string, badgeId: string): Promise<void> {
        const progressDoc = doc(this.progressCollection, userId);
        const progressSnap = await getDoc(progressDoc);

        if (!progressSnap.exists()) return;

        const progress = progressSnap.data() as UserProgress;
        const badge = progress.badges.find(b => b.id === badgeId);

        if (!badge) return;

        // Add any special rewards or effects for claiming the badge
        // For now, just mark it as claimed by removing it from the array
        await updateDoc(progressDoc, {
            badges: progress.badges.filter(b => b.id !== badgeId)
        });
    }

    async getQuestStatus(userId: string, questId: string): Promise<{ claimed: boolean; progress: number; target: number }> {
        const [progressSnap, questSnap] = await Promise.all([
            getDoc(doc(this.progressCollection, userId)),
            getDoc(doc(this.questsCollection, questId))
        ]);

        if (!progressSnap.exists() || !questSnap.exists()) {
            throw new Error('Quest or progress document not found');
        }

        const progress = progressSnap.data() as UserProgress;
        const quest = questSnap.data() as UserQuest;

        return {
            claimed: progress.completedQuests.includes(questId),
            progress: quest.progress,
            target: quest.target
        };
    }
}

export default new QuestService(); 