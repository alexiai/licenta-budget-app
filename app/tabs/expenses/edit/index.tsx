import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ImageBackground, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import bg from '@assets/bg/background3.png';
import categories from '@lib/categories';
import styles from '@styles/expensesAdd';
import expenseService from '../../../services/ExpenseService';

export default function EditExpense() {
    const router = useRouter();
    const { expenseId } = useLocalSearchParams();
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
    const [note, setNote] = useState('');
    const [budgetId, setBudgetId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [open, setOpen] = useState(false);
    const [date, setDate] = useState('');

    const categoryItems = categories.map((cat) => ({
        label: cat.label,
        value: cat.label,
    }));

    const handleDateChange = (text: string) => {
        // Allow only numbers and forward slashes
        const filtered = text.replace(/[^\d/]/g, '');
        
        // Auto-add slashes after dd and mm
        let formatted = filtered;
        if (filtered.length >= 2 && !filtered.includes('/')) {
            formatted = filtered.slice(0, 2) + '/' + filtered.slice(2);
        }
        if (filtered.length >= 5 && filtered.split('/').length === 2) {
            formatted = formatted.slice(0, 5) + '/' + formatted.slice(5);
        }
        
        // Limit to 10 characters (dd/mm/yyyy)
        formatted = formatted.slice(0, 10);
        
        setDate(formatted);
    };

    const isValidDate = (dateStr: string) => {
        // Check format
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) return false;
        
        const [day, month, year] = dateStr.split('/').map(Number);
        const dateObj = new Date(year, month - 1, day);
        
        return dateObj.getDate() === day &&
               dateObj.getMonth() === month - 1 &&
               dateObj.getFullYear() === year &&
               dateObj <= new Date() &&
               dateObj.getFullYear() >= 2000;
    };

    useEffect(() => {
        const loadExpense = async () => {
            if (!expenseId) return;

            try {
                const expenseRef = doc(db, 'expenses', expenseId as string);
                const expenseSnap = await getDoc(expenseRef);
                
                if (expenseSnap.exists()) {
                    const data = expenseSnap.data();
                    setAmount(data.amount.toString());
                    setSelectedCategory(data.category);
                    setSelectedSubcategory(data.subcategory);
                    setNote(data.note || '');
                    
                    // Convert YYYY-MM-DD to dd/mm/yyyy
                    const isoDate = data.date.split('T')[0]; // Handle both ISO string and YYYY-MM-DD
                    const [year, month, day] = isoDate.split('-');
                    setDate(`${day}/${month}/${year}`);
                }

                const storedBudgetId = await AsyncStorage.getItem('selectedBudget');
                setBudgetId(storedBudgetId);
                setLoading(false);
            } catch (error) {
                console.error(error);
                alert('Failed to load expense details.');
                router.back();
            }
        };

        loadExpense();
    }, [expenseId]);

    const handleDelete = async () => {
        console.log('[EditExpense] Delete button clicked for expense:', expenseId);
        
        // For web platform, use window.confirm instead of Alert
        if (Platform.OS === 'web') {
            const confirmed = window.confirm('Are you sure you want to delete this expense? This action cannot be undone.');
            if (!confirmed) {
                console.log('[EditExpense] Delete cancelled by user');
                return;
            }
            
            try {
                await performDelete();
            } catch (error) {
                console.error('[EditExpense] Error in web delete:', error);
            }
            return;
        }

        // For mobile platforms, use Alert
        Alert.alert(
            'Delete Bunnyspense',
            'Are you sure you want to delete this expense? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                    onPress: () => console.log('[EditExpense] Delete cancelled by user')
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: performDelete
                }
            ],
            { cancelable: false }
        );
    };

    const performDelete = async () => {
        console.log('[EditExpense] Starting delete operation');
        try {
            setSaving(true);
            if (!expenseId) {
                console.error('[EditExpense] No expense ID found');
                throw new Error('No expense ID found');
            }

            // Get the expense data first to update budget if needed
            const expenseRef = doc(db, 'expenses', expenseId as string);
            console.log('[EditExpense] Getting expense data from Firestore');
            const expenseSnap = await getDoc(expenseRef);
            
            if (!expenseSnap.exists()) {
                console.error('[EditExpense] Expense not found in Firestore');
                throw new Error('Expense not found');
            }

            const expenseData = expenseSnap.data();
            console.log('[EditExpense] Found expense data:', expenseData);
            
            // Delete the expense
            console.log('[EditExpense] Calling deleteDoc');
            await deleteDoc(expenseRef);
            console.log('[EditExpense] Expense deleted from Firestore');

            // If the expense was part of a budget, update the budget amount
            if (expenseData.budgetId) {
                console.log('[EditExpense] Updating budget:', expenseData.budgetId);
                const budgetRef = doc(db, 'budgets', expenseData.budgetId);
                const budgetSnap = await getDoc(budgetRef);
                
                if (budgetSnap.exists()) {
                    const budgetData = budgetSnap.data();
                    const newAmount = (budgetData.amount || 0) + expenseData.amount;
                    console.log('[EditExpense] Updating budget amount:', {
                        oldAmount: budgetData.amount,
                        expenseAmount: expenseData.amount,
                        newAmount
                    });
                    
                    await updateDoc(budgetRef, {
                        amount: newAmount,
                        updatedAt: new Date().toISOString()
                    });
                    console.log('[EditExpense] Budget updated successfully');
                }
            }

            console.log('[EditExpense] Delete operation completed successfully');
            alert('Expense deleted successfully!');
            router.replace('/tabs/overview/list');
        } catch (error) {
            console.error('[EditExpense] Error in delete operation:', error);
            alert('Failed to delete expense. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = async () => {
        if (!amount || !selectedCategory || !selectedSubcategory) {
            alert('Please fill in all required fields.');
            return;
        }

        if (!isValidDate(date)) {
            alert('Please enter a valid date in dd/mm/yyyy format.');
            return;
        }

        setSaving(true);
        try {
            // Convert dd/mm/yyyy to YYYY-MM-DD
            const [day, month, year] = date.split('/');
            const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;

            const updates = {
                amount: parseFloat(amount),
                category: selectedCategory,
                subcategory: selectedSubcategory,
                note: note || selectedSubcategory,
                date: isoDate,
            };
            
            await expenseService.updateExpense(expenseId as string, updates);
            alert('Expense updated successfully!');
            router.replace('/tabs/overview/list');
        } catch (error) {
            console.error(error);
            alert('Failed to update expense.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <ImageBackground source={bg} style={styles.background} resizeMode="cover">
                <View style={styles.container}>
                    <Text style={styles.title}>Loading...</Text>
                </View>
            </ImageBackground>
        );
    }

    const currentSubcategories =
        categories.find((c) => c.label === selectedCategory)?.subcategories || [];

    return (
        <ImageBackground source={bg} style={styles.background} resizeMode="cover">
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Edit Bunnyspense</Text>

                <TextInput
                    placeholder="How many 🥕 did you spend?"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    style={styles.input}
                />

                <TextInput
                    placeholder="When did you spend? (dd/mm/yyyy) 📅"
                    value={date}
                    onChangeText={handleDateChange}
                    keyboardType="numeric"
                    style={styles.input}
                    maxLength={10}
                />

                <Text style={styles.subtitle}>Pick a category</Text>
                <DropDownPicker
                    open={open}
                    value={selectedCategory}
                    items={categoryItems}
                    setOpen={setOpen}
                    setValue={setSelectedCategory}
                    placeholder="Select category"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                />

                {selectedCategory && (
                    <>
                        <Text style={styles.subtitle}>Pick a subcategory</Text>
                        <View style={styles.subList}>
                            {currentSubcategories.map((sub) => (
                                <TouchableOpacity
                                    key={sub}
                                    onPress={() => setSelectedSubcategory(sub)}
                                    style={[
                                        styles.subItem,
                                        selectedSubcategory === sub && styles.subItemActive,
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.subItemText,
                                            selectedSubcategory === sub && styles.subItemTextActive,
                                        ]}
                                    >
                                        {sub}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </>
                )}

                <TextInput
                    placeholder="Any notes, bunbun? 🐇"
                    value={note}
                    onChangeText={setNote}
                    style={styles.input}
                />

                <TouchableOpacity
                    onPress={handleSave}
                    style={[styles.button, (loading || saving) && styles.buttonDisabled]}
                    disabled={loading || saving}
                >
                    <Text style={styles.buttonText}>
                        {saving ? 'Saving...' : 'Update Bunnyspense 🐾'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={handleDelete}
                    style={[
                        styles.button,
                        styles.deleteButton,
                        loading && styles.buttonDisabled
                    ]}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>Delete Bunnyspense 🗑️</Text>
                </TouchableOpacity>
            </ScrollView>
        </ImageBackground>
    );
} 