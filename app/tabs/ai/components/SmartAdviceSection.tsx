import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator, Text, ScrollView, TouchableOpacity } from 'react-native';
import SmartTipsCard from './SmartTipsCard';
import UnusedCategoriesCard from './UnusedCategoriesCard';
import WeeklyStatsCard from './WeeklyStatsCard';
import MiniQuestsCard from './MiniQuestsCard';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { useRouter } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';

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
    totalThisMonth: number;
    totalLastMonth: number;
    averageDailySpending: number;
    topCategories: {
        category: string;
        amount: number;
        percentage: number;
    }[];
    categoryBreakdown: {
        [key: string]: number;
    };
    subcategoryBreakdown: {
        [key: string]: number;
    };
    unusedCategories: string[];
    weeklyStats: {
        currentWeek: number;
        lastWeek: number;
        trend: 'increasing' | 'decreasing' | 'stable';
        topSpendingDay: {
            day: string;
            amount: number;
        };
        dailyBreakdown: {
            [key: string]: number;
        };
    };
    spendingPatterns: {
        essentialVsFlexible: {
            essential: number;
            flexible: number;
        };
        recentSpikes: {
            category: string;
            increase: number;
            timeframe: string;
        }[];
        weekdayVsWeekend: {
            weekday: number;
            weekend: number;
        };
        todayTotal: number;
    };
    seasonalContext: {
        month: string;
        isHolidaySeason: boolean;
    };
}

interface SmartAdviceSectionProps {
    activeTab: 'tips' | 'categories' | 'stats' | 'quests';
}

interface ActionButton {
    title: string;
    description: string;
    action: () => void;
    icon: string;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 16,
        marginTop: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        backgroundColor: '#FFF2D8',
        borderRadius: 16,
        padding: 12,
        marginTop: 8,
    },
    alertContainer: {
        backgroundColor: '#FFEBEE',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        marginTop: 24,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        fontSize: 14,
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginTop: 8,
    },
    actionButtonsContainer: {
        marginTop: 16,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF2D8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: '#FFE4B5',
    },
    actionIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    actionContent: {
        flex: 1,
    },
    actionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginBottom: 4,
    },
    actionDescription: {
        fontSize: 14,
        color: '#8B6914',
        fontFamily: 'Fredoka',
    },
});

export default function SmartAdviceSection({ activeTab }: SmartAdviceSectionProps): JSX.Element {
    const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
    const [expenses, setExpenses] = useState<ExpenseData[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = auth.currentUser;
                if (!user) {
                    setLoading(false);
                    return;
                }

                // Fetch expenses
                const expensesRef = collection(db, 'expenses');
                const expensesQuery = query(
                    expensesRef,
                    where('userId', '==', user.uid),
                    orderBy('date', 'desc'),
                    limit(100)
                );
                const expensesSnapshot = await getDocs(expensesQuery);
                const expensesData = expensesSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as ExpenseData[];

                setExpenses(expensesData);

                // Generate analysis
                const analysisData = generateAnalysis(expensesData);
                setAnalysis(analysisData);

                setLoading(false);
            } catch (error) {
                console.error('Error fetching data:', error);
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const generateAnalysis = (expensesData: ExpenseData[]): SpendingAnalysis => {
        // Calculate total this month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
        
        const thisMonthExpenses = expensesData.filter(e => new Date(e.date) >= startOfMonth);
        const lastMonthExpenses = expensesData.filter(e => {
            const date = new Date(e.date);
            return date >= startOfLastMonth && date <= endOfLastMonth;
        });
        
        const totalThisMonth = thisMonthExpenses.reduce((sum, e) => sum + e.amount, 0);
        const totalLastMonth = lastMonthExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Calculate average daily spending
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const averageDailySpending = totalThisMonth / daysInMonth;

        // Calculate category breakdown
        const categoryBreakdown: { [key: string]: number } = {};
        const subcategoryBreakdown: { [key: string]: number } = {};
        expensesData.forEach(expense => {
            categoryBreakdown[expense.category] = (categoryBreakdown[expense.category] || 0) + expense.amount;
            subcategoryBreakdown[expense.subcategory] = (subcategoryBreakdown[expense.subcategory] || 0) + expense.amount;
        });

        // Calculate top categories
        const topCategories = Object.entries(categoryBreakdown)
            .map(([category, amount]) => ({
                category,
                amount,
                percentage: (amount / totalThisMonth) * 100
            }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);

        // Find unused categories
        const allCategories = [
            'Food & Drinks',
            'Shopping',
            'Transportation',
            'Entertainment',
            'Bills & Utilities',
            'Health',
            'Education',
            'Travel',
            'Gifts',
            'Other'
        ];
        const unusedCategories = allCategories.filter(category => !categoryBreakdown[category]);

        // Calculate weekly stats
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfLastWeek = new Date(startOfWeek);
        startOfLastWeek.setDate(startOfWeek.getDate() - 7);

        const thisWeekExpenses = expensesData.filter(e => new Date(e.date) >= startOfWeek);
        const lastWeekExpenses = expensesData.filter(e => {
            const date = new Date(e.date);
            return date >= startOfLastWeek && date < startOfWeek;
        });

        const currentWeek = thisWeekExpenses.reduce((sum, e) => sum + e.amount, 0);
        const lastWeek = lastWeekExpenses.reduce((sum, e) => sum + e.amount, 0);

        // Calculate daily breakdown
        const dailyBreakdown: { [key: string]: number } = {};
        thisWeekExpenses.forEach(expense => {
            const day = new Date(expense.date).toLocaleDateString('en-US', { weekday: 'long' });
            dailyBreakdown[day] = (dailyBreakdown[day] || 0) + expense.amount;
        });

        // Find top spending day
        const topSpendingDay = Object.entries(dailyBreakdown)
            .reduce((max, [day, amount]) => 
                amount > (max.amount || 0) ? { day, amount } : max
            , { day: '', amount: 0 });

        // Calculate spending patterns
        const essentialCategories = ['Bills & Utilities', 'Health', 'Education', 'Transportation'];
        const essentialSpending = expensesData
            .filter(e => essentialCategories.includes(e.category))
            .reduce((sum, e) => sum + e.amount, 0);
        const flexibleSpending = expensesData
            .filter(e => !essentialCategories.includes(e.category))
            .reduce((sum, e) => sum + e.amount, 0);

        // Calculate weekday vs weekend spending
        const weekdaySpending = expensesData
            .filter(e => {
                const day = new Date(e.date).getDay();
                return day >= 1 && day <= 5;
            })
            .reduce((sum, e) => sum + e.amount, 0);
        const weekendSpending = expensesData
            .filter(e => {
                const day = new Date(e.date).getDay();
                return day === 0 || day === 6;
            })
            .reduce((sum, e) => sum + e.amount, 0);

        // Calculate today's total
        const today = now.toISOString().split('T')[0];
        const todayTotal = expensesData
            .filter(e => e.date.split('T')[0] === today)
            .reduce((sum, e) => sum + e.amount, 0);

        // Find spending spikes
        const recentSpikes = Object.entries(categoryBreakdown)
            .map(([category, amount]) => {
                const lastMonthAmount = expensesData
                    .filter(e => {
                        const date = new Date(e.date);
                        return date.getMonth() === now.getMonth() - 1 && e.category === category;
                    })
                    .reduce((sum, e) => sum + e.amount, 0);
                
                const increase = amount - lastMonthAmount;
                return {
                    category,
                    increase,
                    timeframe: 'month'
                };
            })
            .filter(spike => spike.increase > 0)
            .sort((a, b) => b.increase - a.increase)
            .slice(0, 3);

        return {
            totalThisMonth,
            totalLastMonth,
            averageDailySpending,
            topCategories,
            categoryBreakdown,
            subcategoryBreakdown,
            unusedCategories,
            weeklyStats: {
                currentWeek,
                lastWeek,
                trend: currentWeek > lastWeek ? 'increasing' : currentWeek < lastWeek ? 'decreasing' : 'stable',
                topSpendingDay,
                dailyBreakdown
            },
            spendingPatterns: {
                essentialVsFlexible: {
                    essential: essentialSpending,
                    flexible: flexibleSpending
                },
                recentSpikes,
                weekdayVsWeekend: {
                    weekday: weekdaySpending,
                    weekend: weekendSpending
                },
                todayTotal
            },
            seasonalContext: {
                month: now.toLocaleString('default', { month: 'long' }),
                isHolidaySeason: now.getMonth() === 11 // December
            }
        };
    };

    const generateActionButtons = (analysis: SpendingAnalysis): ActionButton[] => {
        const buttons: ActionButton[] = [];

        // Add budget optimization button if flexible spending is high
        if (analysis.spendingPatterns.essentialVsFlexible.flexible > analysis.spendingPatterns.essentialVsFlexible.essential * 0.6) {
            buttons.push({
                title: 'Optimize Budget',
                description: 'Get personalized tips to reduce flexible spending',
                action: () => {
                    // Navigate to budget optimization screen
                    router.push('/(tabs)/budget/optimization' as any);
                },
                icon: '💰'
            });
        }

        // Add savings goal button if spending is below average
        if (analysis.totalThisMonth < analysis.totalLastMonth * 0.9) {
            buttons.push({
                title: 'Set Savings Goal',
                description: 'You\'re spending less! Set a savings goal to stay motivated',
                action: () => {
                    // Navigate to savings goals screen
                    router.push('/(tabs)/budget/savings' as any);
                },
                icon: '🎯'
            });
        }

        // Add category analysis button if there are spending spikes
        if (analysis.spendingPatterns.recentSpikes.length > 0) {
            buttons.push({
                title: 'Analyze Categories',
                description: 'Review categories with unusual spending patterns',
                action: () => {
                    // Navigate to category analysis screen
                    router.push('/(tabs)/budget/categories' as any);
                },
                icon: '📊'
            });
        }

        return buttons;
    };

    const renderContent = () => {
        if (loading) {
            return (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#91483C" />
                    <Text style={styles.loadingText}>Loading your insights...</Text>
                </View>
            );
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
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {renderContent()}

            {analysis && (
                <View style={styles.actionButtonsContainer}>
                    {generateActionButtons(analysis).map((button, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.actionButton}
                            onPress={button.action}
                        >
                            <Text style={styles.actionIcon}>{button.icon}</Text>
                            <View style={styles.actionContent}>
                                <Text style={styles.actionTitle}>{button.title}</Text>
                                <Text style={styles.actionDescription}>{button.description}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={24} color="#91483C" />
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </ScrollView>
    );
}
