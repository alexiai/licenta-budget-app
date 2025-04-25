// Replace the entire EditBudget component with this updated version
import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import styles from '@styles/editBudget';
import { collection, doc, updateDoc } from 'firebase/firestore';
import { db } from '@lib/firebase';
import AsyncStorage from "@react-native-async-storage/async-storage";
import incomeIcon from '@assets/icons/income.png';
import categories from "@lib/categories";

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

type EditBudgetProps = {
    categories: any[];
    incomes: any[];
    onChange: (newCategories: any[], newIncomes: any[]) => void;
    budgetId: string;
};

export default function EditBudget({
                                       categories: initialCategories,
                                       incomes: initialIncomes,
                                       onChange
                                   }: Omit<EditBudgetProps, 'budgetId'>) {
    const [categories, setCategories] = useState(initialCategories);
    const [incomes, setIncomes] = useState(initialIncomes);
    const [budgetId, setBudgetId] = useState<string | null>(null);
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [selectedSub, setSelectedSub] = useState<string | null>(null);
    const [manualSub, setManualSub] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [editingIncomeIndex, setEditingIncomeIndex] = useState<number | null>(null);
    const [newIncomeType, setNewIncomeType] = useState('salary');
    const [newIncomeAmount, setNewIncomeAmount] = useState('');

    useEffect(() => {
        const loadBudgetId = async () => {
            const stored = await AsyncStorage.getItem('selectedBudget');
            if (stored) setBudgetId(stored);
        };
        loadBudgetId();
    }, []);

    const updateAll = async (newCategories: any[], newIncomes: any[]) => {
        setCategories(newCategories);
        setIncomes(newIncomes);
        onChange(newCategories, newIncomes);

        if (!budgetId) {
            console.error('🔥 updateFirestore called without valid budgetId');
            return;
        }

        try {
            const ref = doc(db, 'budgets', budgetId);
            await updateDoc(ref as any, {
                categories: newCategories,
                incomes: newIncomes
            });
        } catch (e) {
            console.error('Failed to update budget:', e);
        }
    };

    const handleDelete = async (catIndex: number, subIndex: number) => {
        const updated = categories.map((cat, i2) => {
            if (i2 !== catIndex) return cat;
            return {
                ...cat,
                subcategories: cat.subcategories.filter((_, j) => j !== subIndex),
            };
        });
        await updateAll(updated, incomes);
    };

    const handleAmountChange = async (catIndex: number, subIndex: number, value: string) => {
        const updated = categories.map((cat, i2) => {
            if (i2 !== catIndex) return cat;
            return {
                ...cat,
                subcategories: cat.subcategories.map((sub: any, j) =>
                    j === subIndex ? { ...sub, amount: value } : sub
                ),
            };
        });
        await updateAll(updated, incomes);
    };

    const handleAddSub = (catIndex: number) => {
        setOpenIndex(catIndex);
        setSelectedSub(null);
        setManualSub('');
        setDropdownOpen(true);
    };

    const confirmAddSub = async () => {
        if (openIndex === null || !budgetId) {
            console.error('⚠️ budgetId or openIndex is undefined in confirmAddSub');
            return;
        }

        const subName = selectedSub === 'Other' ? manualSub.trim() : selectedSub;
        if (!subName) return;

        const updated = categories.map((cat, i2) => {
            if (i2 !== openIndex) return cat;
            return {
                ...cat,
                subcategories: [...cat.subcategories, { name: subName, amount: '0' }],
            };
        });

        await updateAll(updated, incomes);

        setDropdownOpen(false);
        setOpenIndex(null);
        setSelectedSub(null);
        setManualSub('');
    };

    const handleIncomeAmountChange = (index: number, newAmount: string) => {
        const updated = [...incomes];
        updated[index].amount = newAmount;
        setIncomes(updated);
    };

    const saveIncomeChanges = async () => {
        await updateAll(categories, incomes);
        setEditingIncomeIndex(null);
    };

    const addNewIncome = async () => {
        if (!newIncomeAmount) return;

        const updatedIncomes = [
            ...incomes,
            { type: newIncomeType, amount: newIncomeAmount }
        ];

        await updateAll(categories, updatedIncomes);
        setNewIncomeType('salary');
        setNewIncomeAmount('');
    };

    const deleteIncome = async (index: number) => {
        const updated = incomes.filter((_, i) => i !== index);
        await updateAll(categories, updated);
    };

    return (
        <ScrollView>
            {/* Income Section - Updated to match category styling */}
            <Text style={styles.section}>Income</Text>
            {incomes.map((income, index) => (
                <View key={`income-${index}`} style={styles.itemRow}>
                    <Image source={incomeIcon} style={styles.categoryIcon} />
                    {editingIncomeIndex === index ? (
                        <>
                            <TextInput
                                value={income.type}
                                onChangeText={(text) => {
                                    const updated = [...incomes];
                                    updated[index].type = text;
                                    setIncomes(updated);
                                }}
                                style={[styles.itemText, { flex: 1 }]}
                            />
                            <TextInput
                                value={income.amount}
                                onChangeText={(text) => handleIncomeAmountChange(index, text)}
                                style={[styles.itemText, { width: 80 }]}
                                keyboardType="numeric"
                            />
                            <TouchableOpacity onPress={saveIncomeChanges}>
                                <Feather name="check" size={20} color="#2ecc71" />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <>
                            <Text style={[styles.itemText, { flex: 1 }]}>{income.type}</Text>
                            <Text style={[styles.itemText, { width: 80 }]}>{income.amount} RON</Text>
                            <TouchableOpacity onPress={() => setEditingIncomeIndex(index)}>
                                <Feather name="edit" size={20} color="#3498db" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => deleteIncome(index)}>
                                <Feather name="trash-2" size={20} color="#e74c3c" />
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            ))}

            {/* Add New Income - Updated to match add subcategory styling */}
            <View style={styles.addSubBtn}>
                <TextInput
                    placeholder="Income type"
                    value={newIncomeType}
                    onChangeText={setNewIncomeType}
                    style={[styles.input, { flex: 1, marginRight: 8 }]}
                />
                <TextInput
                    placeholder="Amount"
                    value={newIncomeAmount}
                    onChangeText={setNewIncomeAmount}
                    style={[styles.input, { width: 100 }]}
                    keyboardType="numeric"
                />
                <TouchableOpacity
                    onPress={addNewIncome}
                    style={styles.addButton}
                    disabled={!newIncomeAmount}
                >
                    <Text style={styles.addButtonText}>+ Add Income</Text>
                </TouchableOpacity>
            </View>

            {/* Categories Section (unchanged) */}
            {categories.map((cat, i) => {
                const key = categoryNameToKey[cat.name] || 'other';
                const allSubs = predefinedCategories[key] || [];
                const usedSubs = cat.subcategories.map((sub: any) => sub.name);
                const availableSubs = allSubs.filter(sub => !usedSubs.includes(sub));

                return (
                    <View key={i}>
                        <View style={styles.categoryHeader}>
                            <Image source={getCategoryIcon(cat.name)} style={styles.categoryIcon} />
                            <Text style={styles.section}>{cat.name}</Text>
                        </View>

                        <FlashList
                            data={cat.subcategories}
                            estimatedItemSize={50}
                            keyExtractor={(_, index) => `sub-${i}-${index}`}
                            renderItem={({ item, index }) => {
                                if (!item || typeof item.name !== 'string') return null;

                                return (
                                    <GestureHandlerRootView>
                                        <TouchableOpacity style={styles.itemRow}>
                                            <Feather
                                                name="minus-circle"
                                                size={20}
                                                color="#e74c3c"
                                                onPress={() => handleDelete(i, index)}
                                            />
                                            <Text style={[styles.itemText, { flex: 1, marginLeft: 8 }]}>{item.name}</Text>
                                            <TextInput
                                                style={[styles.itemText, { width: 60, textAlign: 'right' }]}
                                                value={String(item.amount)}
                                                onChangeText={(text) => handleAmountChange(i, index, text)}
                                                keyboardType="numeric"
                                            />
                                        </TouchableOpacity>
                                    </GestureHandlerRootView>
                                );
                            }}
                        />

                        <TouchableOpacity style={styles.addSubBtn} onPress={() => handleAddSub(i)}>
                            <Text style={styles.addSubText}>+ Add new subcategory</Text>
                        </TouchableOpacity>

                        {dropdownOpen && openIndex === i && (
                            <View style={styles.dropdownContainer}>
                                <Text style={styles.selectLabel}>Select subcategory</Text>

                                <View style={styles.subGrid}>
                                    {availableSubs.length > 0 ? (
                                        <>
                                            {availableSubs.map((sub, idx) => (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={[styles.subPill, selectedSub === sub && styles.subPillActive]}
                                                    onPress={() => setSelectedSub(sub)}
                                                >
                                                    <Text style={styles.subPillText}>{sub}</Text>
                                                </TouchableOpacity>
                                            ))}
                                            <TouchableOpacity
                                                style={[styles.subPill, selectedSub === 'Other' && styles.subPillActive]}
                                                onPress={() => setSelectedSub('Other')}
                                            >
                                                <Text style={styles.subPillText}>Other</Text>
                                            </TouchableOpacity>
                                        </>
                                    ) : (
                                        <Text style={styles.disabledText}>Every subcategory is used</Text>
                                    )}
                                </View>

                                {selectedSub === 'Other' && (
                                    <TextInput
                                        placeholder="Enter subcategory name"
                                        placeholderTextColor="#999"
                                        value={manualSub}
                                        onChangeText={setManualSub}
                                        style={styles.inputTransparent}
                                    />
                                )}

                                <TouchableOpacity onPress={confirmAddSub} style={styles.button}>
                                    <Text style={styles.buttonText}>Add</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                );
            })}
        </ScrollView>
    );
}

// Helper function to get category icon (add this at the bottom of the file)
function getCategoryIcon(categoryName: string) {
    const category = categories.find(cat => cat.name === categoryName);
    return category ? category.icon : require('@assets/icons/income.png');
}