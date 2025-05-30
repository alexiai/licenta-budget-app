import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { auth, db } from '../../../../lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';

interface ExpenseData {
    id: string;
    amount: number;
    category: string;
    subcategory: string;
    date: string;
    note?: string;
}

interface CategoryInsight {
    category: string;
    amount: number;
    percentage: number;
    trend: 'up' | 'down' | 'stable';
    comparison: string;
}

export default function SpendingInsightsCard(): JSX.Element {
    const [loading, setLoading] = useState(true);
    const [insights, setInsights] = useState<CategoryInsight[]>([]);
    const [totalSpent, setTotalSpent] = useState(0);

    useEffect(() => {
        fetchSpendingInsights();
    }, []);

    const fetchSpendingInsights = async () => {
        try {
            const user = auth.currentUser;
            if (!user) return;

            const now = new Date();
            const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

            // Fetch this month's expenses
            const thisMonthQuery = query(
                collection(db, 'expenses'),
                where('userId', '==', user.uid),
                where('date', '>=', thisMonth.toISOString()),
                orderBy('date', 'desc')
            );

            // Fetch last month's expenses
            const lastMonthQuery = query(
                collection(db, 'expenses'),
                where('userId', '==', user.uid),
                where('date', '>=', lastMonth.toISOString()),
                where('date', '<=', endLastMonth.toISOString()),
                orderBy('date', 'desc')
            );

            const [thisMonthSnapshot, lastMonthSnapshot] = await Promise.all([
                getDocs(thisMonthQuery),
                getDocs(lastMonthQuery)
            ]);

            const thisMonthExpenses = thisMonthSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ExpenseData[];

            const lastMonthExpenses = lastMonthSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as ExpenseData[];

            analyzeSpendingInsights(thisMonthExpenses, lastMonthExpenses);
        } catch (error) {
            console.error('Error fetching spending insights:', error);
        } finally {
            setLoading(false);
        }
    };

    const analyzeSpendingInsights = (thisMonth: ExpenseData[], lastMonth: ExpenseData[]) => {
        // Calculate totals by category for this month
        const thisMonthByCategory: { [key: string]: number } = {};
        const lastMonthByCategory: { [key: string]: number } = {};

        let thisMonthTotal = 0;
        thisMonth.forEach(expense => {
            const amount = Number(expense.amount) || 0;
            thisMonthByCategory[expense.category] = (thisMonthByCategory[expense.category] || 0) + amount;
            thisMonthTotal += amount;
        });

        lastMonth.forEach(expense => {
            const amount = Number(expense.amount) || 0;
            lastMonthByCategory[expense.category] = (lastMonthByCategory[expense.category] || 0) + amount;
        });

        // Create insights
        const categoryInsights: CategoryInsight[] = [];

        Object.entries(thisMonthByCategory).forEach(([category, amount]) => {
            const lastMonthAmount = lastMonthByCategory[category] || 0;
            const percentage = thisMonthTotal > 0 ? (amount / thisMonthTotal) * 100 : 0;

            let trend: 'up' | 'down' | 'stable' = 'stable';
            let comparison = '';

            if (lastMonthAmount === 0 && amount > 0) {
                trend = 'up';
                comparison = 'New spending this month';
            } else if (amount > lastMonthAmount) {
                trend = 'up';
                const increase = ((amount - lastMonthAmount) / lastMonthAmount) * 100;
                comparison = `+${increase.toFixed(0)}% vs last month`;
            } else if (amount < lastMonthAmount) {
                trend = 'down';
                const decrease = ((lastMonthAmount - amount) / lastMonthAmount) * 100;
                comparison = `-${decrease.toFixed(0)}% vs last month`;
            } else {
                comparison = 'Same as last month';
            }

            categoryInsights.push({
                category,
                amount,
                percentage,
                trend,
                comparison
            });
        });

        // Sort by amount (highest first) and take top 3
        const sortedInsights = categoryInsights
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 3);

        setInsights(sortedInsights);
        setTotalSpent(thisMonthTotal);
    };

    const getCategoryEmoji = (category: string): string => {
        switch (category) {
            case 'Food & Drinks': return '🥕';
            case 'Transport': return '🚗';
            case 'Housing': return '🏠';
            case 'Health': return '💊';
            case 'Lifestyle': return '👗';
            case 'Entertainment': return '🎮';
            case 'Savings': return '💰';
            default: return '📝';
        }
    };

    const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up': return 'trending-up';
            case 'down': return 'trending-down';
            default: return 'remove';
        }
    };

    const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
        switch (trend) {
            case 'up': return '#ff6b6b';
            case 'down': return '#51cf66';
            default: return '#868e96';
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>🐰 Spending Insights</Text>
                </View>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="small" color="#91483C" />
                    <Text style={styles.loadingText}>Analyzing your carrot spending...</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🐰 Spending Insights</Text>
                <Text style={styles.subtitle}>Your top spending categories this month</Text>
            </View>

            {insights.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyText}>No spending data yet! 🐰</Text>
                    <Text style={styles.emptySubtext}>Start tracking your expenses to see insights</Text>
                </View>
            ) : (
                <View style={styles.insightsContainer}>
                    {insights.map((insight, index) => (
                        <View key={insight.category} style={styles.insightItem}>
                            <View style={styles.insightLeft}>
                                <Text style={styles.categoryEmoji}>{getCategoryEmoji(insight.category)}</Text>
                                <View style={styles.categoryInfo}>
                                    <Text style={styles.categoryName}>{insight.category}</Text>
                                    <Text style={styles.comparison}>{insight.comparison}</Text>
                                </View>
                            </View>
                            <View style={styles.insightRight}>
                                <View style={styles.amountContainer}>
                                    <Text style={styles.amount}>{insight.amount.toFixed(0)} RON</Text>
                                    <Text style={styles.percentage}>{insight.percentage.toFixed(1)}%</Text>
                                </View>
                                <Ionicons
                                    name={getTrendIcon(insight.trend)}
                                    size={20}
                                    color={getTrendColor(insight.trend)}
                                />
                            </View>
                        </View>
                    ))}
                </View>
            )}

            <View style={styles.footer}>
                <Text style={styles.footerText}>
                    💡 Bunny tip: Track your habits to spot spending patterns!
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 8,
        elevation: 3,
        borderWidth: 2,
        borderColor: '#f0f0f0',
    },
    header: {
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Fredoka',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
    },
    loadingText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#666',
        fontFamily: 'Fredoka',
        textAlign: 'center',
    },
    insightsContainer: {
        marginBottom: 16,
    },
    insightItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    insightLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryEmoji: {
        fontSize: 24,
        marginRight: 12,
    },
    categoryInfo: {
        flex: 1,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        fontFamily: 'Fredoka',
        marginBottom: 2,
    },
    comparison: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'Fredoka',
    },
    insightRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    amountContainer: {
        alignItems: 'flex-end',
        marginRight: 12,
    },
    amount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    percentage: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'Fredoka',
    },
    footer: {
        backgroundColor: '#fff0e8',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    footerText: {
        fontSize: 14,
        color: '#91483C',
        fontFamily: 'Fredoka',
        textAlign: 'center',
    },
});
