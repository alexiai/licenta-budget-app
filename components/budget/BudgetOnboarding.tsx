import React, { useState, useRef } from 'react';
import { View, Alert, StyleSheet, TouchableOpacity, Text, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@lib/firebase';
import BasicInfoStep from './steps/BasicInfoStep';
import IncomeStep from './steps/IncomeStep';
import ExpensesStep from './steps/ExpensesStep';
import SummaryStep from './steps/SummaryStep';
import bg from '@assets/bg/steps.png';
import { Ionicons } from '@expo/vector-icons';

interface FormData {
    name: string;
    period: string;
    startDay: string;
    incomes: Array<{ type: string; amount: string }>;
    categories: Array<{
        name: string;
        subcategories: Array<{ name: string; amount: string }>;
    }>;
}

export default function BudgetOnboarding() {
    const router = useRouter();
    const [step, setStep] = useState(0);
    const savingRef = useRef(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState<FormData>({
        name: '',
        period: 'monthly',
        startDay: '1',
        incomes: [],
        categories: [],
    });

    const updateData = (updates: Partial<FormData>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    };

    const goToNext = () => setStep((prev) => prev + 1);
    const goToPrev = () => setStep((prev) => prev - 1);

    const saveToFirebase = async () => {
        if (savingRef.current) return;
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Sign in to save your budget.');
            return;
        }

        savingRef.current = true;
        setSaving(true);
        const ref = doc(collection(db, 'budgets'));
        try {
            await setDoc(ref, {
                ...formData,
                userId: user.uid,
                amount: formData.incomes.reduce<number>((total, income) => total + (Number(income.amount) || 0), 0),
                createdAt: new Date().toISOString(),
            });
        } catch {
            savingRef.current = false;
            setSaving(false);
            Alert.alert('Could not save your budget. Try again.');
            return;
        }

        // Firestore already saved the budget. A local preference failure must not create a duplicate.
        await AsyncStorage.setItem('selectedBudget', ref.id).catch(() => {});
        router.replace('/tabs/budget');
    };

    const handleCancel = () => {
        if (saving) return;
        if (router.canGoBack()) router.back();
        else router.replace('/tabs/overview/list');
    };

    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
                    <Ionicons name="arrow-back" size={24} color="#91483C" />
                    <Text style={styles.backButtonText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.stepIndicator}>Step {step + 1} of 4</Text>
            </View>

            <View style={styles.content}>
                {step === 0 && <BasicInfoStep data={formData} updateData={updateData} onNext={goToNext} />}
                {step === 1 && <IncomeStep data={formData} updateData={updateData} onNext={goToNext} onBack={goToPrev} />}
                {step === 2 && <ExpensesStep data={formData} updateData={updateData} onNext={goToNext} onBack={goToPrev} />}
                {step === 3 && <SummaryStep saving={saving} data={formData} onFinish={saveToFirebase} onBack={goToPrev} />}
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefaf6',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 8,
    },
    backButtonText: {
        marginLeft: 8,
        fontSize: 16,
        color: '#91483C',
        fontWeight: '600',
    },
    stepIndicator: {
        fontSize: 16,
        color: '#91483C',
        fontWeight: '600',
    },
    content: {
        flex: 1,
    },
});
