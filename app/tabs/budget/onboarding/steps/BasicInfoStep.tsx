import { View, Text, TextInput, TouchableOpacity, ImageBackground, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useState } from 'react';
import styles from '../../../../../styles/basicInfoStep';
import bg from '@assets/bg/steps.png';
import { useRouter } from 'expo-router';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from '@lib/firebase';

interface BasicInfoStepProps {
    onNext: () => void;
    data: {
        name?: string;
        period?: string;
        startDay?: string;
    };
    updateData: (data: { name: string; period: string; startDay: string }) => void;
}

export default function BasicInfoStep({ onNext, data, updateData }: BasicInfoStepProps) {
    const router = useRouter();
    const [name, setName] = useState(data.name || '');
    const [periodOpen, setPeriodOpen] = useState(false);
    const [period, setPeriod] = useState(data.period || 'monthly');
    const [startDayOpen, setStartDayOpen] = useState(false);
    const [startDay, setStartDay] = useState(data.startDay || '1');
    const [isValidating, setIsValidating] = useState(false);

    const periodOptions = [
        { label: 'Monthly 📅', value: 'monthly' },
        { label: 'Weekly 🗓️', value: 'weekly' },
        { label: 'Biweekly 🔁', value: 'biweekly' },
    ];

    const dayOptions = Array.from({ length: 31 }, (_, i) => ({
        label: `${i + 1}`,
        value: `${i + 1}`,
    }));

    const validateBudgetName = async () => {
        if (!name.trim()) {
            Alert.alert('Error', 'Please enter a budget name');
            return false;
        }

        setIsValidating(true);
        try {
            const user = auth.currentUser;
            if (!user) {
                Alert.alert('Error', 'You must be logged in to create a budget');
                return false;
            }

            const q = query(
                collection(db, 'budgets'),
                where('userId', '==', user.uid),
                where('name', '==', name.trim())
            );
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                Alert.alert('Error', 'A budget with this name already exists. Please choose a different name.');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Error validating budget name:', error);
            Alert.alert('Error', 'Failed to validate budget name. Please try again.');
            return false;
        } finally {
            setIsValidating(false);
        }
    };

    const handleContinue = async () => {
        const isValid = await validateBudgetName();
        if (isValid) {
            updateData({ name: name.trim(), period, startDay });
            onNext();
        }
    };

    const handleBack = () => {
        router.replace('/tabs/budget');
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
            >
                <View style={styles.container}>
                    <Text style={styles.title}>Create Budget</Text>

                    <Text style={styles.label}>Budget Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Monthly Budget"
                        placeholderTextColor="#D6A77A"
                        value={name}
                        onChangeText={setName}
                    />

                    <Text style={styles.label}>TYPE</Text>
                    <View style={styles.typeButtons}>
                        {periodOptions.map((opt) => (
                            <TouchableOpacity
                                key={opt.value}
                                onPress={() => setPeriod(opt.value)}
                                style={[
                                    styles.typeButton,
                                    period === opt.value && styles.typeButtonSelected,
                                ]}
                            >
                                <Text style={styles.typeButtonText}>
                                    {opt.label.replace(/📅|🗓️|🔁/, '')}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.label}>START DATE</Text>
                    <View style={{ zIndex: startDayOpen ? 1000 : 0 }}>
                        <DropDownPicker
                            open={startDayOpen}
                            value={startDay}
                            items={
                                period === 'weekly'
                                    ? [
                                        { label: 'Monday', value: 'monday' },
                                        { label: 'Tuesday', value: 'tuesday' },
                                        { label: 'Wednesday', value: 'wednesday' },
                                        { label: 'Thursday', value: 'thursday' },
                                        { label: 'Friday', value: 'friday' },
                                        { label: 'Saturday', value: 'saturday' },
                                        { label: 'Sunday', value: 'sunday' },
                                    ]
                                    : dayOptions
                            }
                            setOpen={setStartDayOpen}
                            setValue={setStartDay}
                            placeholder="Start day"
                            style={styles.dropdown}
                            dropDownContainerStyle={styles.dropdownContainer}
                        />
                    </View>

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity onPress={handleBack} style={[styles.button, styles.backButton]}>
                            <Text style={[styles.buttonText, styles.backButtonText]}>Back</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleContinue} style={styles.button}>
                            <Text style={styles.buttonText}>Next</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </KeyboardAvoidingView>
        </ImageBackground>
    );
}
