// ✅ BudgetScreen.tsx
import React, { useEffect, useState } from 'react';
import {View, Text, TouchableOpacity, FlatList, ActivityIndicator, ImageBackground, Image,} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { auth, db } from '@lib/firebase';
import BudgetSelector from '../../../components/BudgetSelector';
import styles from '../../../styles/budget';
import { Dimensions } from 'react-native';
import { PieChart as ChartKitPie } from 'react-native-chart-kit';
import EditBudget from './EditBudget';
import bg from '@assets/bg/budgetback.png';
import categories from '@lib/categories';
import { Ionicons } from '@expo/vector-icons';

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
    const [loading, setLoading] = useState(true);
    const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
    const [budgetData, setBudgetData] = useState<any>(null);
    const [showChart, setShowChart] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    const loadBudget = async (id: string) => {
        const snap = await getDoc(doc(db, 'budgets', id));
        if (snap.exists()) setBudgetData(snap.data());
    };

    const handleBudgetChange = async (id: string | null) => {
        if (id) {
            setSelectedBudget(id);
            await AsyncStorage.setItem('selectedBudget', id);
            await loadBudget(id);
        }
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
                    <View style={styles.budgetSelectorWrapper}>
                        <BudgetSelector 
                            onBudgetChange={handleBudgetChange} 
                            selectedBudget={selectedBudget}
                            onNewBudget={() => router.push('/tabs/budget/onboarding')}
                        />
                    </View>
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
