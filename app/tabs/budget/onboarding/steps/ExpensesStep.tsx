import { View, ScrollView, Text, TouchableOpacity, TextInput, FlatList, Image } from 'react-native';
import { useState } from 'react';
import styles from '@styles/expensesStep';
import expenseCategories from '@lib/categories';

export default function ExpensesStep({ onNext, data, updateData }) {
    const [selected, setSelected] = useState(data.categories || []);

    const toggleCategory = (label) => {
        const exists = selected.find((cat) => cat.name === label);
        if (exists) {
            setSelected((prev) => prev.filter((cat) => cat.name !== label));
        } else {
            const found = expenseCategories.find((cat) => cat.label === label);
            const subcategories = found?.subcategories?.map((sub) => ({ name: sub, amount: '' })) || [];
            setSelected((prev) => [...prev, { name: label, subcategories }]);
        }
    };

    const updateAmount = (catName, subName, value) => {
        setSelected((prev) =>
            prev.map((cat) =>
                cat.name === catName
                    ? {
                        ...cat,
                        subcategories: cat.subcategories.map((sub) =>
                            sub.name === subName ? { ...sub, amount: value } : sub
                        ),
                    }
                    : cat
            )
        );
    };

    const totalIncome = data.incomes.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0);
    const totalExpenses = selected.reduce(
        (catSum, cat) =>
            catSum +
            cat.subcategories.reduce((sum, sub) => sum + (parseFloat(sub.amount) || 0), 0),
        0
    );

    const remaining = totalIncome - totalExpenses;

    const handleContinue = () => {
        const filtered = selected
            .map((cat) => ({
                ...cat,
                subcategories: cat.subcategories.filter((sub) => sub.amount),
            }))
            .filter((cat) => cat.subcategories.length);

        updateData({ categories: filtered });
        onNext();
    };

    return (
        <ScrollView style={styles.wrapper} contentContainerStyle={styles.container}>
            <Text style={styles.title}>📦 Pick Your Expense Boxes</Text>
            <Text style={styles.subtitle}>Choose categories & add planned amounts</Text>

            <Text style={[styles.remainingText, { color: remaining < 0 ? '#E63946' : '#2A9D8F' }]}>💸 {remaining < 0 ? `Over budget by ${Math.abs(remaining)} RON` : `Remaining budget: ${remaining} RON`}</Text>

            <FlatList
                data={expenseCategories}
                numColumns={2}
                keyExtractor={(item) => item.label}
                columnWrapperStyle={styles.column}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                    const selectedCat = selected.find((cat) => cat.name === item.label);
                    return (
                        <View style={styles.card}>
                            <TouchableOpacity
                                style={[styles.categoryBox, selectedCat && styles.activeCategory]}
                                onPress={() => toggleCategory(item.label)}
                            >
                                <Image source={item.icon} style={styles.icon} />
                                <Text style={styles.catLabel}>{item.label}</Text>
                            </TouchableOpacity>
                            {selectedCat &&
                                selectedCat.subcategories.map((sub, idx) => (
                                    <TextInput
                                        key={idx}
                                        placeholder={`${sub.name} (RON)`}
                                        keyboardType="numeric"
                                        placeholderTextColor="#999"
                                        value={sub.amount}
                                        onChangeText={(text) => updateAmount(item.label, sub.name, text)}
                                        style={styles.input}
                                    />
                                ))}
                        </View>
                    );
                }}
            />

            <TouchableOpacity
                onPress={handleContinue}
                style={[styles.button, remaining < 0 && { backgroundColor: '#ccc' }]}
                disabled={remaining < 0}
            >
                <Text style={styles.buttonText}>🎯 Continue</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
