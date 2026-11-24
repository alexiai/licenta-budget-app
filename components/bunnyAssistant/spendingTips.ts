import type { SpendingAnalysis } from './types';

export interface SpendingTip {
    id: string;
    title: string;
    description: string;
    icon: string;
    impact: 'high' | 'medium' | 'low';
    action?: 'budget' | 'chat' | 'stats';
}

export function generateSpendingTips(analysis: SpendingAnalysis): SpendingTip[] {
    if (!analysis.totalSpent) return [{
        id: 'start-tracking', title: 'Log your first Bunnyspense', icon: '🐰', impact: 'low',
        description: 'A few logged expenses give Bunny a starting point for your spending insights.',
        action: 'chat',
    }];

    const tips: SpendingTip[] = [];
    const { weeklyStats, spendingPatterns, totalThisMonth, totalLastMonth } = analysis;
    if (totalLastMonth > 0 && totalThisMonth > totalLastMonth) {
        const increase = Math.round((totalThisMonth / totalLastMonth - 1) * 100);
        tips.push({
            id: 'monthly-increase', title: 'Spending is higher this month', icon: '📈', impact: 'high',
            description: `You have spent ${increase}% more so far this month than during all of last month. Review the categories that account for the most spending.`,
            action: 'stats',
        });
    } else if (weeklyStats.lastWeek > 0 && weeklyStats.currentWeek > weeklyStats.lastWeek) {
        tips.push({
            id: 'weekly-increase', title: 'Spending is higher this week', icon: '📈', impact: 'high',
            description: `You have spent ${(weeklyStats.currentWeek - weeklyStats.lastWeek).toFixed(2)} RON more so far this week than during all of last week.`,
            action: 'stats',
        });
    }

    const { weekday, weekend } = spendingPatterns.weekdayVsWeekend;
    if (weekday > 0 && weekend / 2 > weekday / 5 * 1.5) {
        tips.push({
            id: 'weekend-pattern', title: 'Weekend spending runs higher', icon: '🎯', impact: 'medium',
            description: 'Your history shows more spending per weekend day than per weekday. Try planning a free activity before the weekend.',
        });
    }

    const flexible = spendingPatterns.essentialVsFlexible.flexible;
    if (flexible >= 20) {
        tips.push({
            id: 'flexible-spending', title: 'Try a smaller flexible-spending allowance', icon: '🥕', impact: 'medium',
            description: `You logged ${flexible.toFixed(2)} RON of flexible spending this month. A 10% reduction would free up ${(flexible * 0.1).toFixed(2)} RON at the same spending pace.`,
            action: 'budget',
        });
    }
    const category = analysis.topCategories[0];
    if (category) {
        tips.push({
            id: 'top-category', title: `Review ${category.category} spending`, icon: '💡', impact: 'low',
            description: `${category.category} accounts for ${Math.round(category.percentage)}% of your logged spending history. Compare this month's category totals before adjusting your next budget.`,
            action: 'stats',
        });
    }
    return tips;
}
