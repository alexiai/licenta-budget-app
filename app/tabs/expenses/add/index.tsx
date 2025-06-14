import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import { auth } from '@lib/firebase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DropDownPicker from 'react-native-dropdown-picker';
import bg from '@assets/bg/background2.png';
import categories from '@lib/categories';
import styles from '@styles/expensesAdd';
import expenseService from '../../../services/ExpenseService';

console.log('Imported styles:', styles);

export default function AddExpense() {
    const router = useRouter();
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedSubcategory, setSelectedSubcategory] = useState<string | null>(null);
    const [open, setOpen] = useState(false);
    const [budgetId, setBudgetId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [date, setDate] = useState(new Date().toLocaleDateString('en-GB')); // Format: dd/mm/yyyy
    const [errors, setErrors] = useState({
        amount: '',
        date: '',
        category: '',
        subcategory: '',
        general: ''
    });
    const [successMessage, setSuccessMessage] = useState('');

    useEffect(() => {
        let mounted = true;
        const loadBudgetId = async () => {
            try {
                const storedBudgetId = await AsyncStorage.getItem('selectedBudget');
                if (mounted) {
                    setBudgetId(storedBudgetId);
                }
            } catch (error) {
                console.error('Error loading budget ID:', error);
            }
        };
        loadBudgetId();
        return () => {
            mounted = false;
        };
    }, []);

    const categoryItems = categories.map((cat) => ({
        label: cat.label,
        value: cat.label,
    }));

    const handleDateChange = useCallback((text: string) => {
        const numericText = text.replace(/[^0-9]/g, '');
        
        if (numericText.length <= 8) {
            let formattedText = numericText;
            if (numericText.length > 4) {
                formattedText = numericText.slice(0, 2) + '/' + numericText.slice(2, 4) + '/' + numericText.slice(4);
            } else if (numericText.length > 2) {
                formattedText = numericText.slice(0, 2) + '/' + numericText.slice(2);
            }
            setDate(formattedText);
            
            if (isValidDate(formattedText)) {
                setErrors(prev => ({ ...prev, date: '' }));
            }
        }
    }, []);

    const isValidDate = useCallback((dateString: string) => {
        if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dateString)) return false;
        
        const [day, month, year] = dateString.split('/').map(Number);
        const dateObj = new Date(year, month - 1, day);
        
        return dateObj.getDate() === day &&
               dateObj.getMonth() === month - 1 &&
               dateObj.getFullYear() === year &&
               dateObj <= new Date();
    }, []);

    const currentSubcategories = selectedCategory
        ? categories.find(cat => cat.label === selectedCategory)?.subcategories || []
        : [];

    const validateForm = useCallback(() => {
        const newErrors = {
            amount: '',
            date: '',
            category: '',
            subcategory: '',
            general: ''
        };

        if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
            newErrors.amount = "Oh no! This bunny needs a valid carrot count! 🥕";
        }

        if (!isValidDate(date)) {
            newErrors.date = "Oopsie! This date makes my bunny brain confused! 🐰";
        }

        if (!selectedCategory) {
            newErrors.category = "Hop to it! Pick a category for your carrots! 🌟";
        }

        if (selectedCategory && !selectedSubcategory) {
            newErrors.subcategory = "Almost there! Just need a subcategory to organize your carrots! 🥕";
        }

        setErrors(newErrors);
        return !Object.values(newErrors).some(error => error !== '');
    }, [amount, date, selectedCategory, selectedSubcategory]);

    const handleAddExpense = useCallback(async () => {
        if (!validateForm()) {
            return;
        }

        if (!auth.currentUser || !budgetId) {
            console.error('No user or budget ID');
            return;
        }

        setLoading(true);

        try {
            const [day, month, year] = date.split('/').map(Number);
            const expenseDate = new Date(year, month - 1, day);

            await expenseService.addExpense({
                userId: auth.currentUser.uid,
                budgetId,
                amount: Number(amount),
                category: selectedCategory!,
                subcategory: selectedSubcategory!,
                note: note,
                date: expenseDate.toISOString(),
            });

            setSuccessMessage("Yay! Your Bunnyspense was saved successfully!");
            setTimeout(() => {
                router.back();
            }, 1500);
        } catch (error) {
            console.error('Error adding expense:', error);
            setErrors(prev => ({
                ...prev,
                general: "Oops! Something made this bunny stumble! Try again?"
            }));
        } finally {
            setLoading(false);
        }
    }, [validateForm, auth.currentUser, budgetId, date, amount, selectedCategory, selectedSubcategory, note, router]);

    const renderError = useCallback((message: string) => {
        if (message.length === 0) return null;
        return (
            <View style={{
                backgroundColor: '#FFF9E6',
                borderStyle: 'dashed',
                borderWidth: 2,
                borderColor: '#F56C3D',
                borderRadius: 18,
                padding: 8,
                marginBottom: 12,
                marginHorizontal: 8,
                flexDirection: 'row',
                alignItems: 'center',
            }}>
                <View style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: 'rgba(255, 255, 255, 0.7)',
                    paddingHorizontal: 6,
                    paddingVertical: 3,
                    borderRadius: 10,
                }}>
                    <Text style={{
                        fontSize: 16,
                        fontFamily: 'Fredoka',
                        color: '#F56C3D',
                        fontWeight: 'bold',
                        marginHorizontal: 3,
                    }}>!</Text>
                    <Text style={{
                        fontSize: 14,
                        fontFamily: 'Fredoka',
                        color: '#F56C3D',
                        fontWeight: 'bold',
                    }}>🐰</Text>
                    <Text style={{
                        fontSize: 16,
                        fontFamily: 'Fredoka',
                        color: '#F56C3D',
                        fontWeight: 'bold',
                        marginHorizontal: 3,
                    }}>!</Text>
                </View>
                <Text style={{
                    color: '#F56C3D',
                    fontSize: 14,
                    fontFamily: 'Fredoka',
                    flex: 1,
                    marginHorizontal: 6,
                }}>{message}</Text>
            </View>
        );
    }, []);

    console.log('Current error states:', errors);

    return (
        <ImageBackground source={bg} style={styles.background} resizeMode="cover">
            <ScrollView contentContainerStyle={styles.container}>
                <Text style={styles.title}>Add a Bunnyspense</Text>

                {successMessage && (
                    <View style={{
                        backgroundColor: '#FFF9E6',
                        borderStyle: 'dashed',
                        borderWidth: 2,
                        borderColor: '#4CAF50',
                        borderRadius: 18,
                        padding: 8,
                        marginBottom: 12,
                        marginHorizontal: 8,
                        flexDirection: 'row',
                        alignItems: 'center',
                    }}>
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: 'rgba(255, 255, 255, 0.7)',
                            paddingHorizontal: 6,
                            paddingVertical: 3,
                            borderRadius: 10,
                        }}>
                            <Text style={{
                                fontSize: 16,
                                fontFamily: 'Fredoka',
                                color: '#4CAF50',
                                fontWeight: 'bold',
                                marginHorizontal: 3,
                            }}>✓</Text>
                            <Text style={{
                                fontSize: 14,
                                fontFamily: 'Fredoka',
                                color: '#4CAF50',
                                fontWeight: 'bold',
                            }}>🐰</Text>
                            <Text style={{
                                fontSize: 16,
                                fontFamily: 'Fredoka',
                                color: '#4CAF50',
                                fontWeight: 'bold',
                                marginHorizontal: 3,
                            }}>✓</Text>
                        </View>
                        <Text style={{
                            color: '#4CAF50',
                            fontSize: 14,
                            fontFamily: 'Fredoka',
                            flex: 1,
                            marginHorizontal: 6,
                        }}>{successMessage}</Text>
                    </View>
                )}

                <TextInput
                    placeholder="How many 🥕 did you spend?"
                    value={amount}
                    onChangeText={(text) => {
                        setAmount(text);
                        if (text && !isNaN(Number(text)) && Number(text) > 0) {
                            setErrors(prev => ({ ...prev, amount: '' }));
                        }
                    }}
                    keyboardType="numeric"
                    style={[
                        styles.input,
                        errors.amount ? {
                            borderWidth: 2,
                            borderColor: '#F56C3D',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        } : null
                    ]}
                />
                {renderError(errors.amount)}

                <TextInput
                    placeholder="When did you spend? (dd/mm/yyyy) 📅"
                    value={date}
                    onChangeText={handleDateChange}
                    keyboardType="numeric"
                    style={[
                        styles.input,
                        errors.date ? {
                            borderWidth: 2,
                            borderColor: '#F56C3D',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        } : null
                    ]}
                    maxLength={10}
                />
                {renderError(errors.date)}

                <Text style={styles.subtitle}>Pick a category</Text>
                <DropDownPicker
                    open={open}
                    value={selectedCategory}
                    items={categoryItems}
                    setOpen={setOpen}
                    setValue={(value) => {
                        setSelectedCategory(value);
                        setSelectedSubcategory(null);
                        if (value) {
                            setErrors(prev => ({ ...prev, category: '' }));
                        }
                    }}
                    placeholder="Select category"
                    style={[
                        styles.dropdown,
                        errors.category ? {
                            borderWidth: 2,
                            borderColor: '#F56C3D',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                        } : null
                    ]}
                    dropDownContainerStyle={styles.dropdownContainer}
                />
                {renderError(errors.category)}

                {selectedCategory && (
                    <>
                        <Text style={styles.subtitle}>Pick a subcategory</Text>
                        <View style={styles.subList}>
                            {currentSubcategories.map((sub) => (
                                <TouchableOpacity
                                    key={sub}
                                    onPress={() => {
                                        setSelectedSubcategory(sub);
                                        setErrors(prev => ({ ...prev, subcategory: '' }));
                                    }}
                                    style={[
                                        styles.subItem,
                                        selectedSubcategory === sub && styles.subItemActive,
                                        errors.subcategory && {
                                            borderWidth: 2,
                                            borderColor: '#F56C3D',
                                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                        }
                                    ]}
                                >
                                    <Text
                                        style={[
                                            styles.subItemText,
                                            selectedSubcategory === sub && styles.subItemTextActive,
                                        ]}
                                    >
                                        {sub}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        {renderError(errors.subcategory)}
                    </>
                )}

                <TextInput
                    placeholder="Any notes, bunbun? 🐇"
                    value={note}
                    onChangeText={setNote}
                    style={styles.input}
                />

                <TouchableOpacity 
                    onPress={handleAddExpense} 
                    style={[
                        styles.button,
                        loading && {
                            opacity: 0.7,
                            backgroundColor: '#ccc'
                        }
                    ]}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>
                        {loading ? 'Saving...' : 'Save Bunnyspense 🐾'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </ImageBackground>
    );
}
