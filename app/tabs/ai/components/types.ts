// Shared types for AI Assistant components

export interface ExpenseData {
    id: string;
    amount: number;
    category: string;
    subcategory: string;
    date: string;
    note?: string;
    userId?: string;
}

export interface SpendingAnalysis {
    totalSpent: number;
    averagePerDay: number;
    mostExpensiveDay: {
        date: string;
        amount: number;
    };
    topCategories: Array<{
        category: string;
        amount: number;
        percentage: number;
    }>;
    unusedCategories: string[];
    weeklyTrend: Array<{
        week: string;
        amount: number;
        change: number;
    }>;
    spendingPatterns: {
        essentialVsFlexible: {
            essential: number;
            flexible: number;
        };
        weekdayVsWeekend: {
            weekday: number;
            weekend: number;
        };
        recentSpikes: Array<{
            category: string;
            amount: number;
            date: string;
        }>;
        recurringExpenses: Array<{
            category: string;
            amount: number;
            frequency: string;
        }>;
        categoryFrequency: Array<{
            category: string;
            frequency: number;
        }>;
        timeBasedSpending: {
            morning: number;
            afternoon: number;
            evening: number;
            night: number;
        };
        locationBasedSpending: Record<string, number>;
    };
    weeklyStats: {
        currentWeek: number;
        lastWeek: number;
        trend: 'increasing' | 'decreasing' | 'stable';
        topSpendingDay: {
            day: string;
            amount: number;
        };
        dailyBreakdown: Record<string, number>;
    };
    averageDailySpending: number;
    seasonalContext: {
        isHolidaySeason: boolean;
        currentSeason: string;
    };
    categoryBreakdown: Record<string, number>;
    totalThisMonth: number;
    totalLastMonth: number;
} 