
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import SmartTipsCard from './SmartTipsCard';
import UnusedCategoriesCard from './UnusedCategoriesCard';
import WeeklyStatsCard from './WeeklyStatsCard';
import MiniQuestsCard from './MiniQuestsCard';
import SpendingInsightsCard from './SpendingInsightsCard';

export interface ExpenseData {
    id: string;
    amount: number;
    category: string;
    subcategory: string;
    date: string;
    note?: string;
    userId: string;
}

export interface SpendingAnalysis {
    totalThisMonth: number;
    totalLastMonth: number;
    categoryBreakdown: { [key: string]: number };
    subcategoryBreakdown: { [key: string]: number };
    averageDailySpending: number;
    topCategories: Array<{ category: string; amount: number; percentage: number }>;
    spendingTrends: Array<{ date: string; amount: number }>;
    unusedCategories: string[];
}

export default function SmartAdviceSection(): JSX.Element {
    const [loading, setLoading] = useState(true);
    const [expenses, setExpenses] = useState<ExpenseData[]>([]);
    const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
    const [activeCard, setActiveCard] = useState<string>('tips');

    useEffect(() => {
        loadUserExpenses();
    }, []);

    const loadUserExpenses = async () => {
        const user = auth.currentUser;
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            // Get expenses from last 3 months for better analysis
            const threeMonthsAgo = new Date();
            threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

            const expensesQuery = query(
                collection(db, 'expenses'),
                where('userId', '==', user.uid),
                where('date', '>=', threeMonthsAgo.toISOString()),
                orderBy('date', 'desc'),
                limit(1000)
            );

            const snapshot = await getDocs(expensesQuery);
            const expenseData: ExpenseData[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ExpenseData));

            setExpenses(expenseData);

            // Analyze spending patterns
            const spendingAnalysis = analyzeSpendingPatterns(expenseData);
            setAnalysis(spendingAnalysis);

        } catch (error) {
            console.error('Error loading expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const analyzeSpendingPatterns = (expenses: ExpenseData[]): SpendingAnalysis => {
        const now = new Date();
        const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

        // Filter expenses by month
        const thisMonthExpenses = expenses.filter(exp =>
            new Date(exp.date) >= thisMonth
        );
        const lastMonthExpenses = expenses.filter(exp =>
            new Date(exp.date) >= lastMonth && new Date(exp.date) <= endLastMonth
        );

        // Calculate totals
        const totalThisMonth = thisMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const totalLastMonth = lastMonthExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        // Category breakdown
        const categoryBreakdown: { [key: string]: number } = {};
        const subcategoryBreakdown: { [key: string]: number } = {};

        thisMonthExpenses.forEach(exp => {
            categoryBreakdown[exp.category] = (categoryBreakdown[exp.category] || 0) + exp.amount;
            subcategoryBreakdown[exp.subcategory] = (subcategoryBreakdown[exp.subcategory] || 0) + exp.amount;
        });

        // Top categories
        const topCategories = Object.entries(categoryBreakdown)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: (amount / totalThisMonth) * 100
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // Average daily spending
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const currentDay = now.getDate();
        const averageDailySpending = totalThisMonth / currentDay;

        // Spending trends (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentExpenses = expenses.filter(exp =>
            new Date(exp.date) >= thirtyDaysAgo
        );

        const dailySpending: { [key: string]: number } = {};
        recentExpenses.forEach(exp => {
            const dateKey = exp.date.split('T')[0];
            dailySpending[dateKey] = (dailySpending[dateKey] || 0) + exp.amount;
        });

        const spendingTrends = Object.entries(dailySpending)
            .map(([date, amount]) => ({ date, amount }))
            .sort((a, b) => a.date.localeCompare(b.date));

        // Find unused categories
        const allCategories = [
            'Housing', 'Food & Drinks', 'Transport', 'Health',
            'Lifestyle', 'Entertainment', 'Savings', 'Other'
        ];
        const usedCategories = Object.keys(categoryBreakdown);
        const unusedCategories = allCategories.filter(cat => !usedCategories.includes(cat));

        return {
            totalThisMonth,
            totalLastMonth,
            categoryBreakdown,
            subcategoryBreakdown,
            averageDailySpending,
            topCategories,
            spendingTrends,
            unusedCategories
        };
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#91483C" />
                <Text style={styles.loadingText}>🐰 Analyzing your spending patterns...</Text>
            </View>
        );
    }

    if (!analysis) {
        return (
            <View style={styles.noDataContainer}>
                <Text style={styles.noDataEmoji}>🐰💤</Text>
                <Text style={styles.noDataTitle}>No expense data found</Text>
                <Text style={styles.noDataText}>
                    Start adding expenses to get personalized financial advice from your bunny assistant!
                </Text>
            </View>
        );
    }

    const cards = [
        { id: 'tips', title: '🥕 Smart Tips', icon: 'bulb' },
        { id: 'categories', title: '📊 Unused Categories', icon: 'pie-chart' },
        { id: 'stats', title: '📈 Weekly Stats', icon: 'trending-up' },
        { id: 'quests', title: '🎯 Mini Quests', icon: 'trophy' },
        { id: 'insights', title: '🔍 Insights', icon: 'analytics' },
    ];

    const renderActiveCard = () => {
        switch (activeCard) {
            case 'tips':
                return <SmartTipsCard analysis={analysis} expenses={expenses} />;
            case 'categories':
                return <UnusedCategoriesCard analysis={analysis} />;
            case 'stats':
                return <WeeklyStatsCard analysis={analysis} expenses={expenses} />;
            case 'quests':
                return <MiniQuestsCard analysis={analysis} expenses={expenses} />;
            case 'insights':
                return <SpendingInsightsCard analysis={analysis} expenses={expenses} />;
            default:
                return <SmartTipsCard analysis={analysis} expenses={expenses} />;
        }
    };

    return (
        <View style={styles.container}>
            {/* Card selector */}
            <ScrollView
                horizontal
                style={styles.cardSelector}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardSelectorContent}
            >
                {cards.map((card) => (
                    <TouchableOpacity
                        key={card.id}
                        style={[
                            styles.cardTab,
                            activeCard === card.id && styles.activeCardTab
                        ]}
                        onPress={() => setActiveCard(card.id)}
                    >
                        <Ionicons
                            name={card.icon as any}
                            size={20}
                            color={activeCard === card.id ? '#fff' : '#91483C'}
                        />
                        <Text style={[
                            styles.cardTabText,
                            activeCard === card.id && styles.activeCardTabText
                        ]}>
                            {card.title}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Active card content */}
            <View style={styles.cardContent}>
                {renderActiveCard()}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    loadingText: {
        fontSize: 16,
        color: '#91483C',
        marginTop: 16,
        textAlign: 'center',
    },
    noDataContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    noDataEmoji: {
        fontSize: 48,
        marginBottom: 16,
    },
    noDataTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
        textAlign: 'center',
    },
    noDataText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 24,
    },
    cardSelector: {
        marginBottom: 16,
    },
    cardSelectorContent: {
        paddingHorizontal: 4,
    },
    cardTab: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff0e8',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: '#91483C',
    },
    activeCardTab: {
        backgroundColor: '#91483C',
        borderColor: '#91483C',
    },
    cardTabText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '600',
        color: '#91483C',
    },
    activeCardTabText: {
        color: '#fff',
    },
    cardContent: {
        flex: 1,
    },
});
