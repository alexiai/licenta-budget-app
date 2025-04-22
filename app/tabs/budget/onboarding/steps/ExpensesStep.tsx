import { View, ScrollView, Text, TouchableOpacity, FlatList, TextInput, Image, Alert } from 'react-native';
import { useState } from 'react';
import styles from './styles';

const expenseCategories = [
    {
        label: 'Housing',
        icon: require('@assets/icons/home.png'),
        subcategories: ['Rent', 'Electricity', 'Water', 'Internet', 'TV', 'Insurance', 'Home Supplies'],
    },
    {
        label: 'Food & Drinks',
        icon: require('@assets/icons/food.png'),
        subcategories: ['Groceries', 'Restaurant', 'Coffee', 'Drinks'],
    },
    {
        label: 'Transport',
        icon: require('@assets/icons/transport.png'),
        subcategories: ['Gas', 'Taxi', 'Parking', 'Public Transport', 'Car Insurance', 'Car Loan', 'Flight', 'Repair'],
    },
    {
        label: 'Health',
        icon: require('@assets/icons/health.png'),
        subcategories: ['Medication', 'Doctor', 'Therapy', 'Insurance'],
    },
    {
        label: 'Lifestyle',
        icon: require('@assets/icons/lifestyle.png'),
        subcategories: ['Clothes', 'Gym', 'Self-care', 'Subscriptions'],
    },
    {
        label: 'Entertainment',
        icon: require('@assets/icons/lifestyle.png'),
        subcategories: ['Cinema', 'Games', 'Books', 'Concerts'],
    },
    {
        label: 'Savings',
        icon: require('@assets/icons/income.png'),
        subcategories: ['Savings', 'Vacation Savings'],
    },
    {
        label: 'Other',
        icon: require('@assets/icons/pension.png'),
        subcategories: ['Miscellaneous'],
    },
];

export default function ExpensesStep({ onNext, data, updateData }) {
    const [selected, setSelected] = useState(data.categories || []);

    const toggleCategory = (label: string) => {
        const isSelected = selected.find((cat) => cat.name === label);
        if (isSelected) {
            setSelected((prev) => prev.filter((cat) => cat.name !== label));
        } else {
            const found = expenseCategories.find((cat) => cat.label === label);
            if (!found) return;
            const subcategories = found.subcategories.map((sub) => ({
                name: sub,
                amount: '',
            }));
            setSelected((prev) => [...prev, { name: label, subcategories }]);
        }
    };

    const updateAmount = (catName: string, subName: string, value: string) => {
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
    const totalExpenses = selected.reduce((catSum, cat) => {
        return (
            catSum +
            cat.subcategories.reduce((subSum, sub) => {
                return sub.amount ? subSum + parseFloat(sub.amount) : subSum;
            }, 0)
        );
    }, 0);

    const remaining = totalIncome - totalExpenses;

    const handleContinue = () => {
        if (remaining < 0) {
            Alert.alert("Budget exceeded", "Your expenses exceed your income. Please adjust them before continuing.");
            return;
        }

        // Filtrăm subcategoriile goale
        const filtered = selected.map((cat) => ({
            ...cat,
            subcategories: cat.subcategories.filter((sub) => sub.amount && parseFloat(sub.amount) > 0)
        })).filter((cat) => cat.subcategories.length > 0);

        updateData({ categories: filtered });
        onNext();
    };

    return (
        <ScrollView style={styles.container}>
            <Text style={styles.title}>Preferred Expenses</Text>
            <Text style={styles.subtitle}>Choose categories and set amounts per subcategory.</Text>

            {/* 🔢 Bugetul rămas în timp real */}
            <Text
                style={[
                    { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
                    { color: remaining >= 0 ? 'green' : 'red' },
                ]}
            >
                {remaining >= 0
                    ? `Remaining budget: ${remaining.toFixed(2)} RON`
                    : `🚨 Over budget by ${Math.abs(remaining).toFixed(2)} RON`}
            </Text>

            <FlatList
                data={expenseCategories}
                keyExtractor={(item) => item.label}
                numColumns={2}
                columnWrapperStyle={styles.columnWrapper}
                contentContainerStyle={styles.flatListContent}
                renderItem={({ item }) => {
                    const isSelected = selected.find((cat) => cat.name === item.label);
                    return (
                        <View style={styles.categoryWrapper}>
                            <TouchableOpacity
                                onPress={() => toggleCategory(item.label)}
                                style={[styles.categoryButton, isSelected ? styles.selected : styles.unselected]}
                            >
                                <Image source={item.icon} style={styles.icon} />
                                <Text style={styles.categoryLabel}>{item.label}</Text>
                            </TouchableOpacity>

                            {isSelected &&
                                isSelected.subcategories.map((sub, index) => (
                                    <TextInput
                                        key={index}
                                        placeholder={`${sub.name} (RON)`}
                                        keyboardType="numeric"
                                        value={sub.amount}
                                        onChangeText={(text) => updateAmount(item.label, sub.name, text)}
                                        style={styles.input}
                                        placeholderTextColor="#aaa"
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
                <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}
