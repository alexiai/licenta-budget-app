import React, { useCallback } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, ImageBackground } from 'react-native';
import { useRouter } from 'expo-router';
import ReceiptScanner from '../../../../components/bunnyAssistant/ReceiptScanner';
import { useOCR } from '../../../../components/bunnyAssistant/context/OCRContext';
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
    const { setOCRData } = useOCR();
    const returnToChat = useCallback(() => {
        router.dismissTo('/tabs/ai/chatbox');
    }, [router]);

    const handleReceiptData = useCallback((data: ParsedExpense) => {
        setOCRData(data);
        returnToChat();
    }, [setOCRData, returnToChat]);

    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <View style={styles.content}>
                <Text style={styles.title}>Scan Receipt</Text>
                <Text style={styles.notice}>The receipt image is sent to Asprise for text recognition.</Text>
                <ReceiptScanner onReceiptData={handleReceiptData} />
                <TouchableOpacity 
                    style={styles.cancelButton}
                    onPress={returnToChat}
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
    notice: { marginBottom: 16, textAlign: 'center', color: '#91483C' },
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