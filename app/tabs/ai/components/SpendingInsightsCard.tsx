import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { expenseService } from '@services/ExpenseService';
import { useAuth } from '../../../../app/_layout';

interface CategoryInsight {
    category: string;
    currentSpend: number;
    previousSpend: number;
    percentageChange: number;
}

interface ExpenseData {
    id: string;
    amount: number;
    category: string;
    subcategory: string;
    date: string;
    note?: string;
}

export default function SpendingInsightsCard(): JSX.Element {
    const { user } = useAuth();
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

    const { data: thisMonthExpenses, loading: loadingThisMonth } = expenseService.useExpensesByPeriod(
        user?.uid || '',
        thisMonth,
        now
    );

    const { data: lastMonthExpenses, loading: loadingLastMonth } = expenseService.useExpensesByPeriod(
        user?.uid || '',
        lastMonth,
        endLastMonth
    );

    if (!user || loadingThisMonth || loadingLastMonth) {
        return (
            <View style={styles.container}>
                <ActivityIndicator size="large" color="#91483C" />
            </View>
        );
    }

    // Process expenses into insights
    const processExpenses = () => {
        const categoryMap = new Map<string, { current: number; previous: number }>();

        // Process this month's expenses
        thisMonthExpenses?.forEach(expense => {
            const current = categoryMap.get(expense.category)?.current || 0;
            categoryMap.set(expense.category, {
                current: current + expense.amount,
                previous: categoryMap.get(expense.category)?.previous || 0
            });
        });

        // Process last month's expenses
        lastMonthExpenses?.forEach(expense => {
            const previous = categoryMap.get(expense.category)?.previous || 0;
            categoryMap.set(expense.category, {
                current: categoryMap.get(expense.category)?.current || 0,
                previous: previous + expense.amount
            });
        });

        // Calculate insights
        const insights: CategoryInsight[] = Array.from(categoryMap.entries()).map(([category, { current, previous }]) => ({
            category,
            currentSpend: current,
            previousSpend: previous,
            percentageChange: previous === 0 ? 100 : ((current - previous) / previous) * 100
        }));

        return insights.sort((a, b) => Math.abs(b.percentageChange) - Math.abs(a.percentageChange));
    };

    const insights = processExpenses();
    const totalSpent = thisMonthExpenses?.reduce((sum, expense) => sum + expense.amount, 0) || 0;

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Spending Insights</Text>
                <Text style={styles.subtitle}>This Month vs Last Month</Text>
            </View>

            <View style={styles.insightsContainer}>
                {insights.map((insight, index) => (
                    <View key={insight.category} style={styles.insightRow}>
                        <View style={styles.categoryInfo}>
                            <Text style={styles.categoryText}>{insight.category}</Text>
                            <Text style={styles.amountText}>
                                ${insight.currentSpend.toFixed(2)}
                            </Text>
                        </View>
                        <View style={styles.changeInfo}>
                            <Text
                                style={[
                                    styles.percentageText,
                                    { color: insight.percentageChange > 0 ? '#FF6B6B' : '#4CAF50' }
                                ]}
                            >
                                {insight.percentageChange > 0 ? '↑' : '↓'} {Math.abs(insight.percentageChange).toFixed(1)}%
                            </Text>
                        </View>
                    </View>
                ))}
            </View>

            <View style={styles.footer}>
                <Text style={styles.totalText}>
                    Total Spent This Month: ${totalSpent.toFixed(2)}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFF2D8',
        borderRadius: 20,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    header: {
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 4,
        fontFamily: 'Fredoka',
    },
    subtitle: {
        fontSize: 14,
        color: '#8B6914',
        opacity: 0.8,
        fontFamily: 'Fredoka',
    },
    insightsContainer: {
        marginBottom: 16,
    },
    insightRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.1)',
    },
    categoryInfo: {
        flex: 1,
    },
    categoryText: {
        fontSize: 16,
        color: '#91483C',
        marginBottom: 2,
        fontFamily: 'Fredoka',
    },
    amountText: {
        fontSize: 14,
        color: '#8B6914',
        fontFamily: 'Fredoka',
    },
    changeInfo: {
        minWidth: 80,
        alignItems: 'flex-end',
    },
    percentageText: {
        fontSize: 16,
        fontWeight: '500',
        fontFamily: 'Fredoka',
    },
    footer: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
        paddingTop: 16,
    },
    totalText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#91483C',
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
});
