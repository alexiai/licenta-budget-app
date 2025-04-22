import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import styles from '@styles/expensesAdd';

const categories = [
    {
        label: 'Housing',
        value: 'housing',
        subcategories: ['Rent', 'Electricity', 'Water', 'Internet', 'TV', 'Insurance', 'Home Supplies'],
    },
    {
        label: 'Food & Drinks',
        value: 'food',
        subcategories: ['Groceries', 'Restaurant', 'Coffee', 'Drinks'],
    },
    {
        label: 'Transport',
        value: 'transport',
        subcategories: ['Gas', 'Taxi', 'Parking', 'Public Transport', 'Car Insurance', 'Car Loan', 'Flight', 'Repair'],
    },
    {
        label: 'Health',
        value: 'health',
        subcategories: ['Medication', 'Doctor', 'Therapy', 'Insurance'],
    },
    {
        label: 'Lifestyle',
        value: 'lifestyle',
        subcategories: ['Clothes', 'Gym', 'Self-care', 'Subscriptions'],
    },
    {
        label: 'Entertainment',
        value: 'entertainment',
        subcategories: ['Cinema', 'Games', 'Books', 'Concerts'],
    },
    {
        label: 'Savings',
        value: 'savings',
        subcategories: ['Savings', 'Vacation Savings'],
    },
    {
        label: 'Other',
        value: 'other',
        subcategories: ['Miscellaneous'],
    },
];

export default function AddExpense() {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [budgetId, setBudgetId] = useState<string | null>(null);

    const categoryItems = categories.map((cat) => ({
        label: cat.label,
        value: cat.value,
    }));

    const handleAddExpense = async () => {
        if (!amount || !selectedCategory || !selectedSubcategory) {
            return Alert.alert('Missing fields', 'Please fill in all required fields.');
        }

        const user = auth.currentUser;
        if (!user) return;

        try {
            const parsedAmount = parseFloat(amount);
            const expense = {
                userId: user.uid,
                budgetId,
                amount: parsedAmount,
                category: selectedCategory,
                subcategory: selectedSubcategory,
                note,
                date: new Date().toISOString(),
                currency: 'RON',
            };

            await addDoc(collection(db, 'expenses'), expense);

            // 🛠 Update current budget
            if (budgetId) {
                const ref = doc(db, 'budgets', budgetId);
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const current = snap.data();
                    const newAmount = (current.amount || 0) - parsedAmount;
                    await updateDoc(ref, {
                        amount: newAmount,
                        updatedAt: new Date().toISOString(),
                    });
                }
            }

            Alert.alert('Expense saved');
            router.push('/tabs/overview/list');
        } catch (err) {
            console.error(err);
            Alert.alert('Failed to save expense');
        }
    };

    useEffect(() => {
        (async () => {
            const storedId = await AsyncStorage.getItem('selectedBudget');
            if (storedId) setBudgetId(storedId);
        })();
    }, []);

    const currentSubcategories =
        categories.find((c) => c.value === selectedCategory)?.subcategories ?? [];

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <Text style={styles.title}>Add Expense</Text>

            <TextInput
                placeholder="Amount"
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
                style={styles.input}
            />

            <Text style={styles.subtitle}>Category</Text>
            <DropDownPicker
                open={open}
                value={selectedCategory}
                items={categoryItems}
                setOpen={setOpen}
                setValue={setSelectedCategory}
                placeholder="Select category"
                style={styles.dropdown}
                dropDownContainerStyle={{ borderRadius: 10 }}
            />

            {selectedCategory && (
                <>
                    <Text style={styles.subtitle}>Subcategory</Text>
                    <View style={styles.subList}>
                        {currentSubcategories.map((sub, idx) => (
                            <TouchableOpacity
                                key={idx}
                                onPress={() => setSelectedSubcategory(sub)}
                                style={[
                                    styles.subItem,
                                    selectedSubcategory === sub && styles.subItemActive,
                                ]}
                            >
                                <Text style={styles.subItemText}>{sub}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </>
            )}

            <TextInput
                placeholder="Note (optional)"
                value={note}
                onChangeText={setNote}
                style={styles.input}
            />

            <TouchableOpacity onPress={handleAddExpense} style={styles.button}>
                <Text style={styles.buttonText}>Save Expense</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
