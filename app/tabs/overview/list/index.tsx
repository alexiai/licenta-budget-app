// overview/list/index.tsx - with budget period filtering
import { View, Text, FlatList, TouchableOpacity, ImageBackground, Image } from 'react-native';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { db, auth } from '@lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import OverviewHeader from '../../../../components/OverviewHeader';
import bg from '@assets/bg/background3.png';
import bunnyIcon from '@assets/icons/bunnyhead.png';
import categories from '@lib/categories';
import { filterExpensesByPeriod, getPeriodTitle } from '@lib/utils/expenseFilters';
import styles from '../../../../styles/overviewList';
import BudgetSelector from '../../../../components/BudgetSelector';

interface Expense {
    id: string;
    userId: string;
    amount: number;
    category: string;
    subcategory: string;
    note?: string;
    date: string;
    source?: string;
}

export default function OverviewListScreen() {
    const [expensesByDate, setExpensesByDate] = useState<Record<string, Expense[]>>({});
    const [totalCarrotCoins, setTotalCarrotCoins] = useState(0);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [selectedBudget, setSelectedBudget] = useState<any>(null);
    const [periodOffset, setPeriodOffset] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const router = useRouter();

    // Memoize the query to prevent unnecessary re-creations
    const expensesQuery = useMemo(() => {
        const user = auth.currentUser;
        if (!user) return null;
        
        return query(
            collection(db, 'expenses'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc')
        );
    }, []);

    // Set up real-time listener with proper cleanup
    useEffect(() => {
        if (!expensesQuery) return;

        const unsubscribe = onSnapshot(expensesQuery, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
            setAllExpenses(data);
        }, (error) => {
            console.error('Error listening to expenses:', error);
        });

        return () => unsubscribe();
    }, [expensesQuery]);

    // Memoize the processExpenses function
    const processExpenses = useCallback(() => {
        if (!allExpenses.length) return;

        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + periodOffset, 1);
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + periodOffset + 1, 0);

        // Filter expenses for the selected month
        const filteredExpenses = allExpenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= firstDayOfMonth && expDate <= lastDayOfMonth;
        });

        const grouped: Record<string, Expense[]> = {};
        let total = 0;

        filteredExpenses.forEach(exp => {
            const date = new Date(exp.date).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric'
            });
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(exp);
            total += parseFloat(exp.amount?.toString() || '0');
        });

        setExpensesByDate(grouped);
        setTotalCarrotCoins(total);
    }, [allExpenses, periodOffset]);

    // Memoize getPeriodTitle
    const currentPeriodTitle = useMemo(() => {
        const currentDate = new Date();
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + periodOffset, 1);
        const startDate = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
        const endDate = lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${startDate} - ${endDate}`;
    }, [periodOffset]);

    useEffect(() => {
        processExpenses();
    }, [processExpenses]);

    // Memoize categoryIcons to prevent recreation on each render
    const categoryIcons = useMemo(() => {
        return categories.reduce((acc, cat) => {
            cat.subcategories.forEach(sub => {
                acc[sub.toLowerCase()] = cat.icon;
            });
            return acc;
        }, {} as Record<string, any>);
    }, []);

    // Memoize the FlatList data to prevent unnecessary re-renders
    const expenseData = useMemo(() => Object.entries(expensesByDate), [expensesByDate]);

    // Memoize the renderItem function to prevent unnecessary re-renders
    const renderExpenseItem = useCallback(({ item: [date, expenses] }: { item: [string, Expense[]] }) => (
        <View style={styles.dateGroup}>
            <Text style={styles.dateTitle}>{date}</Text>
            {expenses.map((exp: Expense) => {
                const icon = categoryIcons[exp.subcategory?.toLowerCase()] || require('@assets/icons/default.png');
                return (
                    <View key={exp.id} style={styles.expenseBox}>
                        <TouchableOpacity 
                            style={[styles.expenseLeft, isEditing && styles.editableExpense]} 
                            onPress={() => isEditing && router.push({
                                pathname: '/tabs/expenses/edit',
                                params: { expenseId: exp.id }
                            })}
                        >
                            <Image source={icon} style={styles.icon} />
                            <View>
                                <Text style={[styles.subcategory, exp.subcategory?.length > 10 && styles.subcategoryMultiline]}>
                                    {exp.subcategory}
                                </Text>
                                {exp.source === 'bank' && (
                                    <Text style={styles.sourceText}>Bank Transaction</Text>
                                )}
                                {exp.note && (
                                    <Text style={styles.noteText}>{exp.note}</Text>
                                )}
                            </View>
                        </TouchableOpacity>

                        <View style={styles.amountBlock}>
                            <View style={styles.amountRow}>
                                <Image source={require('@assets/icons/carrotcoinlist.png')} style={styles.carrotImage} />
                                <Text style={styles.amountText}>{exp.amount}</Text>
                            </View>
                            <Text style={styles.carrotCoinText}>CarrotCoins</Text>
                        </View>
                    </View>
                );
            })}
        </View>
    ), [categoryIcons, isEditing, router]);

    const fetchBudget = async (budgetId: string) => {
        if (!budgetId) return;

        const user = auth.currentUser;
        if (!user) return;

        const q = query(collection(db, 'budgets'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const budget = snapshot.docs.find(doc => doc.id === budgetId);

        if (budget) {
            setSelectedBudget({ id: budget.id, ...budget.data() });
        }
    };

    const handleBudgetChange = (budgetId: string | null) => {
        if (budgetId) {
            fetchBudget(budgetId);
        } else {
            setSelectedBudget(null);
        }
        setPeriodOffset(0); // Reset to current period when budget changes
    };

    return (
        <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
            <OverviewHeader />
            <View style={styles.fixedHeader}>
                <View style={styles.topRow}>
                    <TouchableOpacity onPress={() => setIsEditing((prev) => !prev)} style={styles.editButton}>
                        <Feather name={isEditing ? 'check' : 'edit'} size={22} color="#91483c" />
                    </TouchableOpacity>
                </View>

                <View style={styles.periodNavigation}>
                    <TouchableOpacity
                        style={styles.periodArrow}
                        onPress={() => setPeriodOffset(prev => prev - 1)}
                    >
                        <Ionicons name="chevron-back" size={24} color="#91483c" />
                    </TouchableOpacity>

                    <View style={styles.periodTitle}>
                        <Text style={styles.title}>Your Carrot Trail</Text>
                        <Text style={styles.periodText}>{currentPeriodTitle}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.periodArrow}
                        onPress={() => setPeriodOffset(prev => prev + 1)}
                    >
                        <Ionicons name="chevron-forward" size={24} color="#91483c" />
                    </TouchableOpacity>
                </View>
            </View>

            <Text style={styles.balance}>Burrow Balance: {totalCarrotCoins}</Text>

            <FlatList
                data={expenseData}
                keyExtractor={([date]) => date}
                renderItem={renderExpenseItem}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
            />

            <View style={styles.addBtnWrapper}>
                <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/tabs/expenses/add')}>
                    <Image source={bunnyIcon} style={styles.bunnyIcon} />
                    <Text style={styles.addBtnText}>Add Bunnyspense</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
}
