import type { UserProgress, UserQuest } from '../types';
import { parseExpenseDate, toISODateString } from './dateUtils';

type QuestExpense = { date: string; amount: number };

export function buildQuests(userId: string, history: {
    averageDailySpending: number;
    previousDailyAverage?: number;
    weeklyStats: { lastWeek: number };
    totalLastMonth: number;
}, now: Date): UserQuest[] {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(day.getFullYear(), day.getMonth(), day.getDate() - (day.getDay() + 6) % 7);
    const month = new Date(day.getFullYear(), day.getMonth(), 1);
    const tomorrow = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1);
    const nextWeek = new Date(week.getFullYear(), week.getMonth(), week.getDate() + 7);
    const nextMonth = new Date(month.getFullYear(), month.getMonth() + 1, 1);

    const create = (type: UserQuest['type'], startDate: Date, endDate: Date,
        title: string, baseline: number, reward: number): UserQuest => {
        const target = Math.floor(baseline * 90) / 100;
        const track = target <= 0;
        return {
            id: `v2-${type}-${toISODateString(startDate)}-${userId}`,
            userId, type, startDate, endDate, reward, level: 1, progress: 0, status: 'active',
            title: track ? `${type[0].toUpperCase()}${type.slice(1)} Expense Check-in` : title,
            description: track ? `Log an expense in this ${type === 'daily' ? 'day' : type === 'weekly' ? 'week' : 'month'}.`
                : `Keep logged spending at or below ${target.toFixed(2)} RON during this period.`,
            target: track ? 1 : target,
            goal: track ? 'log-expense' : 'spending-limit',
        };
    };

    return [
        create('daily', day, tomorrow, 'Daily Budget Master', history.previousDailyAverage ?? history.averageDailySpending, 50),
        create('weekly', week, nextWeek, 'Weekly Saving Hop', history.weeklyStats.lastWeek, 100),
        create('monthly', month, nextMonth, 'Monthly Burrow Saver', history.totalLastMonth, 250),
    ];
}

export function evaluateQuest(quest: UserQuest, expenses: QuestExpense[], now: Date): UserQuest {
    if (quest.status === 'claimed' || !quest.goal) return quest;
    const start = parseExpenseDate(quest.startDate);
    const end = quest.endDate && parseExpenseDate(quest.endDate);
    if (!start || !end) return { ...quest, status: 'failed' };
    let progress = 0;
    for (const expense of expenses) {
        const date = parseExpenseDate(expense.date);
        const amount = Number(expense.amount);
        if (!date || date < start || date >= end || date > now || !Number.isFinite(amount) || amount <= 0) continue;
        progress += quest.goal === 'log-expense' ? 1 : amount;
    }
    progress = Math.round(progress * 100) / 100;
    const achieved = quest.goal === 'log-expense' ? progress >= quest.target : progress <= quest.target;
    // Wait until the period ends so later spending and edits count toward the result.
    const status = now < end ? 'active' : achieved ? 'completed' : 'failed';
    return { ...quest, progress, status };
}

export function applyQuestReward(progress: UserProgress, quest: UserQuest, now: Date): UserProgress {
    if (progress.completedQuests.includes(quest.id)) return progress;
    const totalPoints = progress.totalPoints + quest.reward;
    const questsCompleted = progress.questsCompleted + 1;
    const badges = [...progress.badges];

    const milestones = [
        { id: 'first-hop', name: 'First Hop', description: 'Claim your first quest reward.', icon: '🐰', requirement: 1 },
        { id: 'carrot-collector', name: 'Carrot Collector', description: 'Claim five quest rewards.', icon: '🥕', requirement: 5 },
        { id: 'burrow-champion', name: 'Burrow Champion', description: 'Claim twenty quest rewards.', icon: '🏆', requirement: 20 },
    ];
    for (const milestone of milestones) {
        if (questsCompleted >= milestone.requirement && !badges.some(badge => badge.id === milestone.id)) {
            badges.push({ ...milestone, rarity: 'common', unlockedAt: now });
        }
    }

    return {
        ...progress,
        totalPoints,
        questsCompleted,
        badges,
        level: 1 + Math.floor(totalPoints / 1000),
        pointsToNextLevel: 1000 - totalPoints % 1000,
        lastQuestDate: now,
        completedQuests: [...progress.completedQuests, quest.id],
    };
}
