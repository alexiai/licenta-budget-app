class FinanceML {
    constructor() {
        // Pentru compatibilitate cu codul existent
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

    // Nu antrenăm un model real, doar setăm flag ca să permită detectAnomalies
    async trainSpendingModel(transactions) {
        if (!transactions.length) return null;
        this.models.spending = true; // simulăm că avem modelul antrenat
        return this.models.spending;
    }

    // Preprocesare simplă, compatibilă cu restul codului
    preprocessTransactions(transactions) {
        return transactions.map(t => [
            t.amount,
            new Date(t.date).getDay(),
            new Date(t.date).getDate(),
            this.getCategoryIndex(t.category),
            this.getSubcategoryIndex(t.subcategory)
        ]);
    }

    getCategoryIndex(category) {
        const idx = this.categories.indexOf(category);
        return idx >= 0 ? idx : this.categories.length; // fallback unknown
    }

    getSubcategoryIndex(subcategory) {
        const idx = this.subcategories.indexOf(subcategory);
        return idx >= 0 ? idx : this.subcategories.length; // fallback unknown
    }

    // Detectăm anomalii simplu: tranzacții peste suma medie + 2*deviație standard (simplificat)
    async detectAnomalies(transactions) {
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

    // Generează insight-uri simple pe baza cheltuielilor
    generateInsights(transactions) {
        const categoryTotals = {};
        const weekdaySpending = Array(7).fill(0);

        transactions.forEach(t => {
            categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
            weekdaySpending[new Date(t.date).getDay()] += t.amount;
        });

        // Sortează descrescător și ia categoria cu cea mai mare cheltuială
        const highestCategory = Object.entries(categoryTotals)
            .sort((a, b) => b[1] - a[1])[0] || ['', 0];

        const expensiveDayIndex = weekdaySpending.indexOf(Math.max(...weekdaySpending));

        return {
            highestCategory,
            expensiveDay: expensiveDayIndex
        };
    }
}

module.exports = new FinanceML();
