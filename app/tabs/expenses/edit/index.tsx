import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../../../lib/firebase';
import { Ionicons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CategorySelector from '../../../../components/CategorySelector';
import DateInput from '../../../../components/DateInput';
import { parseDateInput } from '../../../../lib/utils/dateUtils';
import styles from '../../../../styles/addExpense';
import bg from '../../../../assets/bg/background3.png';

export default function EditExpense() {
    const router = useRouter();
    const { expenseId } = useLocalSearchParams();
    const [amount, setAmount] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedSubcategory, setSelectedSubcategory] = useState('');
    const [note, setNote] = useState('');
    const [dateInput, setDateInput] = useState('');
    const [budgetId, setBudgetId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

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
                    setDateInput(new Date(data.date).toLocaleDateString('en-GB'));
                }

                const storedBudgetId = await AsyncStorage.getItem('selectedBudget');
                setBudgetId(storedBudgetId);
                setLoading(false);
            } catch (error) {
                console.error('Error loading expense:', error);
                alert('Failed to load expense details.');
                router.back();
            }
        };

        loadExpense();
    }, [expenseId]);

    const handleSave = async () => {
        if (!amount || !selectedCategory || !selectedSubcategory) {
            alert('Please fill in all required fields.');
            return;
        }

        const parsedDate = parseDateInput(dateInput);
        if (!parsedDate) {
            alert('Please enter a valid date in format dd/mm/yyyy');
            return;
        }

        try {
            const expenseRef = doc(db, 'expenses', expenseId as string);
            await updateDoc(expenseRef, {
                amount: parseFloat(amount),
                category: selectedCategory,
                subcategory: selectedSubcategory,
                note: note || selectedSubcategory,
                date: parsedDate.toISOString(),
            });

            setIsEditing(false);
            alert('Expense updated successfully!');
            router.back();
        } catch (error) {
            console.error('Error updating expense:', error);
            alert('Failed to update expense.');
        }
    };

    const handleCategorySelect = (category: string) => {
        setSelectedCategory(category);
        setSelectedSubcategory(''); // Clear subcategory when category changes
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text>Loading...</Text>
            </View>
        );
    }

    return (
        <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#91483c" />
                </TouchableOpacity>
                <Text style={styles.title}>Edit Bunnyspense</Text>
                <TouchableOpacity onPress={() => setIsEditing(prev => !prev)} style={styles.editButton}>
                    <Feather name={isEditing ? 'check' : 'edit'} size={22} color="#91483c" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.form}>
                <View style={styles.formGroup}>
                    <Text style={styles.label}>Category</Text>
                    <TouchableOpacity 
                        style={[styles.input, !isEditing && styles.disabledInput]} 
                        onPress={() => isEditing && setSelectedCategory('')}
                        disabled={!isEditing}
                    >
                        <Text style={styles.inputText}>{selectedCategory || 'Select Category'}</Text>
                    </TouchableOpacity>
                    {isEditing && !selectedCategory && (
                        <CategorySelector
                            onSelectCategory={handleCategorySelect}
                            onSelectSubcategory={setSelectedSubcategory}
                        />
                    )}
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Subcategory</Text>
                    <TouchableOpacity 
                        style={[styles.input, !isEditing && styles.disabledInput]} 
                        onPress={() => isEditing && setSelectedSubcategory('')}
                        disabled={!isEditing}
                    >
                        <Text style={styles.inputText}>{selectedSubcategory || 'Select Subcategory'}</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Amount</Text>
                    <TextInput
                        style={[styles.input, !isEditing && styles.disabledInput]}
                        value={amount}
                        onChangeText={setAmount}
                        keyboardType="numeric"
                        placeholder="Enter amount"
                        editable={isEditing}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Date</Text>
                    <DateInput
                        value={dateInput}
                        onChange={setDateInput}
                        style={[styles.input, !isEditing && styles.disabledInput]}
                        editable={isEditing}
                    />
                </View>

                <View style={styles.formGroup}>
                    <Text style={styles.label}>Note (Optional)</Text>
                    <TextInput
                        style={[styles.input, !isEditing && styles.disabledInput]}
                        value={note}
                        onChangeText={setNote}
                        placeholder="Add a note"
                        multiline
                        editable={isEditing}
                    />
                </View>

                {isEditing && (
                    <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
                        <Text style={styles.saveButtonText}>Save Changes</Text>
                    </TouchableOpacity>
                )}
            </ScrollView>
        </ImageBackground>
    );
} 