import { View, Text, TextInput, TouchableOpacity, Image, ImageBackground, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import styles from '@styles/incomeStep';
import bg from '@assets/bg/basicinfobackground.png';

const icons = {
    salary: require('@assets/icons/income.png'),
    pension: require('@assets/icons/income.png'),
    freelancing: require('@assets/icons/income.png'),
    investments: require('@assets/icons/income.png'),
    scholarship: require('@assets/icons/income.png'),
    other: require('@assets/icons/income.png'),
};

const incomeTypes = ['salary', 'pension', 'freelancing', 'investments', 'scholarship', 'other'];

export default function IncomeStep({ onNext, data, updateData }) {
    const [incomes, setIncomes] = useState(
        data.incomes || {
            salary: '',
            pension: '',
            freelancing: '',
            investments: '',
            scholarship: '',
            other: '',
        }
    );

    const handleChange = (type, value) => {
        setIncomes((prev) => ({ ...prev, [type]: value }));
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
            style={{
                flex: 1,
                width: '110%',
                transform: [{ translateX: -20 }, { translateY: -40 }],
            }}
        >
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
                <View style={styles.container}>
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

                    <TouchableOpacity onPress={handleContinue} style={styles.button}>
                        <Text style={styles.buttonText}>Next</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}
