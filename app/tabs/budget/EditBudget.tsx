import React, {useEffect, useState} from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { FlashList } from '@shopify/flash-list';
import { PanGestureHandler, GestureHandlerRootView } from 'react-native-gesture-handler';
import styles from '@styles/editBudget';
import {collection, doc, updateDoc} from 'firebase/firestore';
import { db } from '@lib/firebase';
import AsyncStorage from "@react-native-async-storage/async-storage";

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
    onChange: (newCategories: any[]) => void;
    budgetId: string;
};

export default function EditBudget({ categories: initialCategories, onChange }: Omit<EditBudgetProps, 'budgetId'>) {
    const [categories, setCategories] = useState(initialCategories);
    const [budgetId, setBudgetId] = useState<string | null>(null);
    const [openIndex, setOpenIndex] = useState<number | null>(null);
    const [selectedSub, setSelectedSub] = useState<string | null>(null);
    const [manualSub, setManualSub] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    // Load budgetId din AsyncStorage
    useEffect(() => {
        const loadBudgetId = async () => {
            const stored = await AsyncStorage.getItem('selectedBudget');
            if (stored) setBudgetId(stored);
        };
        loadBudgetId();
    }, []);

    const updateAll = async (newCategories: any[]) => {
        setCategories(newCategories);
        onChange(newCategories);
        if (!budgetId) {
            console.error('🔥 updateFirestore called without valid budgetId');
            return;
        }
        try {
            const ref = doc(db, 'budgets', budgetId);
            await updateDoc(ref as any, { categories: newCategories });
        } catch (e) {
            console.error('Failed to update budget:', e);
        }
    };

    const updateFirestore = async (updated: any[]) => {
        if (!budgetId) {
            console.error('🔥 updateFirestore called without valid budgetId');
            return;
        }
        try {
            const ref = doc(db, 'budgets', budgetId);
            await updateDoc(ref as any, { categories: updated });
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
        await updateAll(updated);

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
        await updateAll(updated);

    };

    const handleDragEnd = async (catIndex: number, data: any[]) => {
        const updated = [...categories];
        updated[catIndex].subcategories = data;
        await updateAll(updated);
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

        await updateAll(updated);

        setDropdownOpen(false);
        setOpenIndex(null);
        setSelectedSub(null);
        setManualSub('');
    };

    return (
        <>
            {categories.map((cat, i) => {
                const key = categoryNameToKey[cat.name] || 'other';
                const allSubs = predefinedCategories[key] || [];
                const usedSubs = cat.subcategories.map((sub: any) => sub.name);
                const availableSubs = allSubs.filter(sub => !usedSubs.includes(sub));

                return (
                    <View key={i}>
                        <Text style={styles.section}>{cat.name}</Text>

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
        </>
    );
}
