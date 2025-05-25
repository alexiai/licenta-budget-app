import React, { useEffect, useState } from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import AIAdviceCard from './AIAdviceCard';
import { BunnyAdvisor } from '@lib/ai/budgetAnalyzer';
import { auth, db } from '@lib/firebase';
import type { AIAdvice } from '@lib/types';

import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';

export default function AiScreen(): JSX.Element {
    const [advice, setAdvice] = useState<AIAdvice[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchAndAnalyze() {
            try {
                const user = auth.currentUser;
                if (!user) {
                    console.warn('User not logged in');
                    setAdvice([]);
                    setLoading(false);
                    return;
                }
                const userId = user.uid;

                // Preluare cheltuieli
                const expensesRef = collection(db, 'expenses');
                const q = query(expensesRef, where('userId', '==', userId));
                const expensesSnapshot = await getDocs(q);
                const transactions = expensesSnapshot.docs.map(doc => doc.data());

                // Preluare buget
                const budgetDocRef = doc(db, 'budgets', `budget-${userId}`);
                const budgetDoc = await getDoc(budgetDocRef);
                const budget = budgetDoc.data();

                if (!budget) {
                    console.warn('Budget not found for user:', userId);
                    setAdvice([]);
                    setLoading(false);
                    return;
                }

                // Apel BunnyAdvisor
                const adviceData = await BunnyAdvisor.analyzeTransactions(transactions, budget);
                setAdvice(adviceData);
            } catch (error) {
                console.error('Error fetching AI advice:', error);
                setAdvice([]);
            } finally {
                setLoading(false);
            }
        }

        fetchAndAnalyze();
    }, []);

    if (loading) return <Text style={styles.loadingText}>Loading AI advice...</Text>;

    return (
        <View style={styles.container}>
            <ScrollView contentContainerStyle={styles.scrollContent}>
                {advice.length === 0 ? (
                    <Text style={{ textAlign: 'center', color: '#91483C' }}>
                        No bunny tips yet. Check back soon! 🐰
                    </Text>
                ) : (
                    advice.map((item, index) => <AIAdviceCard key={index} advice={item} />)
                )}
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f0f8ff' },
    scrollContent: { padding: 16 },
    loadingText: { color: '#91483C', marginTop: 40, textAlign: 'center' }
});
