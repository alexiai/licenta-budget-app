import { View, Text, TextInput, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { addDoc, collection, doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '@lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import bg from '@assets/bg/background2.png';
import categories from '@lib/categories';
import styles from '@styles/expensesAdd';

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
        value: cat.label,
    }));

    const handleAddExpense = async () => {
        if (!amount || !selectedCategory || !selectedSubcategory) {
            alert('Please fill in all required fields.');
            return;
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
                note: note || selectedSubcategory,
                date: new Date().toISOString(),
                currency: 'RON',
            };

            await addDoc(collection(db, 'expenses') as any, expense);

            if (budgetId) {
                const ref = doc(db, 'budgets', budgetId) as any;
                const snap = await getDoc(ref);
                if (snap.exists()) {
                    const current = snap.data();
                    const newAmount = (current.amount || 0) - parsedAmount;
                    await updateDoc(ref, {
                        amount: newAmount,
                        updatedAt: new Date().toISOString(),
                    } as any);
                }
            }

            alert('Expense saved!');
            router.push('/tabs/overview/list');
        } catch (err) {
            console.error(err);
            alert('Failed to save expense.');
        }
    };

    useEffect(() => {
        (async () => {
            const storedId = await AsyncStorage.getItem('selectedBudget');
            if (storedId) setBudgetId(storedId);
        })();
    }, []);

    const currentSubcategories =
        categories.find((c) => c.label === selectedCategory)?.subcategories || [];

    return (
        <ImageBackground source={bg} style={styles.background} resizeMode="cover">
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Add a Bunnyspense</Text>

                <TextInput
                    placeholder="How many 🥕 did you spend?"
                    value={amount}
                    onChangeText={setAmount}
                    keyboardType="numeric"
                    style={styles.input}
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

                <TouchableOpacity onPress={handleAddExpense} style={styles.button}>
                    <Text style={styles.buttonText}>Save Bunnyspense 🐾</Text>
                </TouchableOpacity>
            </ScrollView>
        </ImageBackground>
    );
}
