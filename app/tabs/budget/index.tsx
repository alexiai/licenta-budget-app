import { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
import { auth, db } from '@lib/firebase';
import BudgetSelector from '@components/BudgetSelector';
import styles from '@styles/budget';
import dayjs from 'dayjs';
import { PieChart } from 'react-native-chart-kit';
import EditBudget from './EditBudget';

import {
    getCurrentBudgetPeriod,
    getPreviousPeriod,
    getNextPeriod,
} from '@lib/utils/budgetPeriods';

export default function BudgetScreen() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [selectedBudget, setSelectedBudget] = useState<string | null>(null);
    const [budgetData, setBudgetData] = useState<any>(null);
    const [showChart, setShowChart] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isEditing, setIsEditing] = useState(false);

    const loadBudget = async (id: string) => {
        const snap = await getDoc(doc(db, 'budgets', id));
        if (snap.exists()) {
            setBudgetData(snap.data());
        }
    };

    const handleBudgetChange = async (id: string) => {
        setSelectedBudget(id);
        await AsyncStorage.setItem('selectedBudget', id);
        await loadBudget(id);
    };

    const handleEditChange = (updatedCategories: any[]) => {
        setBudgetData((prev: any) => ({
            ...prev,
            categories: updatedCategories,
        }));
    };

    useEffect(() => {
        const fetchData = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const q = query(collection(db, 'budgets'), where('userId', '==', user.uid));
            const snap = await getDocs(q);
            const storedId = await AsyncStorage.getItem('selectedBudget');

            if (!storedId || snap.empty) {
                return router.replace('/tabs/budget/onboarding');
            }

            const exists = snap.docs.find((doc) => doc.id === storedId);
            if (!exists) {
                return router.replace('/tabs/budget/onboarding');
            }

            setSelectedBudget(storedId);
            await loadBudget(storedId);
            setLoading(false);
        };

        fetchData();
    }, []);

    const getTotalIncome = () => {
        return (budgetData?.incomes ?? []).reduce(
            (sum: number, i: any) => sum + parseFloat(String(i.amount ?? '0')),
            0
        );
    };

    const getTotalPlannedExpenses = () => {
        return (budgetData?.categories ?? []).reduce((sum: number, cat: any) => {
            const subcategories = cat.subcategories ?? [];
            return sum + subcategories.reduce(
                (subSum: number, sub: any) => subSum + parseFloat(String(sub.amount ?? '0')),
                0
            );
        }, 0);
    };

    const getChartData = () => {
        const baseColors = [
            '#FF6384', '#36A2EB', '#FFCE56', '#FFA07A',
            '#BA55D3', '#3CB371', '#FF8C00', '#8A2BE2',
            '#00CED1', '#DC143C', '#20B2AA', '#FF1493'
        ];

        return (budgetData.categories ?? [])
            .map((cat: any, index: number) => {
                const total = cat.subcategories?.reduce(
                    (sum: number, sub: any) => sum + parseFloat(sub.amount || '0'),
                    0
                );

                const color = baseColors[index % baseColors.length];
                return {
                    name: cat.name,
                    amount: total,
                    color,
                    legendFontColor: '#333',
                    legendFontSize: 12,
                };
            })
            .filter((entry) => entry.amount > 0);
    };

    const toggleChart = () => {
        setShowChart((prev) => !prev);
    };

    const changePeriod = (direction: 'prev' | 'next') => {
        const { start } =
            direction === 'prev'
                ? getPreviousPeriod(currentDate, budgetData.period, budgetData.startDay)
                : getNextPeriod(currentDate, budgetData.period, budgetData.startDay);

        setCurrentDate(start);
    };

    if (loading || !budgetData) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    const { start, end } = getCurrentBudgetPeriod(currentDate, budgetData.period, budgetData.startDay);
    const totalIncome = getTotalIncome();
    const totalPlanned = getTotalPlannedExpenses();
    const remaining = isNaN(totalIncome - totalPlanned) ? 0 : totalIncome - totalPlanned;

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <BudgetSelector onBudgetChange={handleBudgetChange} selectedBudget={selectedBudget} />
                <TouchableOpacity>

