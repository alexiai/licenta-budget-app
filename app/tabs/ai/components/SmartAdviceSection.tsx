import React, { useState, useEffect } from 'react';
import { View } from 'react-native';
import SmartTipsCard from './SmartTipsCard';
import UnusedCategoriesCard from './UnusedCategoriesCard';
import WeeklyStatsCard from './WeeklyStatsCard';
import MiniQuestsCard from './MiniQuestsCard';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';

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
    topCategories: Array<{ category: string; amount: number; percentage: number }>;
    unusedCategories: string[];
    categoryBreakdown: { [key: string]: number };
    subcategoryBreakdown: { [key: string]: number };
    weeklyStats: {
        currentWeek: number;
        lastWeek: number;
        trend: 'increasing' | 'decreasing' | 'stable';
        dailyBreakdown: { [key: string]: number };
        topSpendingDay: { day: string; amount: number };
    };
    totalSpent: number;
    totalThisMonth: number;
    totalLastMonth: number;
    budgetRemaining?: number;
    averageDailySpending: number;
    spendingPatterns: {
        essentialVsFlexible: { essential: number; flexible: number };
        recentSpikes: Array<{ category: string; increase: number; timeframe: string }>;
        weekdayVsWeekend: { weekday: number; weekend: number };
    };
    seasonalContext: {
        month: string;
        isHolidaySeason: boolean;
        monthlyTrend: 'higher' | 'lower' | 'normal';
    };
}

interface SmartAdviceSectionProps {
    activeTab: 'tips' | 'categories' | 'stats' | 'quests';
}

export default function SmartAdviceSection({ activeTab }: SmartAdviceSectionProps): JSX.Element {
    const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
    const [expenses, setExpenses] = useState<ExpenseData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (auth.currentUser) {
            loadUserExpenses();
        }
    }, []);

    const loadUserExpenses = async () => {
        try {
            const userId = auth.currentUser?.uid;
            if (!userId) return;

            // Get last 3 months of expenses for comprehensive analysis
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            const expensesQuery = query(
                collection(db, 'expenses'),
                where('userId', '==', userId),
                where('date', '>=', threeMonthsAgo.toISOString()),
                orderBy('date', 'desc'),
                limit(500)
            );

            const querySnapshot = await getDocs(expensesQuery);
            const expenseData: ExpenseData[] = [];

            querySnapshot.forEach((doc) => {
                const data = doc.data();
                expenseData.push({
                    id: doc.id,
                    amount: parseFloat(data.amount) || 0,
                    category: data.category || 'Other',
                    subcategory: data.subcategory || 'Other',
                    date: data.date,
                    note: data.note || ''
                });
            });

            const analysisResult = analyzeSpendingPatterns(expenseData);
            setExpenses(expenseData);
            setAnalysis(analysisResult);
        } catch (error) {
            console.error('Error loading expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const analyzeSpendingPatterns = (expenses: ExpenseData[]): SpendingAnalysis => {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        // Current month expenses
        const thisMonthExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === currentMonth && expDate.getFullYear() === currentYear;
        });

        // Last month expenses
        const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
        const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
        const lastMonthExpenses = expenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate.getMonth() === lastMonth && expDate.getFullYear() === lastMonthYear;
        });

        // Calculate totals
        const totalThisMonth = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalLastMonth = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Category breakdown - ensure we're adding numbers, not concatenating strings
        const categoryBreakdown: { [key: string]: number } = {};
        const subcategoryBreakdown: { [key: string]: number } = {};

        thisMonthExpenses.forEach(exp => {
            const amount = Number(exp.amount) || 0;  // Ensure it's a number
            categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + amount;
            subcategoryBreakdown[exp.subcategory] = (subcategoryBreakdown[exp.subcategory] || 0) + amount;
        });

        const topCategories = Object.entries(categoryBreakdown)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: (amount / thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0)) * 100
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // Essential vs Flexible spending analysis
        const essentialCategories = ['Housing', 'Health', 'Transport'];
        const flexibleCategories = ['Entertainment', 'Lifestyle', 'Food & Drinks'];

        const essential = thisMonthExpenses
            .filter(e => essentialCategories.includes(e.category))
            .reduce((sum, e) => sum + e.amount, 0);

        const flexible = thisMonthExpenses
            .filter(e => flexibleCategories.includes(e.category))
            .reduce((sum, e) => sum + e.amount, 0);

        // Spending spikes detection
        const recentSpikes: Array<{ category: string; increase: number; timeframe: string }> = [];
        Object.entries(categoryBreakdown).forEach(([category, thisMonth]) => {
            const lastMonth = lastMonthExpenses
                .filter(e => e.category === category)
                .reduce((sum, e) => sum + e.amount, 0);

            if (lastMonth > 0 && thisMonth > lastMonth * 1.3) {
                recentSpikes.push({
                    category,
                    increase: ((thisMonth - lastMonth) / lastMonth) * 100,
                    timeframe: 'this month'
                });
            }
        });

        // Weekday vs Weekend analysis
        const weekdaySpending = thisMonthExpenses
            .filter(e => {
                const day = new Date(e.date).getDay();
                return day >= 1 && day <= 5; // Monday to Friday
            })
            .reduce((sum, e) => sum + e.amount, 0);

        const weekendSpending = thisMonthExpenses
            .filter(e => {
                const day = new Date(e.date).getDay();
                return day === 0 || day === 6; // Saturday and Sunday
            })
            .reduce((sum, e) => sum + e.amount, 0);

        // Seasonal context
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];
        const isHolidaySeason = currentMonth === 11 || currentMonth === 0; // December or January

        const currentWeekExpenses = expenses.filter(e => {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            return new Date(e.date) >= oneWeekAgo;
        });
        const lastWeekExpenses = expenses.filter(e => {
            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
            const twoWeeksAgo = new Date();
            twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
            const date = new Date(e.date);
            return date >= twoWeeksAgo && date < oneWeekAgo;
        });
        const currentWeekTotal = currentWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
        const lastWeekTotal = lastWeekExpenses.reduce((sum, e) => sum + e.amount, 0);

        const dailyBreakdown: { [key: string]: number } = {};
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

        currentWeekExpenses.forEach(expense => {
            const day = dayNames[new Date(expense.date).getDay()];
            dailyBreakdown[day] = (dailyBreakdown[day] || 0) + expense.amount;
        });

        const topSpendingDay = Object.entries(dailyBreakdown).reduce((max, [day, amount]) =>
            amount > max.amount ? { day, amount } : max, { day: 'Monday', amount: 0 });

        const weeklyTrend = currentWeekTotal > lastWeekTotal * 1.1 ? 'increasing' :
            currentWeekTotal < lastWeekTotal * 0.9 ? 'decreasing' : 'stable';

        const monthlyTrend = totalThisMonth > totalLastMonth * 1.1 ? 'higher' :
            totalThisMonth < totalLastMonth * 0.9 ? 'lower' : 'normal';

        return {
            topCategories,
            unusedCategories: ['Health', 'Savings'], // This could be dynamic based on available categories
            categoryBreakdown,
            subcategoryBreakdown,
            weeklyStats: {
                currentWeek: currentWeekTotal,
                lastWeek: lastWeekTotal,
                trend: weeklyTrend,
                dailyBreakdown,
                topSpendingDay
            },
            totalSpent: totalThisMonth,
            totalThisMonth,
            totalLastMonth,
            averageDailySpending: totalThisMonth / now.getDate(),
            spendingPatterns: {
                essentialVsFlexible: { essential, flexible },
                recentSpikes,
                weekdayVsWeekend: { weekday: weekdaySpending, weekend: weekendSpending }
            },
            seasonalContext: {
                month: monthNames[currentMonth],
                isHolidaySeason,
                monthlyTrend
            }
        };
    };

    const getMockAnalysis = (): SpendingAnalysis => {
        const now = new Date();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'];

        return {
            topCategories: [
                { category: 'Food & Drinks', amount: 850, percentage: 35 },
                { category: 'Transport', amount: 420, percentage: 18 },
                { category: 'Entertainment', amount: 380, percentage: 16 }
            ],
            unusedCategories: ['Health', 'Savings'],
            categoryBreakdown: {
                'Food & Drinks': 850,
                'Transport': 420,
                'Entertainment': 380,
                'Housing': 120,
                'Lifestyle': 95
            },
            subcategoryBreakdown: {
                'Coffee': 120,
                'Restaurant': 380,
                'Groceries': 350,
                'Gas': 250,
                'Movies': 180
            },
            weeklyStats: {
                currentWeek: 245,
                lastWeek: 312,
                trend: 'decreasing',
                dailyBreakdown: {
                    'Monday': 85,
                    'Tuesday': 45,
                    'Wednesday': 32,
                    'Thursday': 28,
                    'Friday': 55
                },
                topSpendingDay: { day: 'Monday', amount: 85 }
            },
            totalSpent: 1865,
            totalThisMonth: 1865,
            totalLastMonth: 1650,
            averageDailySpending: 62,
            spendingPatterns: {
                essentialVsFlexible: { essential: 540, flexible: 1325 },
                recentSpikes: [
                    { category: 'Entertainment', increase: 45, timeframe: 'this month' }
                ],
                weekdayVsWeekend: { weekday: 1200, weekend: 665 }
            },
            seasonalContext: {
                month: monthNames[now.getMonth()],
                isHolidaySeason: now.getMonth() === 11 || now.getMonth() === 0,
                monthlyTrend: 'higher'
            }
        };
    };

    const renderContent = () => {
        if (loading) {
            return <SmartTipsCard analysis={null} />;
        }

        switch (activeTab) {
            case 'tips':
                return <SmartTipsCard analysis={analysis} />;
            case 'categories':
                return <UnusedCategoriesCard analysis={analysis} />;
            case 'stats':
                return <WeeklyStatsCard analysis={analysis} />;
            case 'quests':
                return <MiniQuestsCard analysis={analysis} expenses={expenses} />;
            default:
                return <SmartTipsCard analysis={analysis} />;
        }
    };

    return (
        <View>
            {renderContent()}
        </View>
    );
}
