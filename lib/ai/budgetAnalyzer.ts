import { Transaction, Budget, AIAdvice } from '../types';
import { QuestSystem } from "./questSystem";
import { financeML } from '../../app/tabs/ai/FinanceML';

export class BunnyAdvisor {
    private static readonly ADVICE_TYPES = {
        QUEST_UPDATE: 'quest_update',
        WEEKLY_REPORT: 'weekly_report',
        ACHIEVEMENT: 'achievement',
        UNUSED_CATEGORY: 'unused_category',
        OVERSPENDING: 'overspending',
        SPENDING_PATTERN: 'spending_pattern',
        SAVINGS_OPPORTUNITY: 'savings_opportunity'
    };

    static async analyzeTransactions(transactions: Transaction[], budget: Budget): Promise<AIAdvice[]> {
        console.log('[🐰] Analyzing transactions with AI...');
        const advice: AIAdvice[] = [];

        // Train ML model
        await financeML.trainSpendingModel(transactions);

        // Detect anomalies
        const anomalies = await financeML.detectAnomalies(transactions);
        const insights = financeML.generateInsights(transactions);

        // Generate ML-based insights
        if (anomalies.length > 0) {
            advice.push({
                type: this.ADVICE_TYPES.SPENDING_PATTERN,
                title: '🔍 Unusual Spending Detected',
                description: `I noticed some unusual spending patterns in ${anomalies[0].category}`,
                score: 0.9,
                category: anomalies[0].category,
                actionable: true,
                suggestedAction: 'Review suspicious transactions',
                carrotCoinsReward: 50
            });
        }

        // Add AI-powered weekly report
        advice.push({
            type: this.ADVICE_TYPES.WEEKLY_REPORT,
            title: '🤖 AI Weekly Analysis',
            description: `Here's what I learned about your spending habits`,
            score: 1.0,
            category: 'all',
            actionable: false,
            insights: [
                `Your highest spending category is ${insights.highestCategory[0]}`,
                `You tend to spend more on ${this.getDayName(insights.expensiveDay)}s`,
                `I've detected ${anomalies.length} unusual transactions`
            ],
            achievements: [
                'Smart Spender 🧠',
                'Pattern Master 📊',
                'Budget AI Friend 🤖'
            ],
            carrotCoinsReward: 100
        });

        // Add existing analysis
        const unusedCategories = this.detectUnusedCategories(transactions, budget);
        unusedCategories.forEach(category => {
            advice.push({
                type: this.ADVICE_TYPES.UNUSED_CATEGORY,
                title: `🥕 Unused Carrot Alert!`,
                description: `Hey buddy! I noticed you haven't used your ${category.name} budget in 3 months. Would you like to save those carrots for something else?`,
                score: 0.8,
                category: category.name,
                actionable: true,
                suggestedAction: `Remove ${category.name} from budget`,
                carrotCoinsReward: 50
            });
        });

        const overspendingCategories = this.detectOverspending(transactions, budget);
        overspendingCategories.forEach(cat => {
            advice.push({
                type: this.ADVICE_TYPES.OVERSPENDING,
                title: `🐰 Friendly Bunny Tip`,
                description: `Whoops! Looks like you're regularly hopping over your ${cat.name} budget. Should we add more carrots here?`,
                score: 0.9,
                category: cat.name,
                actionable: true,
                suggestedAction: `Adjust ${cat.name} budget`,
                carrotCoinsReward: 30
            });
        });

        // Add quest updates
        const activeQuests = QuestSystem.generateWeeklyQuests(transactions, budget);
        activeQuests.forEach(quest => {
            const progress = QuestSystem.checkQuestProgress(quest, transactions);
            console.log(`[🐰] Quest progress for ${quest.title}:`, progress);
            if (progress.some(m => m.completed && !m.rewardClaimed)) {
                advice.push({
                    type: this.ADVICE_TYPES.QUEST_UPDATE,
                    title: '🎯 Quest Milestone Reached!',
                    description: `Hoppy news! You've reached a milestone in "${quest.title}"`,
                    score: 0.9,
                    category: quest.category,
                    actionable: true,
                    suggestedAction: 'Claim reward',
                    carrotCoinsReward: progress.reduce((sum, m) => sum + (m.completed && !m.rewardClaimed ? m.reward : 0), 0)
                });
            }
        });


        console.log('[🐰] Final advice:', advice);
        return advice;
    }

    private static getDayName(day: number): string {
        return ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][day];
    }

    private static generateWeeklyReport(transactions: Transaction[], budget: Budget) {
        const date = new Date();
        const weekStart = new Date(date.setDate(date.getDate() - date.getDay()));

        return {
            summary: "Your weekly carrots report is ready! 🥕",
            insights: [
                "You saved 15% more in groceries this week! 🎯",
                "Weekend spending has decreased 👏",
                "New record: Longest streak of staying under budget! 🌟"
            ],
            achievements: [
                "Savings Superstar 🌟",
                "Budget Master 👑",
                "Consistent Carrot 🥕"
            ]
        };
    }

    private static detectUnusedCategories(transactions: Transaction[], budget: Budget) {
        console.log('[🐰] detectUnusedCategories called');
        const unused: { name: string }[] = [];

        const now = new Date();
        const threshold = new Date();
        threshold.setDate(now.getDate() - 90);

        for (const category of budget.categories) {
            const recentTransactions = transactions.filter(t =>
                t.category === category.name &&
                new Date(t.date) >= threshold
            );
            if (recentTransactions.length === 0) {
                unused.push({ name: category.name });
            }
        }

        console.log('[🐰] unused categories found:', unused);
        return unused;
    }


    private static detectOverspending(transactions: Transaction[], budget: Budget) {
        console.log('[🐰] detectOverspending called');
        const overspentCategories: { name: string }[] = [];

        for (const category of budget.categories) {
            const totalSpent = transactions
                .filter(t => t.category === category.name)
                .reduce((sum, t) => sum + t.amount, 0);

            const totalPlanned = category.subcategories.reduce((sum, s) => sum + s.amount, 0);

            if (totalSpent > totalPlanned) {
                overspentCategories.push({ name: category.name });
            }
        }

        console.log('[🐰] overspent categories found:', overspentCategories);
        return overspentCategories;
    }

}
