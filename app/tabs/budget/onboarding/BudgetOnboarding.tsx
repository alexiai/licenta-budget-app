import React, { useState, useEffect } from 'react';
import { View, Alert, StyleSheet, TouchableOpacity, Text, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, setDoc } from 'firebase/firestore';
import { auth, db } from '@lib/firebase';
import BasicInfoStep from './steps/BasicInfoStep';
import IncomeStep from './steps/IncomeStep';
import ExpensesStep from './steps/ExpensesStep';
import SummaryStep from './steps/SummaryStep';
import bg from '@assets/bg/basicinfobackground.png';
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
    const [initialized, setInitialized] = useState(false);
    const [mode, setMode] = useState<'create' | 'edit'>('create');
    const [formData, setFormData] = useState<FormData>({
        name: '',
        period: 'monthly',
        startDay: '1',
        incomes: [],
        categories: [],
    });

    useEffect(() => {
        const init = async () => {
            const hasJustCreated = await AsyncStorage.getItem('hasJustCreatedBudget');
            if (hasJustCreated === 'true') {
                await AsyncStorage.removeItem('hasJustCreatedBudget');
                router.replace('/tabs/budget');
            }
            setInitialized(true);
        };
        init();
    }, []);

    const updateData = (updates: Partial<FormData>) => {
        setFormData((prev) => ({ ...prev, ...updates }));
    };

    const goToNext = () => setStep((prev) => prev + 1);
    const goToPrev = () => setStep((prev) => prev - 1);

    const saveToFirebase = async () => {
        console.log('💾 Saving budget to Firebase...');
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('User not logged in!');
            return;
        }

        const docRef = doc(collection(db, 'budgets'));
        const payload = {
            userId: user.uid,
            name: formData.name,
            period: formData.period,
            startDay: formData.startDay,
            incomes: formData.incomes,
            categories: formData.categories,
            amount: formData.incomes.reduce((sum, i) => sum + parseFloat(i.amount), 0),
            createdAt: new Date().toISOString(),
        };

        try {
            await setDoc(docRef, payload);
            await AsyncStorage.setItem('hasJustCreatedBudget', 'true');
            await AsyncStorage.setItem('selectedBudget', docRef.id);
            Alert.alert('Budget created!');
            router.replace('/tabs/budget');
        } catch (error) {
            console.error('❌ Error saving budget:', error);
            Alert.alert('Something went wrong. Please try again.');
        }
    };

    const handleCancel = () => {
        Alert.alert(
            'Cancel Budget Creation',
            'Are you sure you want to cancel? All progress will be lost.',
            [
                {
                    text: 'No, Continue',
                    style: 'cancel',
                },
                {
                    text: 'Yes, Cancel',
                    style: 'destructive',
                    onPress: () => router.back(),
                },
            ]
        );
    };

    if (!initialized) {
        return null;
    }

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
                {step === 3 && <SummaryStep data={formData} onFinish={saveToFirebase} onBack={goToPrev} />}
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
