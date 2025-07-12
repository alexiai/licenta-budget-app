// overview/list/index.tsx - with budget period filtering
import { View, Text, FlatList, TouchableOpacity, ImageBackground, Image, Alert } from 'react-native';
import { useEffect, useState, useCallback, useMemo } from 'react';
import { db, auth } from '@lib/firebase';
import { collection, query, where, getDocs, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons, Feather } from '@expo/vector-icons';
import OverviewHeader from '../../../../components/OverviewHeader';
import bg from '@assets/bg/background3.png';
import bunnyIcon from '@assets/icons/bunnyhead.png';
import categories from '@lib/categories';
import { filterExpensesByPeriod, getPeriodTitle } from '@lib/utils/expenseFilters';
import { formatDateToDDMMYYYY } from '@lib/utils/dateUtils';
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
    carrotCoins?: number;
}

const ExpenseItem = ({ expense, isEditing, onDelete }: { 
    expense: Expense; 
    isEditing: boolean; 
    onDelete: (id: string) => void;
}) => {
    const router = useRouter();
    
    return (
        <View style={styles.expenseBox}>
            <TouchableOpacity 
                style={[styles.expenseLeft, isEditing && styles.editableExpense]} 
                onPress={() => isEditing && router.push({
                    pathname: '/tabs/expenses/edit',
                    params: { expenseId: expense.id }
                })}
            >
                <View>
                    <Text style={[styles.subcategory, (expense.subcategory || '').length > 10 && styles.subcategoryMultiline]}>
                        {expense.subcategory || ''}
                    </Text>
                    {expense.source === 'bank' && (
                        <Text style={styles.sourceText}>Bank Transaction</Text>
                    )}
                    {typeof expense.note === 'string' && expense.note.length > 0 && (
                        <Text style={styles.noteText}>{expense.note}</Text>
                    )}
                </View>
            </TouchableOpacity>

            <View style={styles.amountBlock}>
                <View style={styles.amountRow}>
                    <Image source={require('@assets/icons/carrotcoinlist.png')} style={styles.carrotImage} />
                    <Text style={styles.amountText}>{String(expense.amount ?? '')}</Text>
                </View>
                <Text style={styles.carrotCoinText}>CarrotCoins</Text>
            </View>
        </View>
    );
};

export default function OverviewListScreen() {
    const [expensesByDate, setExpensesByDate] = useState<Record<string, Expense[]>>({});
    const [totalCarrotCoins, setTotalCarrotCoins] = useState(0);
    const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
    const [selectedBudget, setSelectedBudget] = useState<any>(null);
    const [periodOffset, setPeriodOffset] = useState(0);
    const [isEditing, setIsEditing] = useState(false);
    const [burrowBalance, setBurrowBalance] = useState<number>(0);
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

    // Memoize the period calculation
    const currentPeriodTitle = useMemo(() => {
        const now = new Date();
        const month = now.getMonth() + periodOffset;
        const year = now.getFullYear() + Math.floor(month / 12);
        const adjustedMonth = ((month % 12) + 12) % 12;
        return new Date(year, adjustedMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    }, [periodOffset]);

    // Memoize the expense data processing
    const expenseData = useMemo(() => {
        return Object.entries(expensesByDate)
            .sort(([dateA], [dateB]) => new Date(dateB).getTime() - new Date(dateA).getTime());
    }, [expensesByDate]);

    // Set up real-time listener with proper cleanup and error handling
    useEffect(() => {
        if (!expensesQuery) return;

        let isMounted = true;
        const unsubscribe = onSnapshot(expensesQuery, 
            (snapshot) => {
                if (!isMounted) return;
                
                const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Expense[];
                setAllExpenses(data);
            }, 
            (error) => {
                console.error('Error listening to expenses:', error);
                // Implement retry logic or show error to user
            }
        );

        return () => {
            isMounted = false;
            unsubscribe();
        };
    }, [expensesQuery]);

    // Process expenses when they change
    useEffect(() => {
        const processExpenses = () => {
            // Restore period filter
            let filtered = allExpenses;
            if (selectedBudget) {
                filtered = filterExpensesByPeriod(allExpenses, selectedBudget, periodOffset);
            } else {
                // Fallback: filter by month if no budget selected
                const now = new Date();
                const month = now.getMonth() + periodOffset;
                const year = now.getFullYear() + Math.floor(month / 12);
                const adjustedMonth = ((month % 12) + 12) % 12;
                const firstDay = new Date(year, adjustedMonth, 1);
                const lastDay = new Date(year, adjustedMonth + 1, 0);
                filtered = allExpenses.filter(exp => {
                    const expDate = new Date(exp.date);
                    return expDate >= firstDay && expDate <= lastDay;
                });
            }
            // Group by dd/mm/yyyy
            const grouped = filtered.reduce((acc, expense) => {
                const date = formatDateToDDMMYYYY(expense.date);
                if (!acc[date]) acc[date] = [];
                acc[date].push(expense);
                return acc;
            }, {} as Record<string, Expense[]>);
            // Debug: log grouped data
            console.log('grouped:', grouped);
            setExpensesByDate(grouped);
            // Calculate total carrot coins
            const total = filtered.reduce((sum, expense) => {
                return sum + (expense.carrotCoins || 0);
            }, 0);
            setTotalCarrotCoins(total);
        };
        processExpenses();
    }, [allExpenses, selectedBudget, periodOffset]);

    // Update burrow balance when expenses or budget change
    useEffect(() => {
        let filtered = allExpenses;
        if (selectedBudget) {
            filtered = filterExpensesByPeriod(allExpenses, selectedBudget, periodOffset);
            const totalExpenses = filtered.reduce((sum, expense) => sum + (expense.amount || 0), 0);
            const budgetAmount = selectedBudget.amount || 0;
            setBurrowBalance(budgetAmount - totalExpenses);
        } else {
            setBurrowBalance(0);
        }
    }, [allExpenses, selectedBudget, periodOffset]);

    // Memoize the render item function
    const renderExpenseItem = useCallback(({ item: [date, expenses] }: { item: [string, Expense[]] }) => {
        return (
            <View style={styles.dateGroup}>
                <Text style={styles.dateTitle}>{date}</Text>
                {expenses.map((expense) => (
                    <ExpenseItem
                        key={expense.id}
                        expense={expense}
                        isEditing={isEditing}
                        onDelete={handleDeleteExpense}
                    />
                ))}
            </View>
        );
    }, [isEditing]);

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

    const handleDeleteExpense = async (id: string) => {
        try {
            await deleteDoc(doc(db, 'expenses', id));
        } catch (error) {
            console.error('Error deleting expense:', error);
            Alert.alert('Error', 'Failed to delete expense. Please try again.');
        }
    };

    return (
        <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
            <OverviewHeader />
            <View style={styles.fixedHeader}>
                <View style={styles.topRow}>
                    <TouchableOpacity 
                        onPress={() => setIsEditing((prev) => !prev)} 
                        style={styles.editButton}
                    >
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

            <FlatList
                data={expenseData}
                keyExtractor={([date]) => date}
                renderItem={renderExpenseItem}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={5}
                removeClippedSubviews={true}
                updateCellsBatchingPeriod={50}
                onEndReachedThreshold={0.5}
                ListEmptyComponent={<Text style={{textAlign:'center',marginTop:40,fontSize:18}}>No expenses to display.</Text>}
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
