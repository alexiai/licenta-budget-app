import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
    Platform,
    Text
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import axios from 'axios';
import { parseReceiptExpense } from '@lib/utils/receiptExpense';
import * as ImagePicker from 'expo-image-picker';

// Define API URL based on platform
const API_URL = process.env.EXPO_PUBLIC_API_URL || (Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000');

interface ParsedExpense {
    amount: number;
    category: string;
    subcategory: string;
    date: string;
    note: string;
    confidence: number;
}

interface ReceiptScannerProps {
    onReceiptData: (data: ParsedExpense) => void;
}

export default function ReceiptScanner({ onReceiptData }: ReceiptScannerProps): JSX.Element {
    const [isLoading, setIsLoading] = useState(false);
    const isMounted = useRef(true);

    const [error, setError] = useState('');
    React.useEffect(() => {
        isMounted.current = true;
        return () => { isMounted.current = false; };
    }, []);

    const handleUpload = useCallback(async (camera = false) => {
        if (isLoading) return;
        setIsLoading(true);
        setError('');
        try {
            if (camera) {
                const permission = await ImagePicker.requestCameraPermissionsAsync();
                if (!permission.granted) throw new Error('Allow camera access to take a receipt photo.');
            }
            const result = camera
                ? await ImagePicker.launchCameraAsync({ quality: 0.75 })
                : await DocumentPicker.getDocumentAsync({
                    type: ['image/jpeg', 'image/png'], copyToCacheDirectory: true,
                });
            if (result.canceled || !result.assets[0] || !isMounted.current) return;
            const file = result.assets[0];
            const name = ('name' in file ? file.name : file.fileName) || 'receipt.jpg';
            const form = new FormData();
            if (Platform.OS === 'web') {
                const response = await fetch(file.uri);
                form.append('file', await response.blob(), name);
            } else {
                form.append('file', { uri: file.uri, type: file.mimeType || 'image/jpeg', name } as unknown as Blob);
            }
            const response = await axios.post(`${API_URL}/api/ocr`, form, { timeout: 35000 });
            const receipt = response.data?.receipts?.[0];
            if (!receipt) throw new Error('Could not read the receipt. Try a clearer photo or enter it manually.');
            const data = parseReceiptExpense(receipt);
            if (isMounted.current) onReceiptData({ ...data, note: data.note ?? 'OCR receipt scan' });
        } catch (cause) {
            if (isMounted.current) {
                setError(axios.isAxiosError(cause)
                    ? 'Could not reach the receipt service. Try again or enter the expense manually.'
                    : cause instanceof Error ? cause.message : 'Could not process the receipt.');
            }
        } finally {
            if (isMounted.current) setIsLoading(false);
        }
    }, [isLoading, onReceiptData]);

    return (
        <View>
        <TouchableOpacity
            style={styles.uploadButton}
            onPress={() => void handleUpload()}
            disabled={isLoading}
        >
            {isLoading ? (
                <ActivityIndicator color="#91483C" />
            ) : (
                <>
                    <Ionicons name="receipt-outline" size={24} color="#91483C" />
                    <Text style={styles.buttonText}>Upload Receipt</Text>
                </>
            )}
        </TouchableOpacity>
        {Platform.OS !== 'web' && (
            <TouchableOpacity style={styles.uploadButton} disabled={isLoading} onPress={() => void handleUpload(true)}>
                <Ionicons name="camera-outline" size={24} color="#91483C" />
                <Text style={styles.buttonText}>Take Photo</Text>
            </TouchableOpacity>
        )}
        {error ? <Text accessibilityRole="alert">{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    uploadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff0e8',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#91483C',
    },
    buttonText: {
        color: '#91483C',
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 4,
    }
}); 