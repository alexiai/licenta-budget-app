import { View, Text, TextInput, TouchableOpacity, ImageBackground, KeyboardAvoidingView, Platform } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useState } from 'react';
import styles from '@styles/basicInfoStep';
import bg from '@assets/bg/basicinfobackground.png';


export default function BasicInfoStep({ onNext, data, updateData }) {
    const [name, setName] = useState(data.name || '');
    const [periodOpen, setPeriodOpen] = useState(false);
    const [period, setPeriod] = useState(data.period || 'monthly');
    const [startDayOpen, setStartDayOpen] = useState(false);
    const [startDay, setStartDay] = useState(data.startDay || '1');

    const periodOptions = [
        { label: 'Monthly 📅', value: 'monthly' },
        { label: 'Weekly 🗓️', value: 'weekly' },
        { label: 'Biweekly 🔁', value: 'biweekly' },
    ];

    const dayOptions = Array.from({ length: 31 }, (_, i) => ({
        label: `${i + 1}`,
        value: `${i + 1}`,
    }));

    const handleContinue = () => {
        updateData({ name, period, startDay });
        onNext();
    };

    return (
        <ImageBackground
            source={bg}
            resizeMode="cover"
            style={{
                flex: 1,
                width: '110%',     // Lărgește imaginea pe lățime
                transform: [{ translateX: -20 }, { translateY: -40 }], // deplasează în stânga și puțin în sus
            }}
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

                    <TouchableOpacity onPress={handleContinue} style={styles.button}>
                        <Text style={styles.buttonText}>Next</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </ImageBackground>

    );



}
