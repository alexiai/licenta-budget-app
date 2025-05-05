// ✅ BudgetScreen.tsx
import { useEffect, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    FlatList,
    ActivityIndicator,
    ImageBackground,
    Image,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '@lib/firebase';
import BudgetSelector from '@components/BudgetSelector';
import styles from '@styles/budget';
import { PieChart } from 'react-native-svg-charts';
import EditBudget from './EditBudget';
import bg from '@assets/bg/budgetbackground.png';
import categories from '@lib/categories';

export default function BudgetScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
    const [budgetData, setBudgetData] = useState<any>(null);
    const [showChart, setShowChart] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const loadBudget = async (id: string) => {
        const snap = await getDoc(doc(db, 'budgets', id));
        if (snap.exists()) setBudgetData(snap.data());
    };

    const handleBudgetChange = async (id: string) => {
        setSelectedBudget(id);
        await AsyncStorage.setItem('selectedBudget', id);
        await loadBudget(id);
    };

    const handleEditChange = (updatedCategories: any[], updatedIncomes: any[]) => {
        setBudgetData((prev: any) => ({
            ...prev,
            categories: updatedCategories,
            incomes: updatedIncomes,
        }));
    };

    useEffect(() => {
        const fetchData = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const q = query(collection(db, 'budgets'), where('userId', '==', user.uid));
            const snap = await getDocs(q);
            const storedId = await AsyncStorage.getItem('selectedBudget');

            if (!storedId || snap.empty) return router.replace('/tabs/budget/onboarding');

            const exists = snap.docs.find((doc) => doc.id === storedId);
            if (!exists) return router.replace('/tabs/budget/onboarding');

            setSelectedBudget(storedId);
            await loadBudget(storedId);
            setLoading(false);
        };
        fetchData();
    }, []);

    const getTotalIncome = () => (budgetData?.incomes ?? []).reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);
    const getTotalPlannedExpenses = () => (budgetData?.categories ?? []).reduce((sum, cat) => sum + (cat.subcategories ?? []).reduce((s, sub) => s + parseFloat(sub.amount || '0'), 0), 0);

    const getChartData = () => {
        const baseColors = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#6A4C93', '#e5989b'];
        return (budgetData?.categories ?? []).map((cat, index) => {
            const total = cat.subcategories?.reduce((sum, sub) => sum + parseFloat(sub.amount || '0'), 0);
            return { value: total, svg: { fill: baseColors[index % baseColors.length] }, key: `pie-${cat.name}-${index}` };
        }).filter((entry) => entry.value > 0);
    };

    const getSubcategoryIcon = (subName: string) => {
        const found = categories.find(cat => cat.subcategories.includes(subName));
        return found ? found.icon : require('@assets/icons/other.png');
    };

    const toggleChart = () => setShowChart((prev) => !prev);

    if (loading || !budgetData) {
        return (
            <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
                <View style={styles.center}><ActivityIndicator size="large" color="#91483c" /></View>
            </ImageBackground>
        );
    }

    const totalIncome = getTotalIncome();
    const totalPlanned = getTotalPlannedExpenses();
    const remaining = isNaN(totalIncome - totalPlanned) ? 0 : totalIncome - totalPlanned;

    return (
        <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
            <View style={styles.fixedHeader}>
                <View style={styles.topRow}>
                    <BudgetSelector onBudgetChange={handleBudgetChange} selectedBudget={selectedBudget} />
                    <TouchableOpacity onPress={() => setIsEditing((prev) => !prev)} style={styles.editButton}>
                        <Feather name={isEditing ? 'check' : 'edit'} size={22} color="#91483c" />
                    </TouchableOpacity>
                </View>
                <Text style={styles.title}>Burrow Plan</Text>
            </View>

            {isEditing ? (
                <EditBudget
                    categories={budgetData.categories}
                    incomes={budgetData.incomes}
                    onChange={handleEditChange}
                />
            ) : (
                <FlatList
                    data={budgetData.categories}
                    keyExtractor={(item, index) => `cat-${index}`}
                    renderItem={({ item: cat, index }) => (
                        <View>
                            <Text style={styles.section}>{cat.name}</Text>
                            {cat.subcategories.map((sub, j) => (
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
                                <Text style={styles.cardValue}>${totalIncome}</Text>
                                <View style={styles.progressBarContainer}>
                                    <View style={[styles.progressBar, { width: `${(totalPlanned / totalIncome) * 100}%` }]} />
                                </View>
                                <View style={styles.cardRow}>
                                    <Text style={styles.cardSubtitle}>Spent</Text>
                                    <Text style={styles.cardSubtitle}>${totalPlanned}</Text>
                                </View>
                                <View style={styles.cardRow}>
                                    <Text style={styles.cardSubtitle}>Remaining</Text>
                                    <Text style={styles.cardSubtitle}>${remaining}</Text>
                                </View>
                                <TouchableOpacity onPress={toggleChart}>
                                    <Text style={styles.chartToggle}>Tap to show chart</Text>
                                </TouchableOpacity>
                                {showChart && (
                                    <View style={styles.chartRow}>
                                        <View style={styles.pieWrapper}>
                                            <PieChart
                                                style={styles.pieChart}
                                                data={getChartData()}
                                                valueAccessor={({ item }) => item.value}
                                                outerRadius={'85%'}
                                                innerRadius={'40%'}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>

                            <Text style={styles.section}>Income</Text>
                            {budgetData.incomes.map((income, idx) => (
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
