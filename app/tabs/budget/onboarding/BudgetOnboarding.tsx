import { View, Text, Alert } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import BasicInfoStep from './steps/BasicInfoStep';
import IncomeStep from './steps/IncomeStep';
import ExpensesStep from './steps/ExpensesStep';
import SummaryStep from './steps/SummaryStep';
import { auth, db } from '../../../../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';



export default function BudgetOnboarding() {
    const router = useRouter();
    const { mode = 'onboarding' } = useLocalSearchParams(); // citim param din URL

    const [step, setStep] = useState(0);
    const [initialized, setInitialized] = useState(false); // evită dublu mount
    const [formData, setFormData] = useState({
        name: '',
        period: '',
        startDay: '',
        incomes: [],
        categories: [],
    });

    useEffect(() => {
        console.log('⚙️ useEffect → mode:', mode);
        // dacă vrei să faci ceva diferit în funcție de mod, poți aici
        setInitialized(true);
    }, []);

    const updateData = (newData) => {
        console.log('📝 updateData called with:', newData);
        setFormData((prev) => ({ ...prev, ...newData }));
    };

    const goToNext = () => {
        console.log(`➡️ Going to next step: ${step} → ${step + 1}`);
        setStep((s) => s + 1);
    };

    const goToPrev = () => {
        console.log(`⬅️ Going back from step: ${step}`);
        setStep((s) => Math.max(0, s - 1));
    };

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

    console.log('🧮 Current Step:', step);

    if (!initialized) {
        console.log('🕒 Waiting for useEffect...');
        return null; // evită flash înainte de useEffect
    }

    console.log('📍 Current Step:', step);
    return (
        <View
            style={{
                flex: 1,
                backgroundColor: '#121212',
                padding: 20,
                minHeight: 600,
                borderWidth: 3,
                borderColor: mode === 'create' ? 'green' : 'red',
            }}
        >
            {step === 0 && <BasicInfoStep data={formData} updateData={updateData} onNext={goToNext} />}
            {step === 1 && <IncomeStep data={formData} updateData={updateData} onNext={goToNext} onBack={goToPrev} />}
            {step === 2 && <ExpensesStep data={formData} updateData={updateData} onNext={goToNext} />}
            {step === 3 && <SummaryStep data={formData} onFinish={saveToFirebase} />}
        </View>
    );
}
