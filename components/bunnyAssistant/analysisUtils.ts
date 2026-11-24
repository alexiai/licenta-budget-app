import { parseExpenseDate, toISODateString } from '../../lib/utils/dateUtils';
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

export function generateSpendingAnalysis(expensesData: ExpenseData[], now = new Date()): SpendingAnalysis {
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


    const startOfWeek = (date: Date) => new Date(
        date.getFullYear(), date.getMonth(), date.getDate() - (date.getDay() + 6) % 7
    );
    const week = startOfWeek(now);
    const lastWeek = new Date(week.getFullYear(), week.getMonth(), week.getDate() - 7);
    const month = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const today = toISODateString(now);
    const daily = new Map<string, number>();
    const weekly = new Map<string, number>();
    const frequency = new Map<string, number>();
    const categories = new Map(ALL_CATEGORIES.map(category => [category, 0]));
    const monthlyCategories = new Map<string, number>();
    const essentials = new Set(['Housing', 'Food & Drinks', 'Transport', 'Health', 'Education']);

    for (const expense of expensesData) {
        const date = parseExpenseDate(expense.date);
        const amount = Number(expense.amount);
        if (!date || !Number.isFinite(amount) || amount <= 0) continue;
        const key = toISODateString(date);
        if (key > today) continue;

        const category = expense.category?.trim() || 'Other';
        analysis.totalSpent += amount;
        categories.set(category, (categories.get(category) ?? 0) + amount);
        frequency.set(category, (frequency.get(category) ?? 0) + 1);
        daily.set(key, (daily.get(key) ?? 0) + amount);

        const weekKey = toISODateString(startOfWeek(date));
        weekly.set(weekKey, (weekly.get(weekKey) ?? 0) + amount);
        if (date >= month) {
            analysis.totalThisMonth += amount;
            monthlyCategories.set(category, (monthlyCategories.get(category) ?? 0) + amount);
        }
        else if (date >= lastMonth) analysis.totalLastMonth += amount;

        const day = date.getDay();
        const spendingPatterns = analysis.spendingPatterns;
        spendingPatterns.weekdayVsWeekend[day === 0 || day === 6 ? 'weekend' : 'weekday'] += amount;
        if (date >= month && category !== 'Savings') {
            const essential = essentials.has(category) && !/^(restaurant|coffee|fast food|delivery|drinks)$/i.test(expense.subcategory);
            spendingPatterns.essentialVsFlexible[essential ? 'essential' : 'flexible'] += amount;
        }

        if (date >= week) {
            const label = ALL_WEEKDAYS[(day + 6) % 7];
            analysis.weeklyStats.dailyBreakdown[label] += amount;
        }
    }

    analysis.monthlyCategoryBreakdown = Object.fromEntries(monthlyCategories);
    analysis.categoryBreakdown = Object.fromEntries(categories);
    analysis.unusedCategories = ALL_CATEGORIES.filter(category => !monthlyCategories.has(category));
    analysis.topCategories = [...categories.entries()]
        .filter(([, amount]) => amount > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, amount]) => ({ category, amount, percentage: amount / analysis.totalSpent * 100 }));
    analysis.spendingPatterns.categoryFrequency = [...frequency.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([category, count]) => ({ category, frequency: count }));

    if (daily.size) {
        const firstDay = [...daily.keys()].sort()[0];
        const elapsedDays = (Date.parse(today) - Date.parse(firstDay)) / 86_400_000 + 1;
        analysis.averagePerDay = analysis.totalSpent / elapsedDays;
        analysis.averageDailySpending = analysis.averagePerDay;
        analysis.previousDailyAverage = elapsedDays > 1
            ? (analysis.totalSpent - (daily.get(today) ?? 0)) / (elapsedDays - 1)
            : 0;
    }
    for (const [date, amount] of daily) {
        if (amount > analysis.mostExpensiveDay.amount) analysis.mostExpensiveDay = { date, amount };
    }

    const orderedWeeks = [...weekly.entries()].sort(([a], [b]) => a.localeCompare(b));
    analysis.weeklyTrend = orderedWeeks.map(([week, amount]) => {
        const previous = parseExpenseDate(week)!;
        previous.setDate(previous.getDate() - 7);
        return { week, amount, change: amount - (weekly.get(toISODateString(previous)) ?? 0) };
    });
    const stats = analysis.weeklyStats;
    stats.currentWeek = weekly.get(toISODateString(week)) ?? 0;
    stats.lastWeek = weekly.get(toISODateString(lastWeek)) ?? 0;
    stats.trend = stats.currentWeek > stats.lastWeek ? 'increasing'
        : stats.currentWeek < stats.lastWeek ? 'decreasing' : 'stable';

    for (const [day, amount] of Object.entries(stats.dailyBreakdown)) {
        if (amount > stats.topSpendingDay.amount) stats.topSpendingDay = { day, amount };
    }
    return analysis;
}
