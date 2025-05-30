// EditBudget.tsx
import React, { useEffect, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Image, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, updateDoc } from 'firebase/firestore';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { db } from '@lib/firebase';
import categoriesLib from '@lib/categories';
import incomeIcon from '@assets/icons/income.png';
import { PieChart as ChartKitPie } from 'react-native-chart-kit';
import styles from '@styles/editBudget';
import budgetStyles from '@styles/budget';
import { Dimensions } from 'react-native';

const predefinedCategories = {
    housing: ['Rent', 'Electricity', 'Water', 'Internet', 'TV', 'Insurance', 'Home Supplies'],
    food: ['Groceries', 'Restaurant', 'Coffee', 'Drinks'],
    transport: ['Gas', 'Taxi', 'Parking', 'Public Transport', 'Car Insurance', 'Car Loan', 'Flight', 'Repair'],
    health: ['Medication', 'Doctor', 'Therapy', 'Insurance'],
    lifestyle: ['Clothes', 'Gym', 'Self-care', 'Subscriptions'],
    entertainment: ['Cinema', 'Games', 'Books', 'Concerts'],
    savings: ['Savings', 'Vacation Savings'],
    other: ['Miscellaneous'],
};

const predefinedIncomeTypes = ['Salary', 'Pension', 'Freelancing', 'Investments', 'Scholarship', 'Other'];

const categoryNameToKey = {
    Housing: 'housing',
    'Food & Drinks': 'food',
    Transport: 'transport',
    Health: 'health',
    Lifestyle: 'lifestyle',
    Entertainment: 'entertainment',
    Savings: 'savings',
    Other: 'other',
};

export default function EditBudget({ categories: initialCategories, incomes: initialIncomes, onChange }) {
    const [categories, setCategories] = useState(initialCategories);
    const [incomes, setIncomes] = useState(initialIncomes);
    const [budgetId, setBudgetId] = useState(null);
    const [openDropdown, setOpenDropdown] = useState(null);
    const [showChart, setShowChart] = useState(false);

    useEffect(() => {
        AsyncStorage.getItem('selectedBudget').then(setBudgetId);
    }, []);

    const updateAll = async (newCats, newIncs) => {
        setCategories(newCats);
        setIncomes(newIncs);
        onChange(newCats, newIncs);
        if (!budgetId) return;
        await updateDoc(doc(db, 'budgets', budgetId), {
            categories: newCats,
            incomes: newIncs,
        });
    };

    const handleAmountChange = async (catIdx, subIdx, val) => {
        const updated = [...categories];
        updated[catIdx].subcategories[subIdx].amount = val;
        await updateAll(updated, incomes);
    };

    const handleIncomeChange = async (idx, val) => {
        const updated = [...incomes];
        updated[idx].amount = val;
        await updateAll(categories, updated);
    };

    const deleteSub = async (catIdx, subIdx) => {
        const updated = [...categories];
        updated[catIdx].subcategories.splice(subIdx, 1);
        await updateAll(updated, incomes);
    };

    const deleteIncome = async (idx) => {
        const updated = incomes.filter((_, i) => i !== idx);
        await updateAll(categories, updated);
    };

    const handleAddSub = async (catIdx, name) => {
        const updated = [...categories];
        if (name === 'Other') {
            updated[catIdx].subcategories.push({ name: '', amount: '0', isOther: true });
        } else {
            updated[catIdx].subcategories.push({ name, amount: '0', isOther: false });
        }
        await updateAll(updated, incomes);
    };

    const handleAddIncome = async (type) => {
        if (type === 'Other') {
            const updated = [...incomes, { type: '', amount: '0', isOther: true }];
            await updateAll(categories, updated);
        } else {
            const updated = [...incomes, { type, amount: '0', isOther: false }];
            await updateAll(categories, updated);
        }
    };

    const getCategoryIcon = (subName, parentCategoryName = null) => {
        const found = categoriesLib.find((cat) => cat.subcategories.includes(subName));
        if (found) return found.icon;

        if (parentCategoryName) {
            const key = categoryNameToKey[parentCategoryName] || 'other';
            const fallback = categoriesLib.find((cat) => categoryNameToKey[cat.name] === key);
            if (fallback) return fallback.icon;
        }
        return require('@assets/icons/other.png');
    };

    const getChartKitData = () => {
        const baseColors = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#6A4C93', '#e5989b'];
        return categories.map((cat, index) => {
            const total = cat.subcategories?.reduce((sum, sub) => sum + parseFloat(sub.amount || '0'), 0);
            return {
                name: cat.name,
                value: total,
                color: baseColors[index % baseColors.length],
                legendFontColor: '#333',
                legendFontSize: 12,
            };
        }).filter(entry => entry.value > 0);
    };

    const totalIncome = incomes.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);
    const totalPlanned = categories.reduce((sum, cat) =>
        sum + (cat.subcategories ?? []).reduce((s, sub) => s + parseFloat(sub.amount || '0'), 0), 0);
    const remaining = isNaN(totalIncome - totalPlanned) ? 0 : totalIncome - totalPlanned;

    const chartData = getChartKitData();
    const screenWidth = Dimensions.get('window').width;

    return (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}>
            <View style={budgetStyles.card}>
                <Text style={budgetStyles.cardTitle}>Budget</Text>
                <Text style={budgetStyles.cardValue}>${totalIncome}</Text>
                <View style={budgetStyles.progressBarContainer}>
                    <View style={[budgetStyles.progressBar, { width: `${(totalPlanned / totalIncome) * 100}%` }]} />
                </View>
                <View style={budgetStyles.cardRow}>
                    <Text style={budgetStyles.cardSubtitle}>Spent</Text>
                    <Text style={budgetStyles.cardSubtitle}>${totalPlanned}</Text>
                </View>
                <View style={budgetStyles.cardRow}>
                    <Text style={budgetStyles.cardSubtitle}>Remaining</Text>
                    <Text style={budgetStyles.cardSubtitle}>${remaining}</Text>
                </View>
                <TouchableOpacity onPress={() => setShowChart(prev => !prev)}>
                    <Text style={budgetStyles.chartToggle}>Tap to show chart</Text>
                </TouchableOpacity>
                {showChart && (
                    <ChartKitPie
                        data={chartData}
                        width={screenWidth - 40}
                        height={180}
                        accessor="value"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                    />
                )}
            </View>
            ...rest of component unchanged...
        </ScrollView>
    );
}
