import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text, ScrollView, TouchableOpacity } from 'react-native';
import SmartTipsCard from './SmartTipsCard';
import UnusedCategoriesCard from './UnusedCategoriesCard';
import WeeklyStatsCard from './WeeklyStatsCard';
import MiniQuestsCard from './MiniQuestsCard';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { expenseService } from '@services/ExpenseService';
import { useAuth } from '../../../../app/_layout';

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
}

interface SmartAdviceSectionProps {
    activeTab: string;
}

export default function SmartAdviceSection({ activeTab }: SmartAdviceSectionProps): JSX.Element {
    const { user } = useAuth();
    const router = useRouter();

    const { data: expenses, loading, error } = expenseService.useExpenses(user?.uid || '');

    if (!user) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Please log in to view smart advice.</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#91483C" />
                <Text style={styles.loadingText}>Analyzing your spending patterns...</Text>
            </View>
        );
    }

    if (error) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>Failed to load data. Please try again.</Text>
            </View>
        );
    }

    // Generate analysis from expenses
    const generateAnalysis = (expensesData: ExpenseData[]): SpendingAnalysis => {
        const now = new Date();
        const analysis: SpendingAnalysis = {
            totalSpent: 0,
            averagePerDay: 0,
            mostExpensiveDay: {
                date: '',
                amount: 0
            },
            topCategories: [],
            unusedCategories: [],
            weeklyTrend: []
        };

        if (!expensesData?.length) return analysis;

        // Calculate total spent and category totals
        const categoryTotals = new Map<string, number>();
        const dailyTotals = new Map<string, number>();

        expensesData.forEach(expense => {
            // Update total spent
            analysis.totalSpent += expense.amount;

            // Update category totals
            const currentCategoryTotal = categoryTotals.get(expense.category) || 0;
            categoryTotals.set(expense.category, currentCategoryTotal + expense.amount);

            // Update daily totals
            const dateKey = new Date(expense.date).toISOString().split('T')[0];
            const currentDailyTotal = dailyTotals.get(dateKey) || 0;
            dailyTotals.set(dateKey, currentDailyTotal + expense.amount);
        });

        // Calculate average per day
        const uniqueDays = dailyTotals.size;
        analysis.averagePerDay = uniqueDays > 0 ? analysis.totalSpent / uniqueDays : 0;

        // Find most expensive day
        let maxAmount = 0;
        let maxDate = '';
        dailyTotals.forEach((amount, date) => {
            if (amount > maxAmount) {
                maxAmount = amount;
                maxDate = date;
            }
        });
        analysis.mostExpensiveDay = {
            date: maxDate,
            amount: maxAmount
        };

        // Calculate top categories
        analysis.topCategories = Array.from(categoryTotals.entries())
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: (amount / analysis.totalSpent) * 100
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // Calculate unused categories
        const allCategories = [
            'Food & Drinks',
            'Transport',
            'Housing',
            'Health',
            'Entertainment',
            'Shopping',
            'Education'
        ];
        analysis.unusedCategories = allCategories.filter(
            category => !categoryTotals.has(category)
        );

        // Calculate weekly trend
        // Group expenses by week
        const weeklyTotals = new Map<string, number>();
        expensesData.forEach(expense => {
            const date = new Date(expense.date);
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay());
            const weekKey = weekStart.toISOString().split('T')[0];
            
            const currentTotal = weeklyTotals.get(weekKey) || 0;
            weeklyTotals.set(weekKey, currentTotal + expense.amount);
        });

        // Convert to array and sort by week
        const sortedWeeks = Array.from(weeklyTotals.entries())
            .sort((a, b) => a[0].localeCompare(b[0]))
            .slice(-4); // Get last 4 weeks

        // Calculate week-over-week change
        analysis.weeklyTrend = sortedWeeks.map((week, index) => {
            const previousWeekAmount = index > 0 ? sortedWeeks[index - 1][1] : week[1];
            const change = ((week[1] - previousWeekAmount) / previousWeekAmount) * 100;
            
            return {
                week: week[0],
                amount: week[1],
                change: isFinite(change) ? change : 0
            };
        });

        return analysis;
    };

    const analysis = generateAnalysis(expenses || []);

    return (
        <ScrollView style={styles.container}>
            {activeTab === 'tips' && <SmartTipsCard analysis={analysis} />}
            {activeTab === 'categories' && <UnusedCategoriesCard analysis={analysis} />}
            {activeTab === 'stats' && <WeeklyStatsCard analysis={analysis} />}
            {activeTab === 'quests' && (
                <MiniQuestsCard analysis={analysis} expenses={expenses || []} />
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loadingText: {
        marginTop: 16,
        textAlign: 'center',
        fontSize: 16,
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    errorText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginTop: 20,
    }
});
