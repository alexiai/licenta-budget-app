import { View, Text, TextInput, TouchableOpacity, ScrollView, Image } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useState } from 'react';
import styles from '@styles/basicInfoStep';
import bg from '@assets/bg/start-card.png';

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
        <ScrollView style={styles.wrapper} contentContainerStyle={styles.container}>
            <Image source={bg} style={styles.bgImage} resizeMode="contain" />
            <Text style={styles.title}>🧩 Let's build your budget base</Text>
            <Text style={styles.subtitle}>Pick how you’d like to organize your plan.</Text>

            <Text style={styles.label}>Budget Name</Text>
            <TextInput
                style={styles.input}
                placeholder="Ex: My Summer Budget"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
            />

            <Text style={styles.label}>Period</Text>
            <View style={{ zIndex: periodOpen ? 2000 : 0 }}>
                <DropDownPicker
                    open={periodOpen}
                    value={period}
                    items={periodOptions}
                    setOpen={setPeriodOpen}
                    setValue={setPeriod}
                    placeholder="Select period"
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                />
            </View>

            <Text style={styles.label}>{period === 'weekly' ? 'Week starts on' : 'Month starts on'}</Text>
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
                <Text style={styles.buttonText}>🚀 Let’s Go</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}