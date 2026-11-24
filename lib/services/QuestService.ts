import { collection, doc, getDoc, getDocs, query, runTransaction, where } from 'firebase/firestore';
import { db } from '@lib/firebase';
import type { ExpenseData, SpendingAnalysis } from '../../components/bunnyAssistant/types';
import type { UserProgress, UserQuest } from '@lib/types';
import { parseExpenseDate } from '@lib/utils/dateUtils';
import { applyQuestReward, buildQuests, evaluateQuest } from '@lib/utils/quests';

const quests = collection(db, 'quests');
const progress = collection(db, 'userProgress');

function emptyProgress(userId: string): UserProgress {
    return {
        userId, level: 1, totalPoints: 0, pointsToNextLevel: 1000,
        questsCompleted: 0, currentStreak: 0, badges: [], completedQuests: [],
    };
}

async function getUserProgress(userId: string): Promise<UserProgress> {
    const snapshot = await getDoc(doc(progress, userId));
    return { ...emptyProgress(userId), ...snapshot.data() };
}

function readQuest(id: string, data: Record<string, unknown>): UserQuest {
    return { ...data, id } as UserQuest;
}

async function generateQuests(userId: string, analysis: SpendingAnalysis, expenses: ExpenseData[]): Promise<UserQuest[]> {
    const now = new Date();
    const candidates = buildQuests(userId, analysis, now);
    const snapshot = await getDocs(query(quests, where('userId', '==', userId)));
    const saved = snapshot.docs.map(item => readQuest(item.id, item.data()));
    const byId = new Map(saved.map(quest => [quest.id, quest]));
    const missing = candidates.filter(candidate => !byId.has(candidate.id));
    if (missing.length) {
        const created = await runTransaction(db, async transaction => {
            const refs = missing.map(candidate => doc(quests, candidate.id));
            const existing = await Promise.all(refs.map(ref => transaction.get(ref)));
            return missing.map((candidate, index) => {
                const record = existing[index];
                if (record.exists()) return readQuest(record.id, record.data());
                transaction.set(refs[index], candidate);
                return candidate;
            });
        });
        for (const quest of created) byId.set(quest.id, quest);
    }
    const currentIds = new Set(candidates.map(candidate => candidate.id));
    const current = candidates.map(candidate => byId.get(candidate.id)!);
    const older = saved.filter(quest => !currentIds.has(quest.id));
    return [...current, ...older]
        .map(quest => evaluateQuest(quest, expenses, now))
        .filter(quest => (currentIds.has(quest.id) && quest.status !== 'claimed') || quest.status === 'completed');
}

async function claimQuestReward(userId: string, questId: string): Promise<UserProgress> {
    const expenseSnapshot = await getDocs(query(collection(db, 'expenses'), where('userId', '==', userId)));
    const expenses = expenseSnapshot.docs.map(item => item.data() as ExpenseData);
    return runTransaction(db, async transaction => {
        const questRef = doc(quests, questId);
        const progressRef = doc(progress, userId);
        const [questSnapshot, progressSnapshot] = await Promise.all([
            transaction.get(questRef), transaction.get(progressRef),
        ]);
        if (!questSnapshot.exists()) throw new Error('Quest not found');
        const quest = readQuest(questSnapshot.id, questSnapshot.data());
        if (quest.userId !== userId) throw new Error('Quest belongs to another user');

        const previous = { ...emptyProgress(userId), ...progressSnapshot.data() };
        if (quest.status === 'claimed' || previous.completedQuests.includes(questId)) return previous;
        const now = new Date();
        const result = evaluateQuest(quest, expenses, now);
        const end = result.endDate && parseExpenseDate(result.endDate);
        if (result.status !== 'completed' || !end || now < end || !Number.isFinite(quest.reward) || quest.reward <= 0) {
            throw new Error('This quest is not eligible for a reward');
        }
        const updated = applyQuestReward(previous, result, now);
        transaction.update(questRef, { status: 'claimed', progress: result.progress, claimedAt: now });
        transaction.set(progressRef, updated, { merge: true });
        return updated;
    });
}

export default { generateQuests, getUserProgress, claimQuestReward };
