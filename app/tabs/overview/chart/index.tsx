// chart/index.tsx - with budget period filtering
import { ScrollView, Text, View, Image, ImageBackground, Dimensions, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useEffect, useState } from 'react';
import { auth, db } from '@lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import styles from '../../../../styles/overviewChart';
import OverviewHeader from '../../../../components/OverviewHeader';
import bg from '@assets/bg/background3.png';
import carrotIcon from '@assets/icons/carrotcoinlist.png';
import categories from '@lib/categories';
import { filterExpensesByPeriod, getPeriodTitle } from '@lib/utils/expenseFilters';

interface Expense {
    date: string;
    amount: string;
    category: string;
    subcategory: string;
}

interface CategoryInsights {
    [category: string]: {
        [subcategory: string]: Expense[];
    };
}

interface PieDataItem {
    name: string;
    value: number;
}

export default function ChartOverview() {
    const screenWidth = Dimensions.get('window').width;
    const [allExpenses, setAllExpenses] = useState<any[]>([]);
    const [insights, setInsights] = useState<any>({});
    const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
    const [expandedSubcategories, setExpandedSubcategories] = useState<{ [key: string]: boolean }>({});
    const [total, setTotal] = useState<number>(0);
    const [pieData, setPieData] = useState<any[]>([]);
    const [selectedBudget, setSelectedBudget] = useState<any>(null);
    const [periodOffset, setPeriodOffset] = useState(0);

    const fetchExpenses = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const expenses = snapshot.docs.map(doc => doc.data());
        setAllExpenses(expenses);
    };

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

    const processExpenses = () => {
        if (!allExpenses.length) return;

        let filteredExpenses = allExpenses;
        const currentDate = new Date();
        const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + periodOffset, 1);
        const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + periodOffset + 1, 0);

        // Filter expenses for the selected month
        filteredExpenses = allExpenses.filter(exp => {
            const expDate = new Date(exp.date);
            return expDate >= firstDayOfMonth && expDate <= lastDayOfMonth;
        });

        // Process filtered expenses for insights
        const categoryInsights: CategoryInsights = {};
        let monthTotal = 0;

        filteredExpenses.forEach((exp: Expense) => {
            if (!categoryInsights[exp.category]) {
                categoryInsights[exp.category] = {};
            }
            if (!categoryInsights[exp.category][exp.subcategory]) {
                categoryInsights[exp.category][exp.subcategory] = [];
            }
            categoryInsights[exp.category][exp.subcategory].push(exp);
            monthTotal += parseFloat(exp.amount || '0');
        });

        setInsights(categoryInsights);
        setTotal(monthTotal);

        const colors = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#6A4C93', '#e5989b'];

        // Update pie chart data
        const newPieData = categories.map((cat, i) => {
            const sum = Object.values(categoryInsights[cat.label] || {})
                .flat()
                .reduce((acc: number, exp: Expense) => acc + parseFloat(exp.amount || '0'), 0);

            return {
                name: cat.label,
                value: sum,
                color: colors[i % colors.length],
                legendFontColor: '#91483c',
                legendFontSize: 13,
            };
        }).filter(item => item.value > 0);

        setPieData(newPieData);
    };

    const getPeriodTitle = () => {
        const currentDate = new Date();
        const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + periodOffset, 1);
        const startDate = targetDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const lastDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
        const endDate = lastDay.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${startDate} - ${endDate}`;
    };

    const navigatePeriod = (direction: 'prev' | 'next') => {
        setPeriodOffset(prev => prev + (direction === 'prev' ? -1 : 1));
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    useEffect(() => {
        processExpenses();
    }, [allExpenses, selectedBudget, periodOffset]);

    const handleBudgetChange = (budgetId: string | null) => {
        if (budgetId) {
            fetchBudget(budgetId);
        } else {
            setSelectedBudget(null);
        }
        setPeriodOffset(0); // Reset to current period when budget changes
    };

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const newState = { ...prev, [cat]: !prev[cat] };

            if (!newState[cat]) {
                setExpandedSubcategories(prevSubs => {
                    const newSubs = { ...prevSubs };
                    Object.keys(insights[cat] || {}).forEach(sub => {
                        newSubs[sub] = false;
                    });
                    return newSubs;
                });
            }

            return newState;
        });
    };

    const toggleSubcategory = (sub: string) => {
        setExpandedSubcategories(prev => ({
            ...prev,
            [sub]: !prev[sub]
        }));
    };

    const getChartData = () => {
        return pieData;
    };

    return (
        <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
            <View style={styles.topContainer}>
                <OverviewHeader />
                <View style={styles.headerContent}>
                    <View style={styles.periodNavigation}>
                        <TouchableOpacity
                            style={styles.periodArrow}
                            onPress={() => navigatePeriod('prev')}
                        >
                            <Ionicons name="chevron-back" size={24} color="#91483c" />
                        </TouchableOpacity>

                        <View style={styles.periodTitle}>
                            <Text style={styles.title}>Burrow Insights</Text>
                            <Text style={styles.periodText}>{getPeriodTitle()}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.periodArrow}
                            onPress={() => navigatePeriod('next')}
                        >
                            <Ionicons name="chevron-forward" size={24} color="#91483c" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.balance}>Burrow Balance: {total.toFixed(0)}</Text>
                </View>
            </View>

            <ScrollView
                style={[styles.scrollableContent]}
                contentContainerStyle={[styles.scrollContainer]}
            >
                <View style={styles.pieSection}>
                    <View style={styles.pieWrapper}>
                        <PieChart
                            data={getChartData()}
                            width={300}
                            height={150}
                            accessor="value"
                            backgroundColor="transparent"
                            absolute
                            hasLegend={false}
                            paddingLeft="0"
                            chartConfig={{
                                color: () => '#000',
                                labelColor: () => 'transparent',
                                propsForLabels: { fontSize: 0 },
                            }}
                            style={{
                                borderRadius: 16,
                                transform: [{ translateX: 70 }],
                            }}
                        />
                    </View>

                    <View style={styles.legendBox}>
                        {pieData
                            .sort((a, b) => b.value - a.value)
                            .map((item, i) => {
                                const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                                return (
                                    <View key={item.name} style={styles.legendItem}>
                                        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                        <Text style={styles.legendText}>
                                            {`${item.name}: ${percent}%`}
                                        </Text>
                                    </View>
                                );
                            })}
                    </View>
                </View>

                {Object.entries(insights).map(([cat, subObj]: any) => (
                    <View key={cat} style={styles.detailsBox}>
                        <TouchableOpacity onPress={() => toggleCategory(cat)} style={styles.insightTitleContainer}>
                            <Text style={styles.insightTitle}>
                                {`${expandedCategories[cat] ? '▼' : '▶'} ${cat}`}
                            </Text>
                        </TouchableOpacity>
                        {expandedCategories[cat] &&
                            Object.entries(subObj).map(([sub, list]: any) => (
                                <View key={sub} style={styles.subcategoryBox}>
                                    <TouchableOpacity onPress={() => toggleSubcategory(sub)} style={styles.subcategoryContainer}>
                                        <Text style={styles.subcategoryText}>
                                            {`${expandedSubcategories[sub] ? '▾' : '▸'} ${sub}`}
                                        </Text>
                                    </TouchableOpacity>
                                    {expandedSubcategories[sub] &&
                                        list.map((exp: any, index: number) => (
                                            <View key={index} style={styles.expenseBox}>
                                                <Text style={styles.expenseDate}>
                                                    {new Date(exp.date).toLocaleDateString()}
                                                </Text>
                                                <View style={styles.expenseDetail}>
                                                    <Text style={styles.expenseNote}>{exp.note || 'No note'}</Text>
                                                    <View style={styles.amountBlock}>
                                                        <Image source={carrotIcon} style={styles.carrotIcon} />
                                                        <Text style={styles.amount}>{exp.amount}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                </View>
                            ))}
                    </View>
                ))}
            </ScrollView>
        </ImageBackground>
    );
}
