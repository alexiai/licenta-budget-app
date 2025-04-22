import { View, Text, TextInput, TouchableOpacity, FlatList, Image } from 'react-native';
import { useState } from 'react';
import styles from '@styles/incomeStep';

const icons = {
    salary: require('@assets/icons/salary.png'),
    investments: require('@assets/icons/pension.png'),
    freelance: require('@assets/icons/freelance.png'),
    pension: require('@assets/icons/pension.png'),
    other: require('@assets/icons/pension.png'),
};

const incomeTypes = [
    { label: 'Salary', value: 'salary' },
    { label: 'Investments', value: 'investments' },
    { label: 'Freelance', value: 'freelance' },
    { label: 'Pension', value: 'pension' },
    { label: 'Other', value: 'other' },
];

export default function IncomeStep({ onNext, data, updateData }) {
    const [selectedType, setSelectedType] = useState('salary');
    const [amount, setAmount] = useState('');
    const [incomes, setIncomes] = useState(data.incomes || []);
    const isValidAmount = !isNaN(Number(amount)) && Number(amount) > 0;


    const handleAddIncome = () => {
        if (!amount) return;
        setIncomes((prev) => [...prev, { type: selectedType, amount }]);
        setAmount('');
        setSelectedType('salary');
    };

    const handleContinue = () => {
        updateData({ incomes });
        onNext();
    };

    const renderIconButton = ({ item }) => (
        <TouchableOpacity
            onPress={() => setSelectedType(item.value)}
            style={[styles.iconButton, selectedType === item.value ? styles.iconActive : styles.iconInactive]}
        >
            <Image source={icons[item.value]} style={styles.iconImage} />
            <Text style={styles.iconLabel}>{item.label}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Income</Text>
            <Text style={styles.subtitle}>
                Your regular income will be the amount you have to budget for.
            </Text>

            <FlatList
                data={incomeTypes}
                renderItem={renderIconButton}
                keyExtractor={(item) => item.value}
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.iconList}
            />

            <TextInput
                placeholder="Enter amount (RON)"
                placeholderTextColor="#999"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
                style={styles.input}
            />

            <TouchableOpacity onPress={handleAddIncome} style={[styles.button, !isValidAmount && { backgroundColor: '#ccc' }]} disabled={!isValidAmount}>
                <Text style={styles.buttonText}>+ Add Income</Text>
            </TouchableOpacity>


            {incomes.length > 0 && (
                <>
                    <Text style={styles.label}>Your incomes:</Text>
                    {incomes.map((inc, i) => (
                        <Text key={i} style={styles.itemText}>
                            • {inc.type} — {inc.amount} RON
                        </Text>
                    ))}
                </>
            )}

            <TouchableOpacity onPress={handleContinue} style={styles.button}>
                <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
        </View>
    );
}
