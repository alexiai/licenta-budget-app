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
                legendFontColor: '#91483c',
                legendFontSize: 13,
            };
        }).filter((entry) => entry.value > 0);
    };

    const totalIncome = incomes.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);
    const totalPlanned = categories.reduce((sum, cat) =>
        sum + (cat.subcategories ?? []).reduce((s, sub) => s + parseFloat(sub.amount || '0'), 0), 0);
    const remaining = isNaN(totalIncome - totalPlanned) ? 0 : totalIncome - totalPlanned;

    const chartData = getChartKitData();
    const screenWidth = Dimensions.get('window').width;
    const totalValue = chartData.reduce((sum, e) => sum + e.value, 0);

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
                <TouchableOpacity onPress={() => setShowChart((prev) => !prev)}>
                    <Text style={budgetStyles.chartToggle}>Tap to show chart</Text>
                </TouchableOpacity>
                {showChart && (
                    totalValue > 0 ? (
                        <View style={budgetStyles.chartContainer}>
                            <View style={budgetStyles.pieWrapper}>
                                <ChartKitPie
                                    data={chartData}
                                    width={260}
                                    height={150}
                                    accessor="value"
                                    backgroundColor="transparent"
                                    absolute
                                    hasLegend={false}
                                    chartConfig={{
                                        color: () => `#000`,
                                        labelColor: () => 'transparent',
                                        propsForLabels: { fontSize: 0 },
                                    }}
                                    style={{ borderRadius: 16 }}
                                />
                            </View>
                            <View style={budgetStyles.chartLegendBox}>
                                {chartData
                                    .sort((a, b) => b.value - a.value)
                                    .map((item) => {
                                        const percent = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(0) : 0;
                                        return (
                                            <View key={item.name} style={budgetStyles.chartLegendItem}>
                                                <View style={[budgetStyles.colorDot, { backgroundColor: item.color }]} />
                                                <Text style={budgetStyles.chartLegendText}>
                                                    {item.name}:<Text style={budgetStyles.legendPercent}> {percent}%</Text>
                                                </Text>
                                            </View>
                                        );
                                    })}
                            </View>
                        </View>
                    ) : (
                        <Text style={{ textAlign: 'center', fontFamily: 'Fredoka', marginTop: 10, color: '#91483c' }}>
                            No data to display in chart.
                        </Text>
                    )
                )}
            </View>
            <Text style={budgetStyles.section}>Income</Text>
            {incomes.map((inc, i) => (
                <View key={`income-${i}`} style={styles.itemRow}>
                    <Feather name="menu" size={20} color="#91483c" style={styles.dragIcon} />
                    <Image source={incomeIcon} style={styles.categoryIcon} />
                    {inc.isOther ? (
                        <TextInput
                            placeholder="Other"
                            value={inc.type}
                            onChangeText={(val) => {
                                const updated = [...incomes];
                                updated[i].type = val;
                                updateAll(categories, updated);
                            }}
                            style={[styles.itemText, { fontStyle: 'italic', opacity: 0.8 }]}
                        />
                    ) : (
                        <Text style={styles.itemText}>{inc.type}</Text>
                    )}
                    <TextInput
                        value={inc.amount}
                        onChangeText={(val) => handleIncomeChange(i, val)}
                        style={styles.itemAmount}
                        keyboardType="numeric"
                    />
                    <TouchableOpacity onPress={() => deleteIncome(i)}>
                        <Feather name="minus-circle" size={20} color="#91483c" />
                    </TouchableOpacity>
                </View>
            ))}


            <TouchableOpacity
                onPress={() => setOpenDropdown(openDropdown === 'income' ? null : 'income')}
                style={styles.addSubBtn}
            >
                <Text style={styles.addSubText}>+ Add Income Type</Text>
            </TouchableOpacity>

            {openDropdown === 'income' && (
                <View style={styles.subGrid}>
                    {predefinedIncomeTypes
                        .filter(type => !incomes.some(inc => inc.type.startsWith(type)))
                        .map((type, idx) => (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => handleAddIncome(type)}
                                style={styles.subPill}
                            >
                                <Text style={styles.subPillText}>{type}</Text>
                            </TouchableOpacity>
                        ))}
                </View>
            )}

            {categories.map((cat, i) => {
                const key = categoryNameToKey[cat.name] || 'other';
                const used = cat.subcategories.map((s) => s.name);
                const available = (predefinedCategories[key] || []).filter((s) => !used.includes(s));
                const dataWithIndex = cat.subcategories.map((s, j) => ({ ...s, index: j }));

                return (
                    <View key={`cat-${i}`}>
                        <Text style={budgetStyles.section}>{cat.name}</Text>
                        <DraggableFlatList
                            data={dataWithIndex}
                            keyExtractor={(item, index) => `sub-${i}-${index}`}
                            renderItem={({ item, drag, isActive }) => (
                                <TouchableOpacity
                                    style={[styles.itemRow, isActive && { opacity: 0.9 }]}
                                    onLongPress={drag}
                                >
                                    <Feather name="menu" size={20} color="#91483c" style={styles.dragIcon} />
                                    <Image
                                        source={getCategoryIcon(item.name, cat.name)}
                                        style={styles.categoryIcon}
                                    />
                                    {item.isOther ? (
                                        <TextInput
                                            placeholder="Other"
                                            value={item.name}
                                            onChangeText={(val) => {
                                                const updated = [...categories];
                                                updated[i].subcategories[item.index].name = val;
                                                updateAll(updated, incomes);
                                            }}
                                            style={[styles.itemText, { fontStyle: 'italic', opacity: 0.8 }]}
                                        />
                                    ) : (
                                        <Text style={styles.itemText}>{item.name}</Text>
                                    )}
                                    <TextInput
                                        value={item.amount}
                                        onChangeText={(val) => handleAmountChange(i, item.index, val)}
                                        style={styles.itemAmount}
                                        keyboardType="numeric"
                                    />
                                    <TouchableOpacity onPress={() => deleteSub(i, item.index)}>
                                        <Feather name="minus-circle" size={20} color="#91483c" />
                                    </TouchableOpacity>
                                </TouchableOpacity>
                            )}
                            onDragEnd={({ data }) => {
                                const updated = [...categories];
                                updated[i].subcategories = data.map(({ name, amount, isOther }) => ({ name, amount, isOther }));
                                updateAll(updated, incomes);
                            }}
                        />

                        <TouchableOpacity
                            onPress={() => setOpenDropdown(openDropdown === i ? null : i)}
                            style={styles.addSubBtn}
                        >
                            <Text style={styles.addSubText}>+ Add Subcategory</Text>
                        </TouchableOpacity>

                        {openDropdown === i && (
                            <View style={styles.subGrid}>
                                {available.length > 0 && available.map((name, idx) => (
                                    <TouchableOpacity
                                        key={idx}
                                        onPress={() => handleAddSub(i, name)}
                                        style={styles.subPill}
                                    >
                                        <Text style={styles.subPillText}>{name}</Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity
                                    onPress={() => handleAddSub(i, 'Other')}
                                    style={[styles.subPill, { borderStyle: 'dashed', opacity: 0.8 }]}
                                >
                                    <Text style={styles.subPillText}>Other</Text>
                                </TouchableOpacity>
                                {available.length === 0 && (
                                    <Text style={styles.disabledText}>Every subcategory is used</Text>
                                )}
                            </View>
                        )}
                    </View>
                );
            })}

        </ScrollView>
    );
}
