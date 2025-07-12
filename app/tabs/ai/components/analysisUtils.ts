import { ExpenseData, SpendingAnalysis } from './types';

const ALL_CATEGORIES = [
    'Food & Drinks',
    'Transport',
    'Housing',
    'Health',
    'Entertainment',
    'Shopping',
    'Education',
    'Lifestyle',
    'Savings',
    'Other'
];

const ALL_WEEKDAYS = [
    'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];

export function generateSpendingAnalysis(expensesData: ExpenseData[]): SpendingAnalysis {
    const now = new Date();
    const analysis: SpendingAnalysis = {
        totalSpent: 0,
        averagePerDay: 0,
        mostExpensiveDay: { date: '', amount: 0 },
        topCategories: [],
        unusedCategories: [],
        weeklyTrend: [],
        categoryBreakdown: {},
        totalThisMonth: 0,
        totalLastMonth: 0,
        spendingPatterns: {
            essentialVsFlexible: { essential: 0, flexible: 0 },
            weekdayVsWeekend: { weekday: 0, weekend: 0 },
            recentSpikes: [],
            recurringExpenses: [],
            categoryFrequency: [],
            timeBasedSpending: { morning: 0, afternoon: 0, evening: 0, night: 0 },
            locationBasedSpending: {}
        },
        weeklyStats: {
            currentWeek: 0,
            lastWeek: 0,
            trend: 'stable',
            topSpendingDay: { day: '', amount: 0 },
            dailyBreakdown: {
                Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0
            }
        },
        averageDailySpending: 0,
        seasonalContext: { isHolidaySeason: false, currentSeason: '' }
    };

    if (!expensesData?.length) {
        // Fill all categories with 0
        ALL_CATEGORIES.forEach(cat => analysis.categoryBreakdown[cat] = 0);
        return analysis;
    }

    // --- Category Totals ---
    const categoryTotals = new Map<string, number>();
    // --- Daily Totals ---
    const dailyTotals = new Map<string, number>();
    // --- Last Month ---
    let totalLastMonth = 0;
    // --- Daily Breakdown ---
    const dailyBreakdown: Record<string, number> = {};
    ALL_WEEKDAYS.forEach(day => dailyBreakdown[day] = 0);

    expensesData.forEach(expense => {
        const amount = Number(expense.amount) || 0;
        analysis.totalSpent += amount;
        analysis.totalThisMonth += amount;
        // Category totals
        const currentCategoryTotal = categoryTotals.get(expense.category) || 0;
        categoryTotals.set(expense.category, currentCategoryTotal + amount);
        // Daily totals
        const dateKey = new Date(expense.date).toISOString().split('T')[0];
        const currentDailyTotal = dailyTotals.get(dateKey) || 0;
        dailyTotals.set(dateKey, currentDailyTotal + amount);
        // Last month
        const expenseDate = new Date(expense.date);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        if (
            expenseDate.getMonth() === lastMonth.getMonth() &&
            expenseDate.getFullYear() === lastMonth.getFullYear()
        ) {
            totalLastMonth += amount;
        }
        // Daily breakdown
        const day = expenseDate.toLocaleString('en-US', { weekday: 'long' });
        if (dailyBreakdown[day] !== undefined) {
            dailyBreakdown[day] += amount;
        }
    });

    // --- Fill all categories with 0 if missing ---
    ALL_CATEGORIES.forEach(cat => {
        analysis.categoryBreakdown[cat] = categoryTotals.get(cat) || 0;
    });

    // --- Average per day ---
    const uniqueDays = dailyTotals.size;
    analysis.averagePerDay = uniqueDays > 0 ? analysis.totalSpent / uniqueDays : 0;
    analysis.averageDailySpending = analysis.averagePerDay;

    // --- Most expensive day ---
    let maxAmount = 0;
    let maxDate = '';
    dailyTotals.forEach((amount, date) => {
        if (amount > maxAmount) {
            maxAmount = amount;
            maxDate = date;
        }
    });
    analysis.mostExpensiveDay = { date: maxDate, amount: maxAmount };

    // --- Top categories ---
    analysis.topCategories = ALL_CATEGORIES.map(category => ({
        category,
        amount: analysis.categoryBreakdown[category],
        percentage: analysis.totalSpent > 0 ? (analysis.categoryBreakdown[category] / analysis.totalSpent) * 100 : 0
    })).sort((a, b) => b.amount - a.amount).slice(0, 5);

    // --- Unused categories ---
    analysis.unusedCategories = ALL_CATEGORIES.filter(cat => analysis.categoryBreakdown[cat] === 0);

    // --- Weekly trend ---
    const weeklyTotals = new Map<string, number>();
    expensesData.forEach(expense => {
        const amount = Number(expense.amount) || 0;
        const date = new Date(expense.date);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        const currentTotal = weeklyTotals.get(weekKey) || 0;
        weeklyTotals.set(weekKey, currentTotal + amount);
    });
    const sortedWeeks = Array.from(weeklyTotals.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));
    analysis.weeklyTrend = sortedWeeks.map(([week, amount], i, arr) => ({
        week,
        amount,
        change: i === 0 ? 0 : amount - arr[i - 1][1]
    }));
    if (sortedWeeks.length > 0) {
        analysis.weeklyStats.currentWeek = sortedWeeks[sortedWeeks.length - 1][1];
        analysis.weeklyStats.lastWeek = sortedWeeks.length > 1 ? sortedWeeks[sortedWeeks.length - 2][1] : 0;
        if (analysis.weeklyStats.currentWeek > analysis.weeklyStats.lastWeek) analysis.weeklyStats.trend = 'increasing';
        else if (analysis.weeklyStats.currentWeek < analysis.weeklyStats.lastWeek) analysis.weeklyStats.trend = 'decreasing';
        else analysis.weeklyStats.trend = 'stable';
    }

    // --- Top spending day in week ---
    let topDay = '';
    let topDayAmount = 0;
    Object.entries(dailyBreakdown).forEach(([day, amount]) => {
        if (amount > topDayAmount) {
            topDay = day;
            topDayAmount = amount;
        }
    });
    analysis.weeklyStats.topSpendingDay = { day: topDay, amount: topDayAmount };
    analysis.weeklyStats.dailyBreakdown = dailyBreakdown;

    // --- Last month ---
    analysis.totalLastMonth = totalLastMonth;

    // --- Defensive: never NaN ---
    if (!isFinite(analysis.averagePerDay)) analysis.averagePerDay = 0;
    if (!isFinite(analysis.averageDailySpending)) analysis.averageDailySpending = 0;
    if (!isFinite(analysis.totalThisMonth)) analysis.totalThisMonth = 0;
    if (!isFinite(analysis.totalLastMonth)) analysis.totalLastMonth = 0;

    return analysis;
} 