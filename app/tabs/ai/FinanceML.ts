// tabs/ai/FinanceML.ts

export type Transaction = {
    id?: string;
    category: string;
    subcategory: string;
    amount: number;
    date: string; // ISO string
    [key: string]: any; // alte câmpuri posibile
};

class FinanceML {
    private models: { spending: boolean | null };
    private categories: string[];
    private subcategories: string[];

    constructor() {
        this.models = {
            spending: null,
        };
        this.categories = [
            'Housing', 'Food & Drinks', 'Transport', 'Health', 'Lifestyle',
            'Entertainment', 'Savings', 'Other'
        ];
        this.subcategories = [
            'Rent', 'Electricity', 'Water', 'Internet', 'TV', 'Insurance', 'Home Supplies',
            'Groceries', 'Restaurant', 'Coffee', 'Drinks',
            'Gas', 'Taxi', 'Parking', 'Public Transport', 'Car Insurance', 'Car Loan', 'Flight', 'Repair',
            'Medication', 'Doctor', 'Therapy',
            'Clothes', 'Gym', 'Self-care', 'Subscriptions',
            'Cinema', 'Games', 'Books', 'Concerts',
            'Savings', 'Vacation Savings',
            'Miscellaneous'
        ];
    }

    async trainSpendingModel(transactions: Transaction[]): Promise<boolean | null> {
        if (!transactions.length) return null;
        this.models.spending = true; // simulăm că modelul e antrenat
        return this.models.spending;
    }

    preprocessTransactions(transactions: Transaction[]): any[][] {
        return transactions.map(t => [
            t.amount,
            new Date(t.date).getDay(),
            new Date(t.date).getDate(),
            this.getCategoryIndex(t.category),
            this.getSubcategoryIndex(t.subcategory)
        ]);
    }

    getCategoryIndex(category: string): number {
        const idx = this.categories.indexOf(category);
        return idx >= 0 ? idx : this.categories.length; // fallback unknown
    }

    getSubcategoryIndex(subcategory: string): number {
        const idx = this.subcategories.indexOf(subcategory);
        return idx >= 0 ? idx : this.subcategories.length; // fallback unknown
    }

    async detectAnomalies(transactions: Transaction[]): Promise<(Transaction & { isAnomaly: boolean })[]> {
        if (!this.models.spending) return [];

        const amounts = transactions.map(t => t.amount);
        if (amounts.length === 0) return [];

        const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
        const variance = amounts.reduce((a, b) => a + (b - mean) ** 2, 0) / amounts.length;
        const stdDev = Math.sqrt(variance);
        const threshold = mean + 2 * stdDev;

        return transactions.map(t => ({
            ...t,
            isAnomaly: t.amount > threshold
        }));
    }

    generateInsights(transactions: Transaction[]) {
        const categoryTotals: Record<string, number> = {};
        const weekdaySpending = Array(7).fill(0);

        transactions.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            weekdaySpending[new Date(t.date).getDay()] += t.amount;
        });

        const highestCategory = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])[0] || ['', 0];

        const expensiveDayIndex = weekdaySpending.indexOf(Math.max(...weekdaySpending));

        return {
            highestCategory,
            expensiveDay: expensiveDayIndex
        };
    }
}

export const financeML = new FinanceML();
