import { View, ScrollView, Text, TouchableOpacity, TextInput, Image, ImageBackground, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import styles from '../../../../../styles/expensesStep';
import bg from '@assets/bg/steps.png';
import expenseCategories from '@lib/categories';

interface Category {
    name: string;
    subcategories: Array<{
        name: string;
        amount: string;
    }>;
}

interface Income {
    type: string;
    amount: string;
}

interface ExpensesStepProps {
    onNext: () => void;
    onBack: () => void;
    data: {
        incomes: Income[];
        categories: Category[];
    };
    updateData: (data: { categories: Category[] }) => void;
}

export default function ExpensesStep({ onNext, onBack, data, updateData }: ExpensesStepProps) {
    const [selected, setSelected] = useState<Category[]>(data.categories || []);

    const toggleCategory = (label: string) => {
        const exists = selected.find((cat) => cat.name === label);
        if (exists) {
            setSelected((prev) => prev.filter((cat) => cat.name !== label));
        } else {
            const found = expenseCategories.find((cat) => cat.label === label);
            const subcategories = found?.subcategories?.map((sub) => ({ name: sub, amount: '' })) || [];
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
    const totalExpenses = selected.reduce(
        (catSum, cat) =>
            catSum + cat.subcategories.reduce((sum, sub) => sum + (parseFloat(sub.amount) || 0), 0),
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

    // Split categories into pairs of 2
    const categoryPairs = [];
    for (let i = 0; i < expenseCategories.length; i += 2) {
        categoryPairs.push(expenseCategories.slice(i, i + 2));
    }

    return (
        <ImageBackground
            source={bg}
            resizeMode="cover"
            style={styles.wrapper}
        >
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
            >
                <ScrollView 
                    contentContainerStyle={styles.container}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <Text style={styles.title}>Pick Your Expense Boxes</Text>
                    <Text style={styles.subtitle}>Choose categories & add planned amounts</Text>

                    <Text style={[styles.remainingText, { color: remaining < 0 ? '#E63946' : '#2A9D8F' }]}>
                        {remaining < 0 ? `Over budget by ${Math.abs(remaining)} RON` : `Remaining budget: ${remaining} RON`}
                    </Text>

                    {categoryPairs.map((pair, pairIndex) => (
                        <View key={pairIndex} style={styles.row}>
                            {pair.map((cat) => {
                                const isSelected = selected.some((s) => s.name === cat.label);
                                return (
                                    <View key={cat.label} style={styles.card}>
                                        <TouchableOpacity
                                            onPress={() => toggleCategory(cat.label)}
                                            style={[styles.categoryBox, isSelected && styles.activeCategory]}
                                        >
                                            <Image source={cat.icon} style={styles.icon} />
                                            <Text style={styles.catLabel}>{cat.label}</Text>
                                        </TouchableOpacity>

                                        {isSelected &&
                                            cat.subcategories.map((sub) => {
                                                const selectedCat = selected.find((s) => s.name === cat.label);
                                                const selectedSub = selectedCat?.subcategories.find(
                                                    (s) => s.name === sub
                                                );
                                                return (
                                                    <TextInput
                                                        key={sub}
                                                        style={styles.input}
                                                        placeholder={sub}
                                                        placeholderTextColor="#C4A471"
                                                        keyboardType="numeric"
                                                        value={selectedSub?.amount || ''}
                                                        onChangeText={(value) =>
                                                            updateAmount(cat.label, sub, value)
                                                        }
                                                    />
                                                );
                                            })}
                                    </View>
                                );
                            })}
                        </View>
                    ))}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity onPress={onBack} style={[styles.button, styles.backButton]}>
                            <Text style={[styles.buttonText, styles.backButtonText]}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleContinue} style={styles.button}>
                            <Text style={styles.buttonText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}
