import { View, Text, TextInput, TouchableOpacity, Image, ImageBackground, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useState } from 'react';
import styles from '../../../../../styles/incomeStep';
import bg from '@assets/bg/steps.png';

interface IncomeType {
    [key: string]: string;
}

interface IncomeStepProps {
    onNext: () => void;
    onBack: () => void;
    data: {
        incomes?: { type: string; amount: string }[];
    };
    updateData: (data: { incomes: { type: string; amount: string }[] }) => void;
}

const incomeTypes = ['salary', 'pension', 'freelancing', 'investments', 'scholarship', 'other'] as const;
type IncomeTypeKey = typeof incomeTypes[number];

const icons: Record<IncomeTypeKey, any> = {
    salary: require('@assets/icons/income.png'),
    pension: require('@assets/icons/income.png'),
    freelancing: require('@assets/icons/income.png'),
    investments: require('@assets/icons/income.png'),
    scholarship: require('@assets/icons/income.png'),
    other: require('@assets/icons/income.png'),
};

export default function IncomeStep({ onNext, data, updateData, onBack }: IncomeStepProps) {
    // Initialize state from data or with empty strings
    const [incomes, setIncomes] = useState<IncomeType>(() => {
        const initialIncomes: IncomeType = {};
        incomeTypes.forEach(type => {
            const existingIncome = data.incomes?.find(inc => inc.type === type);
            initialIncomes[type] = existingIncome?.amount || '';
        });
        return initialIncomes;
    });

    const handleChange = (type: string, value: string) => {
        setIncomes(prev => ({ ...prev, [type]: value }));
    };

    const getTotalIncome = () => {
        return Object.values(incomes).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
    };

    const handleContinue = () => {
        const formatted = Object.entries(incomes)
            .filter(([_, val]) => val)
            .map(([type, amount]) => ({ type, amount }));
        updateData({ incomes: formatted });
        onNext();
    };

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
                    <Text style={styles.title}>Income</Text>

                    {incomeTypes.map((type) => (
                        <View key={type} style={styles.row}>
                            <Image source={icons[type]} style={styles.icon} />
                            <Text style={styles.label}>{type.charAt(0).toUpperCase() + type.slice(1)}</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                placeholder="0"
                                placeholderTextColor="#C4A471"
                                value={incomes[type]}
                                onChangeText={(val) => handleChange(type, val)}
                            />
                        </View>
                    ))}

                    <Text style={styles.totalText}>Income: {getTotalIncome()} RON</Text>

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
