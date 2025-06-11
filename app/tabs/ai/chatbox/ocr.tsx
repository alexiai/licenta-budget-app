import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import ReceiptScanner from '../components/ReceiptScanner';
import { OCRDataProvider } from '../context/OCRContext';
import bg from '@assets/bg/AIback.png';

interface ParsedExpense {
    amount: number;
    category: string;
    subcategory: string;
    date: string;
    note: string;
    confidence: number;
}

export default function OCRUploadScreen() {
    const router = useRouter();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleReceiptData = useCallback((data: ParsedExpense) => {
        // Store data in context and navigate back
        OCRDataProvider.setData(data);
        router.replace('/tabs/ai/chatbox');
    }, [router]);

    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <View style={styles.content}>
                <Text style={styles.title}>Scan Receipt</Text>
                <ReceiptScanner onReceiptData={handleReceiptData} />
                <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={() => router.replace('/tabs/ai/chatbox')}
                    disabled={isProcessing}
                >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 32,
        fontFamily: 'Fredoka',
    },
    cancelButton: {
        marginTop: 16,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#fff0e8',
        borderWidth: 1,
        borderColor: '#91483C',
    },
    cancelButtonText: {
        color: '#91483C',
        fontSize: 16,
        fontFamily: 'Fredoka',
    },
}); 