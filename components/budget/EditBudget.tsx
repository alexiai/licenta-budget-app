// EditBudget.tsx
import React, { useRef, useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Image, ScrollView,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { doc, updateDoc } from 'firebase/firestore';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { db } from '@lib/firebase';
import categoriesLib from '@lib/categories';
import incomeIcon from '@assets/icons/income.png';
import { PieChart as ChartKitPie } from 'react-native-chart-kit';
import styles from '@styles/editBudget';
import budgetStyles from '@styles/budget';
import { Dimensions } from 'react-native';

const predefinedCategories: Record<string, string[]> = {
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

const categoryNameToKey: Record<string, string> = {
    Housing: 'housing',
    'Food & Drinks': 'food',
    Transport: 'transport',
    Health: 'health',
    Lifestyle: 'lifestyle',
    Entertainment: 'entertainment',
    Savings: 'savings',
    Other: 'other',
};

interface Subcategory {
    name: string;
    amount: string;
    isOther?: boolean;
}

interface BudgetCategory {
    name: string;
    subcategories: Subcategory[];
}

interface Income {
    type: string;
    amount: string;
    isOther?: boolean;
}

interface EditBudgetProps {
    budgetId: string;
    categories: BudgetCategory[];
    incomes: Income[];
    onSaved: () => void;
    onCancel: () => void;
}

export default function EditBudget({
    budgetId, categories: initialCategories, incomes: initialIncomes, onSaved, onCancel,
}: EditBudgetProps) {
    const [categories, setCategories] = useState(() => initialCategories.map(category => ({
        ...category, subcategories: category.subcategories.map(item => ({ ...item })),
    })));
    const [incomes, setIncomes] = useState(() => initialIncomes.map(income => ({ ...income })));
    const [openDropdown, setOpenDropdown] = useState<string | number | null>(null);
    const [showChart, setShowChart] = useState(false);
    const [saveError, setSaveError] = useState(false);

    const savingRef = useRef(false);
    const [saving, setSaving] = useState(false);

    const updateAll = (newCats: BudgetCategory[], newIncs: Income[]) => {
        if (savingRef.current) return;
        setCategories(newCats);
        setIncomes(newIncs);
        setSaveError(false);
    };

    const saveBudget = async () => {
        if (savingRef.current) return;
        savingRef.current = true;
        setSaving(true);
        setSaveError(false);
        try {
            await updateDoc(doc(db, 'budgets', budgetId), { categories, incomes });
            onSaved();
        } catch {
            setSaveError(true);
        } finally {
            savingRef.current = false;
            setSaving(false);
        }
    };

    const handleAmountChange = (catIdx: number, subIdx: number, val: string) => {
        const updated = [...categories];
        updated[catIdx].subcategories[subIdx].amount = val;
        updateAll(updated, incomes);
    };

    const handleIncomeChange = (idx: number, val: string) => {
        const updated = [...incomes];
        updated[idx].amount = val;
        updateAll(categories, updated);
    };

    const deleteSub = (catIdx: number, subIdx: number) => {
        const updated = [...categories];
        updated[catIdx].subcategories.splice(subIdx, 1);
        updateAll(updated, incomes);
    };

    const deleteIncome = (idx: number) => {
        const updated = incomes.filter((_, i) => i !== idx);
        updateAll(categories, updated);
    };

    const handleAddSub = (catIdx: number, name: string) => {
        const updated = [...categories];
        if (name === 'Other') {
            updated[catIdx].subcategories.push({ name: '', amount: '0', isOther: true });
        } else {
            updated[catIdx].subcategories.push({ name, amount: '0', isOther: false });
        }
        updateAll(updated, incomes);
    };

    const handleAddIncome = (type: string) => {
        if (type === 'Other') {
            const updated = [...incomes, { type: '', amount: '0', isOther: true }];
            updateAll(categories, updated);
        } else {
            const updated = [...incomes, { type, amount: '0', isOther: false }];
            updateAll(categories, updated);
        }
    };

    const getCategoryIcon = (subName: string, parentCategoryName: string | null = null) => {
        const found = categoriesLib.find((cat) => cat.subcategories.includes(subName));
        if (found) return found.icon;

        if (parentCategoryName) {
            const key = categoryNameToKey[parentCategoryName] || 'other';
            const fallback = categoriesLib.find((cat) => categoryNameToKey[cat.label] === key);
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

    // Compute used and unused categories
    const usedCategoryNames = categories.map(cat => cat.name);
    const allCategoryNames = Object.keys(predefinedCategories).map(key => {
        // Map back to display name if needed
        const entry = Object.entries(categoryNameToKey).find(([display, k]) => k === key);
        return entry ? entry[0] : key.charAt(0).toUpperCase() + key.slice(1);
    });
    const unusedCategoryNames = allCategoryNames.filter(name => !usedCategoryNames.includes(name));

    // Handler to add a new category
    const handleAddCategory = (name: string) => {
        const key = categoryNameToKey[name] || name.toLowerCase();
        const subcats = (predefinedCategories[key] || []).map(sub => ({ name: sub, amount: '0', isOther: false }));
        const updated = [...categories, { name, subcategories: subcats }];
        updateAll(updated, incomes);
    };

    return (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 80 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 }}>
                <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={onCancel}>
                    <Text style={styles.subPillText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity accessibilityRole="button" disabled={saving} onPress={saveBudget}>
                    <Text style={styles.subPillText}>{saving ? 'Saving…' : 'Save changes'}</Text>
                </TouchableOpacity>
            </View>
            {saveError && <Text accessibilityRole="alert">Could not save your changes. Try again.</Text>}
            <View style={budgetStyles.card}>
                <Text style={budgetStyles.cardTitle}>Budget</Text>
                <Text style={budgetStyles.cardValue}>{totalIncome.toFixed(2)} RON</Text>
                <View style={budgetStyles.progressBarContainer}>
                    <View style={[budgetStyles.progressBar, { width: `${totalIncome > 0 ? Math.min(totalPlanned / totalIncome * 100, 100) : 0}%` }]} />
                </View>
                <View style={budgetStyles.cardRow}>
                    <Text style={budgetStyles.cardSubtitle}>Planned spending</Text>
                    <Text style={budgetStyles.cardSubtitle}>{totalPlanned.toFixed(2)} RON</Text>
                </View>
                <View style={budgetStyles.cardRow}>
                    <Text style={budgetStyles.cardSubtitle}>Remaining</Text>
                    <Text style={budgetStyles.cardSubtitle}>{remaining.toFixed(2)} RON</Text>
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
                                    paddingLeft="0"
                                    backgroundColor="transparent"
                                    absolute
                                    hasLegend={false}
                                    chartConfig={{
                                        color: () => `#000`,
                                        labelColor: () => 'transparent',
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
                        <TouchableOpacity
                            accessibilityLabel={`Remove ${cat.name} from budget`}
                            onPress={() => void updateAll(categories.filter((_, index) => index !== i), incomes)}
                        >
                            <Text style={styles.subPillText}>Remove category</Text>
                        </TouchableOpacity>
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

            {/* +Add Category Button */}
            {unusedCategoryNames.length > 0 && (
                <View style={{ marginHorizontal: 20, marginTop: 20 }}>
                    <TouchableOpacity
                        onPress={() => setOpenDropdown(openDropdown === 'addCategory' ? null : 'addCategory')}
                        style={styles.addSubBtn}
                    >
                        <Text style={styles.addSubText}>+ Add Category</Text>
                    </TouchableOpacity>
                    {openDropdown === 'addCategory' && (
                        <View style={styles.subGrid}>
                            {unusedCategoryNames.map((name, idx) => (
                                <TouchableOpacity
                                    key={idx}
                                    onPress={() => { handleAddCategory(name); setOpenDropdown(null); }}
                                    style={styles.subPill}
                                >
                                    <Text style={styles.subPillText}>{name}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
                </View>
            )}

        </ScrollView>
    );
}
