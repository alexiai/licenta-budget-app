import React from 'react';
import { TextInput, TextInputProps } from 'react-native';
import styles from '@styles/addExpense';

interface DateInputProps extends Omit<TextInputProps, 'onChangeText'> {
    value: string;
    onChange: (value: string) => void;
}

export default function DateInput({ value, onChange, ...props }: DateInputProps) {
    const formatDate = (text: string) => {
        // Remove any non-digit characters
        const cleaned = text.replace(/\D/g, '');
        
        // Format as dd/mm/yyyy
        let formatted = cleaned;
        if (cleaned.length > 4) {
            formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4) + '/' + cleaned.slice(4, 8);
        } else if (cleaned.length > 2) {
            formatted = cleaned.slice(0, 2) + '/' + cleaned.slice(2);
        }
        
        return formatted;
    };

    const handleChange = (text: string) => {
        const formatted = formatDate(text);
        onChange(formatted);
    };

    return (
        <TextInput
            {...props}
            style={styles.input}
            value={value}
            onChangeText={handleChange}
            placeholder="dd/mm/yyyy"
            placeholderTextColor="#999"
            keyboardType="numeric"
            maxLength={10}
        />
    );
} 