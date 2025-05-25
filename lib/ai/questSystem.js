export class QuestSystem {
    /**
     * Generează quest-uri săptămânale pe baza cheltuielilor curente și a bugetului
     */
    static generateWeeklyQuests(transactions, budget) {
        const categorySpending = this.analyzeCategorySpending(transactions);
        const quests = [];
        // Quest-uri specifice pe categorii (dacă depășește 80% din bugetul alocat)
        Object.entries(categorySpending).forEach(([category, amount]) => {
            const budgetCategory = budget.categories.find(c => c.name === category);
            if (!budgetCategory)
                return;
            const totalBudget = budgetCategory.subcategories.reduce((sum, sub) => sum + sub.amount, 0);
            if (amount > totalBudget * 0.8) {
                quests.push({
                    id: `quest-${Date.now()}-${category}`,
                    title: `🎯 ${category} Savings Challenge`,
                    description: `Reduce ${category} spending by 20% this week`,
                    type: 'SAVINGS',
                    category,
                    targetPercentage: 20,
                    reward: 100,
                    deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                    milestones: [
                        { percentage: 5, reward: 20, completed: false },
                        { percentage: 10, reward: 30, completed: false },
                        { percentage: 15, reward: 50, completed: false }
                    ]
                });
            }
        });
        // Quest pentru streak: să stai sub buget 7 zile consecutive
        quests.push({
            id: `quest-${Date.now()}-streak`,
            title: "🔥 Budget Master Streak",
            description: "Stay under budget for 7 consecutive days",
            type: "STREAK",
            category: "all",
            targetPercentage: 100,
            reward: 200,
            deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            milestones: [
                { percentage: 30, reward: 50, completed: false },
                { percentage: 60, reward: 70, completed: false },
                { percentage: 100, reward: 80, completed: false }
            ]
        });
        return quests;
    }
    /**
     * Calculează totalul cheltuielilor pe fiecare categorie
     */
    static analyzeCategorySpending(transactions) {
        return transactions.reduce((acc, t) => {
            acc[t.category] = (acc[t.category] || 0) + t.amount;
            return acc;
        }, {});
    }
    /**
     * Verifică progresul unui quest în funcție de cheltuieli
     * Aici am pus o implementare simplă, doar setează milestone-urile ca finalizate (TODO: extinde după nevoie)
     */
    static checkQuestProgress(quest, transactions) {
        if (quest.type === 'SAVINGS') {
            // Exemplu: calculează cât s-a economisit față de perioada precedentă (simplificat)
            const spent = transactions
                .filter(t => t.category === quest.category)
                .reduce((sum, t) => sum + t.amount, 0);
            // Să presupunem un buget fix pentru calcul progres (exemplu)
            const budgetAmount = 1000;
            const savingsPercent = ((budgetAmount - spent) / budgetAmount) * 100;
            return quest.milestones.map(milestone => ({
                ...milestone,
                completed: savingsPercent >= milestone.percentage,
                rewardClaimed: false
            }));
        }
        // Pentru alte tipuri de quest, marchează toate ca neterminate (sau adaugă logică)
        return quest.milestones.map(milestone => ({
            ...milestone,
            completed: false,
            rewardClaimed: false
        }));
    }
}
