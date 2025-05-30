
// overview/list/index.tsx - with budget period filtering
import { View, Text, FlatList, TouchableOpacity, ImageBackground, Image } from 'react-native';
import { useEffect, useState } from 'react';
import { db, auth } from '@lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OverviewHeader from '@components/OverviewHeader';
import bg from '@assets/bg/background3.png';
import bunnyIcon from '@assets/icons/bunnyhead.png';
import categories from '@lib/categories';
import { filterExpensesByPeriod, getPeriodTitle } from '@lib/utils/expenseFilters';
import styles from '@styles/overviewList';

export default function OverviewListScreen() {
    const [expensesByDate, setExpensesByDate] = useState<any>({});
    const [totalCarrotCoins, setTotalCarrotCoins] = useState(0);
    const [allExpenses, setAllExpenses] = useState<any[]>([]);
    const [selectedBudget, setSelectedBudget] = useState<any>(null);
    const [periodOffset, setPeriodOffset] = useState(0);
    const router = useRouter();

    const fetchExpenses = async () => {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', user.uid),
            orderBy('date', 'desc')
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllExpenses(data);
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

        if (selectedBudget) {
            filteredExpenses = filterExpensesByPeriod(allExpenses, selectedBudget, periodOffset);
        }

        const grouped: any = {};
        let total = 0;

        filteredExpenses.forEach(exp => {
            const date = new Date(exp.date).toLocaleDateString('en-US', {
                month: 'long', day: 'numeric'
            });
            if (!grouped[date]) grouped[date] = [];
            grouped[date].push(exp);
            total += parseFloat(exp.amount || '0');
        });

        setExpensesByDate(grouped);
        setTotalCarrotCoins(total);
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

    const navigatePeriod = (direction: 'prev' | 'next') => {
        setPeriodOffset(prev => prev + (direction === 'prev' ? -1 : 1));
    };

    const categoryIcons = categories.reduce((acc, cat) => {
        cat.subcategories.forEach(sub => {
            acc[sub.toLowerCase()] = cat.icon;
        });
        return acc;
    }, {});

    const periodTitle = selectedBudget ? getPeriodTitle(selectedBudget, periodOffset) : 'All Time';

    return (
        <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
            <OverviewHeader onBudgetChange={handleBudgetChange} />

            <View style={styles.periodNavigation}>
                <TouchableOpacity
                    style={styles.periodArrow}
                    onPress={() => navigatePeriod('prev')}
                    disabled={!selectedBudget}
                >
                    <Ionicons name="chevron-back" size={24} color={selectedBudget ? "#91483c" : "#ccc"} />
                </TouchableOpacity>

                <View style={styles.periodTitle}>
                    <Text style={styles.title}>Your Carrot Trail</Text>
                    <Text style={styles.periodText}>{periodTitle}</Text>
                </View>

                <TouchableOpacity
                    style={styles.periodArrow}
                    onPress={() => navigatePeriod('next')}
                    disabled={!selectedBudget}
                >
                    <Ionicons name="chevron-forward" size={24} color={selectedBudget ? "#91483c" : "#ccc"} />
                </TouchableOpacity>
            </View>

            <Text style={styles.balance}>Burrow Balance: {totalCarrotCoins}</Text>

            <FlatList
                data={Object.entries(expensesByDate)}
                keyExtractor={([date]) => date}
                renderItem={({ item: [date, expenses] }) => (
                    <View style={styles.dateGroup}>
                        <Text style={styles.dateTitle}>{date}</Text>
                        {expenses.map((exp: any) => {
                            const icon = categoryIcons[exp.subcategory?.toLowerCase()] || require('@assets/icons/default.png');
                            return (
                                <View key={exp.id} style={styles.expenseBox}>
                                    <View style={styles.expenseLeft}>
                                        <Image source={icon} style={styles.icon} />
                                        <View>
                                            <Text
                                                style={[
                                                    styles.subcategory,
                                                    exp.subcategory?.length > 10 && styles.subcategoryMultiline,
                                                ]}
                                            >
                                                {exp.subcategory}
                                            </Text>
                                            {exp.source === 'bank' && (
                                                <Text style={styles.sourceText}>Bank Transaction</Text>
                                            )}
                                            {exp.note && (
                                                <Text style={styles.noteText}>{exp.note}</Text>
                                            )}
                                        </View>
                                    </View>

                                    <View style={styles.amountBlock}>
                                        <View style={styles.amountRow}>
                                            <Image
                                                source={require('@assets/icons/carrotcoinlist.png')}
                                                style={styles.carrotImage}
                                            />
                                            <Text style={styles.amountText}>{exp.amount}</Text>
                                        </View>
                                        <Text style={styles.carrotCoinText}>CarrotCoins</Text>
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                )}
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
