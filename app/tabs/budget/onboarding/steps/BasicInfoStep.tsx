import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { useState } from 'react';
import styles from './styles';

export default function BasicInfoStep({ onNext, data, updateData }) {
    const [name, setName] = useState(data.name || '');
    const [periodOpen, setPeriodOpen] = useState(false);
    const [period, setPeriod] = useState(data.period || 'monthly');

    const [startDayOpen, setStartDayOpen] = useState(false);
    const [startDay, setStartDay] = useState(data.startDay || '1');

    const periodOptions = [
        { label: 'Monthly', value: 'monthly' },
        { label: 'Weekly', value: 'weekly' },
        { label: 'Biweekly', value: 'biweekly' },
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
        <View style={styles.container}>
            <Text style={styles.title}>Start with the basics</Text>
            <Text style={styles.subtitle}>
                We recommend using the same budget period as your regular income.
            </Text>

            <Text style={styles.label}>NAME</Text>
            <TextInput
                style={styles.input}
                placeholder="My Household"
                placeholderTextColor="#999"
                value={name}
                onChangeText={setName}
            />

            <Text style={styles.label}>BUDGET PERIOD</Text>
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

            <Text style={styles.label}>
                {period === 'weekly' ? 'WEEKLY START DAY' : 'MONTHLY START DAY'}
            </Text>
            <DropDownPicker
                open={startDayOpen}
                value={startDay}
                items={period === 'weekly'
                    ? [
                        { label: 'Monday', value: 'monday' },
                        { label: 'Tuesday', value: 'tuesday' },
                        { label: 'Wednesday', value: 'wednesday' },
                        { label: 'Thursday', value: 'thursday' },
                        { label: 'Friday', value: 'friday' },
                        { label: 'Saturday', value: 'saturday' },
                        { label: 'Sunday', value: 'sunday' },
                    ]
                    : dayOptions}
                setOpen={setStartDayOpen}
                setValue={setStartDay}
                placeholder="Select start day"
                style={styles.dropdown}
                dropDownContainerStyle={styles.dropdownContainer}
            />

            <TouchableOpacity onPress={handleContinue} style={styles.button}>
                <Text style={styles.buttonText}>Continue</Text>
            </TouchableOpacity>
        </View>
    );
}
