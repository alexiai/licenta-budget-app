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
import { findCategoryByProduct } from '../../../../lib/productAssociation';

// Define API URL based on platform
const API_URL = Platform.OS === 'web' ? 'http://localhost:5000' : 'http://10.0.2.2:5000';

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

type SupportedCurrency = 'ron' | 'eur' | 'usd' | 'gbp';

const CURRENCY_RATES: Record<SupportedCurrency, number> = {
    ron: 1,
    eur: 4.97,
    usd: 4.56,
    gbp: 5.82
};

export default function ReceiptScanner({ onReceiptData }: ReceiptScannerProps): JSX.Element {
    const [isLoading, setIsLoading] = useState(false);
    const isMounted = useRef(true);

    // Cleanup on unmount
    React.useEffect(() => {
        return () => {
            isMounted.current = false;
        };
    }, []);

    const handleUpload = useCallback(async () => {
        if (isLoading) return;

        try {
            setIsLoading(true);

            const result = await DocumentPicker.getDocumentAsync({
                type: ['image/jpeg', 'image/png'],
                copyToCacheDirectory: true,
            });

            // Check if component is still mounted
            if (!isMounted.current) return;

            if (!result.canceled && result.assets && result.assets.length > 0) {
                const file = result.assets[0];
                const formData = new FormData();
                
                try {
                    if (Platform.OS === 'web') {
                        const response = await fetch(file.uri);
                        const blob = await response.blob();
                        formData.append('file', blob, file.name);
                    } else {
                        formData.append('file', {
                            uri: file.uri.replace('file://', ''),
                            type: file.mimeType || 'image/jpeg',
                            name: file.name || 'receipt.jpg',
                        } as any);
                    }

                    const response = await axios.post(
                        `${API_URL}/api/ocr`,
                        formData,
                        {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                            },
                            timeout: 30000,
                        }
                    );

                    // Check if component is still mounted
                    if (!isMounted.current) return;

                    if (response.data && response.data.receipts && response.data.receipts.length > 0) {
                        const receipt = response.data.receipts[0];
                        
                        const amount = parseFloat(receipt.total) || 0;
                        const date = receipt.date ? new Date(receipt.date) : new Date();
                        
                        let category = 'Other';
                        let subcategory = 'Miscellaneous';
                        
                        if (receipt.merchant_name) {
                            const merchantMatch = findCategoryByProduct(receipt.merchant_name);
                            if (merchantMatch) {
                                category = merchantMatch.category;
                                subcategory = merchantMatch.subcategory;
                            }
                        }
                        
                        if (category === 'Other' && receipt.items && receipt.items.length > 0) {
                            for (const item of receipt.items) {
                                const itemMatch = findCategoryByProduct(item.description);
                                if (itemMatch) {
                                    category = itemMatch.category;
                                    subcategory = itemMatch.subcategory;
                                    break;
                                }
                            }
                        }

                        let amountInRON = amount;
                        if (receipt.currency) {
                            const currency = receipt.currency.toLowerCase() as SupportedCurrency;
                            const rate = CURRENCY_RATES[currency] || CURRENCY_RATES.ron;
                            amountInRON = amount * rate;
                        }

                        const parsedData: ParsedExpense = {
                            amount: amountInRON,
                            category,
                            subcategory,
                            date: date.toISOString().split('T')[0],
                            note: `Receipt scan: ${receipt.merchant_name || 'Unknown merchant'} - ${category}`,
                            confidence: 100
                        };

                        if (isMounted.current) {
                            setIsLoading(false);
                            onReceiptData(parsedData);
                        }
                    } else {
                        throw new Error('Could not extract receipt data');
                    }
                } catch (error) {
                    if (isMounted.current) {
                        console.error('OCR processing error:', error);
                        Alert.alert(
                            'OCR Error',
                            'Failed to process the receipt. Please try again or enter details manually.'
                        );
                        setIsLoading(false);
                    }
                }
            }
        } catch (err) {
            if (isMounted.current) {
                console.error('File selection error:', err);
                Alert.alert(
                    'Error',
                    'Failed to select the file. Please try again.'
                );
                setIsLoading(false);
            }
        }
    }, [isLoading, onReceiptData]);

    return (
        <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUpload}
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