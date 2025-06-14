import { collection, doc, getDoc, setDoc, updateDoc, query, where, getDocs, runTransaction, writeBatch, Timestamp, DocumentReference } from 'firebase/firestore';
import { db } from '@lib/firebase';
import { SpendingAnalysis } from '@tabs/ai/components/SmartAdviceSection';
import { UserProgress, UserQuest } from '@lib/types';
import { useDataFetching } from '@lib/hooks/useDataFetching';

interface Expense {
    id: string;
    userId: string;
    amount: number;
    category: string;
    subcategory: string;
    note?: string;
    date: string;
    source?: string;
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
    private questsCollection;
    private userProgressCollection;

    constructor() {
        console.log('[QuestService] Initializing service');
        this.questsCollection = collection(db, 'quests');
        this.userProgressCollection = collection(db, 'userProgress');
        console.log('[QuestService] Service initialized with collections:', {
            quests: !!this.questsCollection,
            progress: !!this.userProgressCollection
        });
    }

    // Hook for getting quests with caching
    useQuests(userId: string) {
        return useDataFetching<UserQuest[]>(
            'quests',
            () => this.getQuests(userId),
            [userId]
        );
    }

    // Hook for getting active quests with caching
    useActiveQuests(userId: string) {
        return useDataFetching<UserQuest[]>(
            'active_quests',
            () => this.getActiveQuests(userId),
            [userId]
        );
    }

    // Hook for getting user progress with caching
    useUserProgress(userId: string) {
        return useDataFetching<UserProgress>(
            'user_progress',
            () => this.getUserProgress(userId),
            [userId]
        );
    }

    async createQuest(quest: Omit<UserQuest, 'id'>): Promise<string> {
        console.log('[QuestService] Creating new quest:', quest);
        const newQuestRef = doc(this.questsCollection);
        await setDoc(newQuestRef, {
            ...quest,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now()
        });
        console.log('[QuestService] Created quest with ID:', newQuestRef.id);
        return newQuestRef.id;
    }

    async updateQuest(id: string, quest: Partial<UserQuest>): Promise<void> {
        console.log('[QuestService] Updating quest:', { id, quest });
        const docRef = doc(this.questsCollection, id);
        await updateDoc(docRef, {
            ...quest,
            updatedAt: Timestamp.now()
        });
        console.log('[QuestService] Updated quest successfully');
    }

    async getQuests(userId: string): Promise<UserQuest[]> {
        console.log('[QuestService] Fetching quests for user:', userId);
        const q = query(this.questsCollection, where("userId", "==", userId));
        const querySnapshot = await getDocs(q);
        const quests = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as UserQuest);
        console.log('[QuestService] Found quests:', quests);
        return quests;
    }

    async getUserProgress(userId: string): Promise<UserProgress> {
        console.log('[QuestService] Getting user progress:', userId);
        const docRef = doc(this.userProgressCollection, userId);
        const docSnap = await getDoc(docRef);
        
        if (!docSnap.exists()) {
            console.log('[QuestService] No progress found, creating default');
            const defaultProgress: UserProgress = {
                userId,
                level: 1,
                totalPoints: 0,
                pointsToNextLevel: 1000,
                questsCompleted: 0,
                currentStreak: 0,
                badges: [],
                completedQuests: []
            };
            await setDoc(docRef, defaultProgress);
            return defaultProgress;
        }

        return docSnap.data() as UserProgress;
    }

    async generateQuests(userId: string, analysis: SpendingAnalysis): Promise<UserQuest[]> {
        console.log('[QuestService] Generating quests for user:', userId);
        console.log('[QuestService] Analysis data:', analysis);

        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);

        // First, check for existing active quests
        console.log('[QuestService] Checking for existing active quests...');
        const existingQuests = await this.getActiveQuests(userId);
        console.log('[QuestService] Existing active quests:', existingQuests);

        const dailyQuestExists = existingQuests.some(q => 
            q.type === 'daily' && 
            new Date(q.startDate).toDateString() === now.toDateString()
        );
        console.log('[QuestService] Daily quest exists:', dailyQuestExists);

        const quests: UserQuest[] = [];

        // Only generate daily quest if none exists for today
        if (!dailyQuestExists) {
            console.log('[QuestService] Creating new daily quest');
            const dailyQuest: UserQuest = {
                id: `daily-${now.toISOString().split('T')[0]}-${userId}`,
                userId,
                title: 'Daily Budget Master',
                description: `Keep today's spending under ${analysis.averageDailySpending.toFixed(0)} RON`,
                type: 'daily',
                reward: 50,
                progress: 0,
                target: analysis.averageDailySpending,
                status: 'active',
                startDate: now,
                endDate: tomorrow,
                level: 1
            };
            quests.push(dailyQuest);
        }

        // Generate weekly quest if weekend spending is high
        if (analysis.spendingPatterns.weekdayVsWeekend.weekend > analysis.spendingPatterns.weekdayVsWeekend.weekday * 0.4) {
            console.log('[QuestService] Creating new weekly quest');
            const weekEnd = new Date(now);
            weekEnd.setDate(weekEnd.getDate() + (7 - weekEnd.getDay()));
            
            const weeklyQuest: UserQuest = {
                id: `weekly-${now.toISOString().split('T')[0]}-${userId}`,
                userId,
                title: 'Weekend Warrior',
                description: 'Reduce weekend spending by finding free activities',
                type: 'weekly',
                reward: 100,
                progress: 0,
                target: analysis.spendingPatterns.weekdayVsWeekend.weekday * 0.4,
                status: 'active',
                startDate: now,
                endDate: weekEnd,
                level: 2
            };
            quests.push(weeklyQuest);
        }

        if (quests.length > 0) {
            console.log('[QuestService] Saving new quests to Firestore:', quests);
            // Save new quests to Firestore using a batch
            const batch = writeBatch(db);
            quests.forEach(quest => {
                const questRef = doc(this.questsCollection, quest.id);
                batch.set(questRef, quest);
            });
            await batch.commit();
            console.log('[QuestService] Quests saved successfully');
        }

        return [...existingQuests, ...quests];
    }

    private async getActiveQuests(userId: string): Promise<UserQuest[]> {
        console.log('[QuestService] Getting active quests for user:', userId);
        const q = query(
            this.questsCollection,
            where("userId", "==", userId),
            where("status", "==", "active")
        );
        const snapshot = await getDocs(q);
        const quests = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }) as UserQuest);
        console.log('[QuestService] Found active quests:', quests);
        return quests;
    }

    async trackExpense(userId: string, expense: Expense): Promise<void> {
        console.log('[QuestService] Tracking expense:', { userId, expense });
        const activeQuests = await this.getActiveQuests(userId);
        console.log('[QuestService] Active quests found:', activeQuests);
        
        const batch = writeBatch(db);
        const now = new Date();

        for (const quest of activeQuests) {
            let shouldUpdate = false;
            let newProgress = quest.progress;

            console.log('[QuestService] Processing quest:', {
                questId: quest.id,
                type: quest.type,
                currentProgress: quest.progress,
                target: quest.target
            });

            switch (quest.type) {
                case 'daily':
                    // Only track expenses for today
                    if (new Date(expense.date).toDateString() === now.toDateString()) {
                        console.log('[QuestService] Expense is for today, updating daily quest');
                        const todayExpenses = await this.getTodayExpenses(userId);
                        console.log('[QuestService] Today\'s expenses:', todayExpenses);
                        newProgress = todayExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                        shouldUpdate = true;
                    }
                    break;
                case 'weekly':
                    // Only track weekend expenses
                    if (this.isWeekend(new Date(expense.date))) {
                        console.log('[QuestService] Expense is for weekend, updating weekly quest');
                        const weekendExpenses = await this.getWeekendExpenses(userId);
                        console.log('[QuestService] Weekend expenses:', weekendExpenses);
                        newProgress = weekendExpenses.reduce((sum, exp) => sum + exp.amount, 0);
                        shouldUpdate = true;
                    }
                    break;
                // Add more quest types here
            }

            if (shouldUpdate) {
                console.log('[QuestService] Updating quest progress:', {
                    questId: quest.id,
                    oldProgress: quest.progress,
                    newProgress,
                    target: quest.target
                });

                const questRef = doc(this.questsCollection, quest.id);
                const newStatus = newProgress >= quest.target ? 'completed' : 'active';
                
                console.log('[QuestService] Quest status change:', {
                    questId: quest.id,
                    oldStatus: quest.status,
                    newStatus
                });

                batch.update(questRef, {
                    progress: newProgress,
                    status: newStatus
                });

                // If quest is completed, update user progress
                if (newStatus === 'completed' && quest.status !== 'completed') {
                    console.log('[QuestService] Quest newly completed, updating user progress');
                    const progressRef = doc(this.userProgressCollection, userId);
                    const progressSnap = await getDoc(progressRef);
                    
                    if (progressSnap.exists()) {
                        const userProgress = progressSnap.data() as UserProgress;
                        
                        // Update streak
                        let streak = userProgress.currentStreak;
                        const lastQuestDate = userProgress.lastQuestDate ? new Date(userProgress.lastQuestDate) : null;

                        if (lastQuestDate) {
                            const dayDiff = Math.floor((now.getTime() - lastQuestDate.getTime()) / (1000 * 60 * 60 * 24));
                            streak = dayDiff === 1 ? streak + 1 : 1;
                            console.log('[QuestService] Updating streak:', {
                                oldStreak: userProgress.currentStreak,
                                newStreak: streak,
                                dayDiff
                            });
                        } else {
                            streak = 1;
                            console.log('[QuestService] Starting new streak');
                        }

                        batch.update(progressRef, {
                            currentStreak: streak,
                            lastQuestDate: now
                        });
                    }
                }
            }
        }

        console.log('[QuestService] Committing batch updates');
        await batch.commit();
        console.log('[QuestService] Batch updates committed successfully');
    }

    private async getTodayExpenses(userId: string): Promise<Expense[]> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', userId),
            where('date', '>=', today.toISOString()),
            where('date', '<', tomorrow.toISOString())
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data() as Expense);
    }

    private async getWeekendExpenses(userId: string): Promise<Expense[]> {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 7);

        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', userId),
            where('date', '>=', startOfWeek.toISOString()),
            where('date', '<', endOfWeek.toISOString())
        );
        const snapshot = await getDocs(q);
        return snapshot.docs
            .map(doc => doc.data() as Expense)
            .filter(exp => this.isWeekend(new Date(exp.date)));
    }

    private isWeekend(date: Date): boolean {
        const day = date.getDay();
        return day === 0 || day === 6; // 0 is Sunday, 6 is Saturday
    }

    async claimQuestReward(userId: string, questId: string): Promise<void> {
        console.log('[QuestService] Attempting to claim quest reward:', { userId, questId });
        
        try {
            await runTransaction(db, async (transaction) => {
                console.log('[QuestService] Starting claim transaction');
                
                // Get quest document
                const questRef = doc(this.questsCollection, questId);
                const questDoc = await transaction.get(questRef);
                
                if (!questDoc.exists()) {
                    console.error('[QuestService] Quest not found:', questId);
                    throw new Error('Quest not found');
                }
                
                const quest = questDoc.data() as UserQuest;
                console.log('[QuestService] Quest data:', quest);
                
                if (quest.userId !== userId) {
                    console.error('[QuestService] Quest belongs to different user');
                    throw new Error('Quest belongs to different user');
                }
                
                if (quest.status === 'claimed') {
                    console.error('[QuestService] Quest already claimed');
                    throw new Error('Quest already claimed');
                }
                
                // Get user progress
                const progressRef = doc(this.userProgressCollection, userId);
                const progressDoc = await transaction.get(progressRef);
                
                if (!progressDoc.exists()) {
                    console.error('[QuestService] User progress not found');
                    throw new Error('User progress not found');
                }
                
                const progress = progressDoc.data() as UserProgress;
                console.log('[QuestService] Current user progress:', progress);
                
                // Update quest status
                transaction.update(questRef, {
                    status: 'claimed',
                    claimedAt: new Date()
                });
                console.log('[QuestService] Updated quest status to claimed');
                
                // Update user progress
                const updatedProgress: UserProgress = {
                    ...progress,
                    completedQuests: [...progress.completedQuests, questId],
                    totalPoints: progress.totalPoints + quest.reward,
                    questsCompleted: progress.questsCompleted + 1,
                    pointsToNextLevel: this.POINTS_PER_LEVEL - ((progress.totalPoints + quest.reward) % this.POINTS_PER_LEVEL),
                    level: Math.floor((progress.totalPoints + quest.reward) / this.POINTS_PER_LEVEL) + 1
                };
                
                console.log('[QuestService] Updated progress:', updatedProgress);
                transaction.set(progressRef, updatedProgress);
                
                console.log('[QuestService] Transaction completed successfully');
            });
            
            console.log('[QuestService] Quest reward claimed successfully');
        } catch (error) {
            console.error('[QuestService] Error claiming quest reward:', error);
            if (error instanceof Error) {
                console.error('[QuestService] Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            }
            throw error;
        }
    }

    async isQuestClaimed(userId: string, questId: string): Promise<boolean> {
        console.log('[QuestService] Checking if quest is claimed:', { userId, questId });
        try {
            const questRef = doc(this.questsCollection, questId);
            const questDoc = await getDoc(questRef);
            
            if (!questDoc.exists()) {
                console.log('[QuestService] Quest not found');
                return false;
            }
            
            const quest = questDoc.data() as UserQuest;
            console.log('[QuestService] Quest status:', quest.status);
            
            if (quest.userId !== userId) {
                console.log('[QuestService] Quest belongs to different user');
                return false;
            }
            
            return quest.status === 'claimed';
        } catch (error) {
            console.error('[QuestService] Error checking quest claimed status:', error);
            if (error instanceof Error) {
                console.error('[QuestService] Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            }
            return false;
        }
    }

    async updateQuestProgress(userId: string, questId: string, progress: number): Promise<void> {
        console.log('[QuestService] Updating quest progress:', { userId, questId, progress });
        try {
            const questRef = doc(this.questsCollection, questId);
            const questDoc = await getDoc(questRef);
            
            if (!questDoc.exists()) {
                console.error('[QuestService] Quest not found');
                throw new Error('Quest not found');
            }
            
            const quest = questDoc.data() as UserQuest;
            console.log('[QuestService] Current quest data:', quest);
            
            if (quest.userId !== userId) {
                console.error('[QuestService] Quest belongs to different user');
                throw new Error('Quest belongs to different user');
            }
            
            if (quest.status === 'claimed') {
                console.log('[QuestService] Quest already claimed, skipping update');
                return;
            }
            
            const updatedQuest = {
                ...quest,
                progress,
                status: progress >= quest.target ? 'completed' : 'active'
            };
            
            console.log('[QuestService] Updating quest with:', updatedQuest);
            await setDoc(questRef, updatedQuest);
            console.log('[QuestService] Quest progress updated successfully');
        } catch (error) {
            console.error('[QuestService] Error updating quest progress:', error);
            if (error instanceof Error) {
                console.error('[QuestService] Error details:', {
                    name: error.name,
                    message: error.message,
                    stack: error.stack
                });
            }
            throw error;
        }
    }

    async claimBadge(userId: string, badgeId: string): Promise<void> {
        const progressDoc = doc(this.userProgressCollection, userId);
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
            getDoc(doc(this.userProgressCollection, userId)),
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

    async updateUserProgress(userId: string, updates: Partial<UserProgress>): Promise<void> {
        console.log('[QuestService] Updating user progress:', { userId, updates });
        const docRef = doc(this.userProgressCollection, userId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });
        console.log('[QuestService] Updated user progress successfully');
    }
}

// Add logging for singleton instantiation
console.log('[QuestService] Creating singleton instance');
const instance = new QuestService();
console.log('[QuestService] Singleton instance created');

export default instance; 