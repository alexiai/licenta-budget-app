// ✅ BudgetScreen.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {View, Text, TouchableOpacity, FlatList, ActivityIndicator, ImageBackground, Image,} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@lib/firebase';
import BudgetSelector from '../../../components/BudgetSelector';
import styles from '../../../styles/budget';
import { Dimensions } from 'react-native';
import { PieChart as ChartKitPie } from 'react-native-chart-kit';
import EditBudget from '../../../components/budget/EditBudget';
import bg from '@assets/bg/budgetback.png';
import categories from '@lib/categories';
import { Ionicons } from '@expo/vector-icons';
import { filterExpensesByPeriod, type Expense } from '@lib/utils/expenseFilters';

interface Income {
    type: string;
    amount: string;
}

interface Subcategory {
    name: string;
    amount: string;
}

interface Category {
    name: string;
    subcategories: Subcategory[];
}

interface BudgetData {
    incomes: Income[];
    categories: Category[];
}

interface ChartDataItem {
    name: string;
    value: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
}

export default function BudgetScreen() {
    const router = useRouter();
    const [budgets, setBudgets] = useState<(BudgetData & { id: string; name: string; userId: string; period: string; startDay: string })[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(false);
    const [retry, setRetry] = useState(0);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [showChart, setShowChart] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const budgetData = budgets.find(budget => budget.id === selectedId) ?? budgets[0];
    const selectedBudget = budgetData?.id ?? null;
    const userId = auth.currentUser?.uid;

    useFocusEffect(useCallback(() => {
        let active = true;
        void AsyncStorage.getItem('selectedBudget').then(id => {
            if (active) setSelectedId(id);
        }).catch(() => {});
        return () => { active = false; };
    }, []));

    useEffect(() => {
        if (!userId) return;
        setLoadError(false);
        const budgetsQuery = query(collection(db, 'budgets'), where('userId', '==', userId));
        return onSnapshot(budgetsQuery, snapshot => {
            setBudgets(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as typeof budgets[number])));
            setLoading(false);
        }, () => {
            setLoadError(true);
            setLoading(false);
        });
    }, [userId, retry]);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user) return;
        const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', user.uid));
        return onSnapshot(expensesQuery, snapshot => {
            setExpenses(snapshot.docs.map(item => ({ ...item.data(), id: item.id } as Expense)));
        });
    }, []);

    const getTotalIncome = () => 
        (budgetData?.incomes ?? []).reduce((sum: number, i: Income) => sum + parseFloat(i.amount || '0'), 0);
    
    const getTotalPlannedExpenses = () => 
        (budgetData?.categories ?? []).reduce((sum: number, cat: Category) => 
            sum + (cat.subcategories ?? []).reduce((s: number, sub: Subcategory) => 
                s + parseFloat(sub.amount || '0'), 0), 0);

    const getChartKitData = () => {
        const baseColors = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#6A4C93', '#e5989b'];
        return (budgetData?.categories ?? []).map((cat: Category, index: number) => {
            const total = cat.subcategories?.reduce((sum: number, sub: Subcategory) => sum + parseFloat(sub.amount || '0'), 0);
            return {
                name: cat.name,
                value: total,
                color: baseColors[index % baseColors.length],
                legendFontColor: '#91483c',
                legendFontSize: 13,
            };
        }).filter((entry: ChartDataItem) => entry.value > 0);
    };

    const getSubcategoryIcon = (subName: string) => {
        const found = categories.find(cat => cat.subcategories.includes(subName));
        return found ? found.icon : require('@assets/icons/other.png');
    };

    const toggleChart = () => setShowChart((prev) => !prev);

    if (loading) {
        return (
            <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
                <View style={styles.center}><ActivityIndicator size="large" color="#91483c" /></View>
            </ImageBackground>
        );
    }

    if (!budgetData) {
        return (
            <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
                <View style={styles.center}>
                    <Text>{loadError ? 'Could not load your budgets.' : 'Ready to set up a Burrow Plan?'}</Text>
                    <TouchableOpacity accessibilityRole="button" onPress={loadError
                        ? () => setRetry(value => value + 1)
                        : () => router.push('/tabs/budget/onboarding')}>
                        <Text>{loadError ? 'Try again' : 'Create a budget'}</Text>
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        );
    }

    const totalIncome = getTotalIncome();
    const totalPlanned = getTotalPlannedExpenses();
    const spent = filterExpensesByPeriod(expenses, { ...budgetData, id: selectedBudget })
        .reduce((total, expense) => total + (Number(expense.amount) || 0), 0);
    const remaining = totalIncome - spent;

    return (
        <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
            <View style={styles.fixedHeader}>
                <View style={styles.topRow}>
                    {!isEditing && <View style={styles.budgetSelectorWrapper}>
                        <BudgetSelector 
                            onBudgetChange={setSelectedId}
                            availableBudgets={budgets} 
                            selectedBudget={selectedBudget}
                            onNewBudget={() => router.push('/tabs/budget/onboarding')}
                        />
                    </View>}
                    {!isEditing && <TouchableOpacity accessibilityLabel="Edit budget" onPress={() => setIsEditing(true)} style={styles.editButton}>
                        <Feather name="edit" size={22} color="#91483c" />
                    </TouchableOpacity>}
                </View>
                <Text style={styles.title}>Burrow Plan</Text>
            </View>

            {isEditing ? (
                <EditBudget
                    key={selectedBudget}
                    budgetId={selectedBudget!}
                    categories={budgetData.categories}
                    incomes={budgetData.incomes}
                    onSaved={() => setIsEditing(false)}
                    onCancel={() => setIsEditing(false)}
                />
            ) : (
                <FlatList
                    data={budgetData.categories.filter((cat: Category) => cat.subcategories && cat.subcategories.length > 0)}
                    keyExtractor={(item: Category, index: number) => `cat-${index}`}
                    renderItem={({ item: cat, index }: { item: Category; index: number }) => (
                        <View>
                            <Text style={styles.section}>{cat.name}</Text>
                            {cat.subcategories.map((sub: Subcategory, j: number) => (
                                <View key={`sub-${j}`} style={styles.itemRow}>
                                    <Image source={getSubcategoryIcon(sub.name)} style={styles.categoryIcon} />
                                    <Text style={styles.itemText}>{sub.name}</Text>
                                    <Text style={styles.itemAmount}>{sub.amount} RON</Text>
                                </View>
                            ))}
                        </View>
                    )}
                    ListHeaderComponent={
                        <>
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Budget</Text>
                                <Text style={styles.cardValue}>{totalIncome.toFixed(2)} RON</Text>
                                <View style={styles.progressBarContainer}>
                                    <View style={[styles.progressBar, { width: `${totalIncome > 0 ? Math.min(spent / totalIncome * 100, 100) : 0}%` }]} />
                                </View>
                                <View style={styles.cardRow}>
                                    <Text style={styles.cardSubtitle}>Spent this period</Text>
                                    <Text style={styles.cardSubtitle}>{spent.toFixed(2)} RON</Text>
                                </View>
                                <View style={styles.cardRow}>
                                    <Text style={styles.cardSubtitle}>Remaining this period</Text>
                                    <Text style={styles.cardSubtitle}>{remaining.toFixed(2)} RON</Text>
                                </View>
                                <TouchableOpacity onPress={toggleChart}>
                                    <Text style={styles.chartToggle}>Tap to show chart</Text>
                                </TouchableOpacity>
                                {showChart && (
                                    <View style={styles.chartContainer}>
                                        <View style={styles.pieWrapper}>
                                            <ChartKitPie
                                                data={getChartKitData()}
                                                width={260}
                                                height={150}
                                                accessor="value"
                                                backgroundColor="transparent"
                                                absolute
                                                hasLegend={false}
                                                paddingLeft="0"
                                                chartConfig={{
                                                    color: () => `#000`,
                                                    labelColor: () => 'transparent',
                                                    propsForLabels: { fontSize: 0 },
                                                }}
                                                style={{
                                                    borderRadius: 16,
                                                }}
                                            />
                                        </View>

                                        <View style={styles.chartLegendBox}>
                                            {getChartKitData()
                                                .sort((a: ChartDataItem, b: ChartDataItem) => b.value - a.value)
                                                .map((item: ChartDataItem, i: number) => {
                                                    const totalValue = getChartKitData().reduce((sum: number, entry: ChartDataItem) => sum + entry.value, 0);
                                                    const percent = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(0) : 0;
                                                    return (
                                                        <View key={item.name} style={styles.chartLegendItem}>
                                                            <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                                            <Text style={styles.chartLegendText}>
                                                                {item.name}:<Text style={styles.legendPercent}> {percent}%</Text>
                                                            </Text>
                                                        </View>
                                                    );
                                                })}
                                        </View>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.section}>Income</Text>
                            {budgetData.incomes.map((income: Income, idx: number) => (
                                <View key={`inc-${idx}`} style={styles.itemRow}>
                                    <Image source={require('@assets/icons/income.png')} style={styles.categoryIcon} />
                                    <Text style={styles.itemText}>{income.type}</Text>
                                    <Text style={styles.itemAmount}>{income.amount} RON</Text>
                                </View>
                            ))}
                        </>
                    }
                    contentContainerStyle={{
                        paddingTop: 20,
                        paddingHorizontal: 23,
                        paddingBottom: 20,
                        flexGrow: 1,
                    }}
                    showsVerticalScrollIndicator={false}
                />
            )}
        </ImageBackground>
    );
}
