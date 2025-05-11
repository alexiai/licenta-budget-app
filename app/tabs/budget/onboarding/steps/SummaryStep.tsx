import { View, ScrollView, Text, TouchableOpacity, Alert, ImageBackground, KeyboardAvoidingView, Platform } from 'react-native';
import styles from '@styles/summaryStep';
import { auth, db } from '@lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import bg from '@assets/bg/basicinfobackground.png';

export default function SummaryStep({ onFinish, data }) {
    const totalIncome = data.incomes?.reduce((sum, i) => sum + parseFloat(i.amount || '0'), 0) || 0;

    const handleSaveBudget = async () => {
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'User not logged in');
                return;
            }

            const cleanedIncomes = (data.incomes || []).map((i) => ({
                type: i.type,
                amount: String(i.amount ?? '0').trim(),
            }));

            const cleanedCategories = (data.categories || []).map((cat) => ({
                name: cat.name,
                subcategories: (cat.subcategories || []).map((sub) => ({
                    name: sub.name,
                    amount: String(sub.amount ?? '0').trim(),
                })),
            }));

            const budget = {
                name: data.name,
                period: data.period,
                startDay: data.startDay,
                incomes: cleanedIncomes,
                categories: cleanedCategories,
                createdAt: serverTimestamp(),
                userId: user.uid,
                amount: totalIncome,
            };

            await addDoc(collection(db, 'budgets'), budget);
            Alert.alert('Success', 'Budget saved successfully!');
            onFinish();
        } catch (err) {
            console.error(err);
            Alert.alert('Error', 'Failed to save budget');
        }
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
                <ScrollView contentContainerStyle={styles.container}>
                    <Text style={styles.title}>You're all set up!</Text>
                    <Text style={styles.subtitle}>Here's a summary of your budget plan.</Text>

                    <Text style={styles.highlightText}>Total Income: {totalIncome} RON</Text>

                    <Text style={styles.sectionTitle}>Income:</Text>
                    {data.incomes.map((inc, i) => (
                        <Text key={i} style={styles.itemText}>
                            • {inc.type}: {inc.amount} RON
                        </Text>
                    ))}

                    <Text style={styles.sectionTitle}>Expenses:</Text>
                    {data.categories.map((cat, i) => (
                        <View key={i}>
                            <Text style={styles.categoryTitle}>• {cat.name}</Text>
                            {cat.subcategories
                                .filter((sub) => sub.amount && parseFloat(sub.amount) > 0)
                                .map((sub, j) => (
                                    <Text key={j} style={styles.subItemText}>
                                        - {sub.name}: {sub.amount} RON
                                    </Text>
                                ))}
                        </View>
                    ))}

                    <TouchableOpacity onPress={handleSaveBudget} style={styles.button}>
                        <Text style={styles.buttonText}>Save Budget</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}
