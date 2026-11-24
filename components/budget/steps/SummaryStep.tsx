import { View, ScrollView, Text, TouchableOpacity, Alert, ImageBackground, KeyboardAvoidingView, Platform } from 'react-native';
import styles from '../../../styles/summaryStep';
import { auth, db } from '@lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import bg from '@assets/bg/steps.png';

interface Income {
    type: string;
    amount: string;
}

interface Subcategory {
    name: string;
    amount: string;
}

interface Category {
    name: string;
    subcategories: Subcategory[];
}

interface SummaryStepProps {
    saving: boolean;
    onFinish: () => void;
    onBack: () => void;
    data: {
        name: string;
        period: string;
        startDay: string;
        incomes: Income[];
        categories: Category[];
    };
}

export default function SummaryStep({ onFinish, onBack, data, saving }: SummaryStepProps) {
    const totalIncome = data.incomes?.reduce((sum: number, i: Income) => sum + parseFloat(i.amount || '0'), 0) || 0;

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
                    <Text style={styles.title}>You're all set up!</Text>
                    <Text style={styles.subtitle}>Here's a summary of your budget plan.</Text>

                    <Text style={styles.highlightText}>Total Income: {totalIncome} RON</Text>

                    <Text style={styles.sectionTitle}>Income:</Text>
                    {data.incomes.map((inc: Income, i: number) => (
                        <Text key={i} style={styles.itemText}>
                            • {inc.type}: {inc.amount} RON
                        </Text>
                    ))}

                    <Text style={styles.sectionTitle}>Expenses:</Text>
                    {data.categories.map((cat: Category, i: number) => (
                        <View key={i}>
                            <Text style={styles.categoryTitle}>• {cat.name}</Text>
                            {cat.subcategories
                                .filter((sub: Subcategory) => sub.amount && parseFloat(sub.amount) > 0)
                                .map((sub: Subcategory, j: number) => (
                                    <Text key={j} style={styles.subItemText}>
                                        - {sub.name}: {sub.amount} RON
                                    </Text>
                                ))}
                        </View>
                    ))}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity onPress={onBack} disabled={saving} style={[styles.button, styles.backButton]}>
                            <Text style={[styles.buttonText, styles.backButtonText]}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={onFinish} disabled={saving} style={styles.button}>
                            <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save Budget'}</Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}
