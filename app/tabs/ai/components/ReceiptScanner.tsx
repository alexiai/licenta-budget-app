
import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Alert,
    ActivityIndicator,
    ScrollView,
    ImageBackground,
    TextInput,
    Platform,
    Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { createWorker } from 'tesseract.js';
import { findCategoryByProduct } from '../../../../lib/productAssociation';
import { romanianToEnglish } from '../../../../lib/translationDictionary';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import bg from '@assets/bg/AIback.png';

interface ExtractedData {
    amount?: number;
    date?: string;
    category?: string;
    subcategory?: string;
    rawText: string;
    confidence: number;
}

interface ReceiptScannerProps {
    onBack: () => void;
}

export default function ReceiptScanner({ onBack }: ReceiptScannerProps): JSX.Element {
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [editableAmount, setEditableAmount] = useState('');
    const [editableDate, setEditableDate] = useState('');
    const [awaitingDateInput, setAwaitingDateInput] = useState(false);
    const [showImageOptions, setShowImageOptions] = useState(false);

    const workerRef = useRef<any>(null);

    const requestCameraPermission = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Camera permission is needed to scan receipts.');
            return false;
        }
        return true;
    };

    const requestLibraryPermission = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Required', 'Photo library permission is needed to upload receipts.');
            return false;
        }
        return true;
    };

    const takePhoto = async () => {
        const hasPermission = await requestCameraPermission();
        if (!hasPermission) return;

        const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
            processImage(result.assets[0].uri);
        }
    };

    const pickImage = async () => {
        const hasPermission = await requestLibraryPermission();
        if (!hasPermission) return;

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [3, 4],
            quality: 0.8,
        });

        if (!result.canceled && result.assets[0]) {
            setSelectedImage(result.assets[0].uri);
            processImage(result.assets[0].uri);
        }
    };

    const translateText = async (text: string): Promise<string> => {
        let translatedText = text.toLowerCase();
        const sortedEntries = Object.entries(romanianToEnglish)
            .sort(([a], [b]) => b.length - a.length);

        sortedEntries.forEach(([ro, en]) => {
            const regex = new RegExp(`\\b${ro}\\b`, 'gi');
            if (regex.test(translatedText)) {
                translatedText = translatedText.replace(regex, en);
            }
        });

        return translatedText;
    };

    const extractAmountFromText = (text: string): number | null => {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Skip lines that contain these keywords (they're not actual expenses)
        const skipKeywords = [
            'total', 'suma', 'tva', 'plata card', 'rest', 'bon fiscal',
            'subtotal', 'discount', 'reducere', 'casa', 'operator',
            'data', 'ora', 'nr bon', 'cod fiscal', 'reg com'
        ];

        let totalAmount = 0;
        let foundItems = false;

        for (const line of lines) {
            const lowerLine = line.toLowerCase();

            // Skip lines with excluded keywords
            if (skipKeywords.some(keyword => lowerLine.includes(keyword))) {
                continue;
            }

            // Romanian receipt format 1: "Paine alba     3x6.00     18.00"
            // Extract the rightmost number which is the total for that item
            const format1Match = line.match(/^(.+?)\s+\d+\s*x\s*\d+[.,]\d{2}\s+(\d+[.,]\d{2})$/);
            if (format1Match) {
                const itemTotal = parseFloat(format1Match[2].replace(',', '.'));
                if (!isNaN(itemTotal)) {
                    totalAmount += itemTotal;
                    foundItems = true;
                }
                continue;
            }

            // Romanian receipt format 2: Product name on separate line from quantity/price
            // "3 x 6.00" followed by "Paine alba       18.00"
            // Look for lines ending with a price
            const format2Match = line.match(/^(.+?)\s+(\d+[.,]\d{2})$/);
            if (format2Match && !lowerLine.match(/^\d+\s*x/)) {
                const itemTotal = parseFloat(format2Match[2].replace(',', '.'));
                if (!isNaN(itemTotal)) {
                    totalAmount += itemTotal;
                    foundItems = true;
                }
                continue;
            }

            // Simple format: just product and price
            const simplePriceMatch = line.match(/(\d+[.,]\d{2})$/);
            if (simplePriceMatch && !lowerLine.match(/^\d+\s*x/) && lowerLine.length > 10) {
                const itemTotal = parseFloat(simplePriceMatch[1].replace(',', '.'));
                if (!isNaN(itemTotal) && itemTotal > 0 && itemTotal < 10000) { // reasonable price range
                    totalAmount += itemTotal;
                    foundItems = true;
                }
            }
        }

        return foundItems ? totalAmount : null;
    };

    const extractDateFromText = (text: string): string | null => {
        // Look for date patterns
        const datePatterns = [
            /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/g,
            /(\d{2,4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/g,
        ];

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                const dateStr = match[0];
                const parts = dateStr.split(/[\/\-.]/);

                if (parts.length === 3) {
                    let day, month, year;

                    // Try different date formats
                    if (parts[2].length === 4) { // DD/MM/YYYY
                        day = parseInt(parts[0]);
                        month = parseInt(parts[1]) - 1;
                        year = parseInt(parts[2]);
                    } else if (parts[0].length === 4) { // YYYY/MM/DD
                        year = parseInt(parts[0]);
                        month = parseInt(parts[1]) - 1;
                        day = parseInt(parts[2]);
                    } else { // DD/MM/YY
                        day = parseInt(parts[0]);
                        month = parseInt(parts[1]) - 1;
                        year = parseInt(parts[2]) + (parseInt(parts[2]) < 50 ? 2000 : 1900);
                    }

                    const date = new Date(year, month, day);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString().split('T')[0];
                    }
                }
            }
        }

        return null;
    };

    const processImage = async (imageUri: string) => {
        setIsProcessing(true);
        setExtractedData(null);

        try {
            if (!workerRef.current) {
                workerRef.current = await createWorker();
                await workerRef.current.loadLanguage('eng+ron');
                await workerRef.current.initialize('eng+ron');
            }

            const { data: { text } } = await workerRef.current.recognize(imageUri);
            console.log('OCR Result:', text);

            // Translate Romanian text to English for better category detection
            const translatedText = await translateText(text);
            const combinedText = text + ' ' + translatedText;

            // Extract data from OCR text
            const amount = extractAmountFromText(combinedText);
            const date = extractDateFromText(text);

            // Detect category using existing logic
            const categoryMatch = findCategoryByProduct(combinedText.toLowerCase());

            const extracted: ExtractedData = {
                amount: amount || undefined,
                date: date || undefined,
                category: categoryMatch?.category,
                subcategory: categoryMatch?.subcategory,
                rawText: text,
                confidence: categoryMatch?.confidence || 0
            };

            setExtractedData(extracted);
            setEditableAmount(amount?.toString() || '');
            setEditableDate(date || '');

            if (!date) {
                setAwaitingDateInput(true);
            }

            setShowConfirmation(true);

        } catch (error) {
            console.error('OCR Error:', error);
            Alert.alert('OCR Error', 'Failed to process the image. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const saveExpense = async () => {
        if (!extractedData || !editableAmount) {
            Alert.alert('Missing Data', 'Please ensure amount is provided.');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Authentication Error', 'You must be logged in to save expenses.');
            return;
        }

        try {
            const finalDate = editableDate || new Date().toISOString().split('T')[0];
            const expenseDate = new Date(finalDate + 'T12:00:00.000Z');

            const expenseData = {
                userId: user.uid,
                amount: parseFloat(editableAmount),
                category: extractedData.category || 'Other',
                subcategory: extractedData.subcategory || 'Miscellaneous',
                note: `Receipt scan - ${extractedData.category || 'Other'}`,
                date: expenseDate.toISOString(),
                createdAt: new Date().toISOString(),
                currency: 'RON',
                source: 'receipt_scanner'
            };

            await addDoc(collection(db, 'expenses'), expenseData);

            Alert.alert(
                'Success!',
                `Expense of ${editableAmount} RON saved successfully!`,
                [{ text: 'OK', onPress: () => resetScanner() }]
            );

        } catch (error) {
            console.error('Error saving expense:', error);
            Alert.alert('Error', 'Failed to save expense. Please try again.');
        }
    };

    const resetScanner = () => {
        setSelectedImage(null);
        setExtractedData(null);
        setShowConfirmation(false);
        setEditableAmount('');
        setEditableDate('');
        setAwaitingDateInput(false);
    };

    const showImagePicker = () => {
        // For web, we'll show a custom modal instead of Alert.alert which doesn't work well
        if (Platform.OS === 'web') {
            setShowImageOptions(true);
        } else {
            Alert.alert(
                'Select Image',
                'Choose how you want to add a receipt image:',
                [
                    { text: 'Take Photo', onPress: takePhoto },
                    { text: 'Choose from Library', onPress: pickImage },
                    { text: 'Cancel', style: 'cancel' }
                ]
            );
        }
    };

    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Ionicons name="arrow-back" size={24} color="#91483C" />
                </TouchableOpacity>
                <Text style={styles.title}>Receipt Scanner</Text>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {!selectedImage ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyStateTitle}>🧾 Scan Your Receipt</Text>
                        <Text style={styles.emptyStateText}>
                            Take a photo of your receipt and the AI will extract the expenses.
                            {'\n\n'}
                            It's fairly simple — for example, if the receipt contains food items, it goes into Groceries;
                            if it's a cinema receipt, it's Entertainment, and so on. Usually, a receipt only fits one category,
                            so the detection logic doesn't have to be too complex.
                        </Text>

                        <TouchableOpacity style={styles.scanButton} onPress={showImagePicker}>
                            <Ionicons name="camera" size={24} color="white" />
                            <Text style={styles.scanButtonText}>Scan Receipt</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.resultContainer}>
                        <View style={styles.imageContainer}>
                            <Image source={{ uri: selectedImage }} style={styles.receiptImage} />
                        </View>

                        {isProcessing && (
                            <View style={styles.processingContainer}>
                                <ActivityIndicator size="large" color="#91483C" />
                                <Text style={styles.processingText}>Processing receipt...</Text>
                            </View>
                        )}

                        {showConfirmation && extractedData && (
                            <View style={styles.confirmationCard}>
                                <Text style={styles.confirmationTitle}>📊 Extracted Data</Text>

                                <View style={styles.dataRow}>
                                    <Text style={styles.dataLabel}>Amount (RON):</Text>
                                    <TextInput
                                        style={styles.dataInput}
                                        value={editableAmount}
                                        onChangeText={setEditableAmount}
                                        placeholder="Enter amount"
                                        keyboardType="numeric"
                                    />
                                </View>

                                <View style={styles.dataRow}>
                                    <Text style={styles.dataLabel}>Date:</Text>
                                    <TextInput
                                        style={styles.dataInput}
                                        value={editableDate}
                                        onChangeText={setEditableDate}
                                        placeholder="YYYY-MM-DD"
                                    />
                                </View>

                                <View style={styles.dataRow}>
                                    <Text style={styles.dataLabel}>Category:</Text>
                                    <Text style={styles.dataValue}>
                                        {extractedData.category || 'Not detected'}
                                    </Text>
                                </View>

                                <View style={styles.dataRow}>
                                    <Text style={styles.dataLabel}>Subcategory:</Text>
                                    <Text style={styles.dataValue}>
                                        {extractedData.subcategory || 'Not detected'}
                                    </Text>
                                </View>

                                {awaitingDateInput && !editableDate && (
                                    <Text style={styles.warningText}>
                                        ⚠️ Date not detected. Please enter the date manually.
                                    </Text>
                                )}

                                <View style={styles.buttonRow}>
                                    <TouchableOpacity style={styles.retryButton} onPress={resetScanner}>
                                        <Text style={styles.retryButtonText}>Try Again</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.saveButton,
                                            (!editableAmount || !editableDate) && styles.saveButtonDisabled
                                        ]}
                                        onPress={saveExpense}
                                        disabled={!editableAmount || !editableDate}
                                    >
                                        <Text style={styles.saveButtonText}>Save Expense</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                )}
            </ScrollView>

            {/* Image Options Modal for Web */}
            <Modal
                visible={showImageOptions}
                transparent={true}
                animationType="fade"
                onRequestClose={() => setShowImageOptions(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Select Image Source</Text>
                        <Text style={styles.modalSubtitle}>Choose how you want to add a receipt image:</Text>

                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => {
                                setShowImageOptions(false);
                                takePhoto();
                            }}
                        >
                            <Ionicons name="camera" size={24} color="#91483C" />
                            <Text style={styles.modalButtonText}>Take Photo</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalButton}
                            onPress={() => {
                                setShowImageOptions(false);
                                pickImage();
                            }}
                        >
                            <Ionicons name="image" size={24} color="#91483C" />
                            <Text style={styles.modalButtonText}>Choose from Library</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.modalCancelButton}
                            onPress={() => setShowImageOptions(false)}
                        >
                            <Text style={styles.modalCancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefaf6',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    backButton: {
        marginRight: 16,
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#FFF2D8',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    emptyStateTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 16,
        fontFamily: 'Fredoka',
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 16,
        color: '#8B6914',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        fontFamily: 'Fredoka',
    },
    scanButton: {
        backgroundColor: '#91483C',
        borderRadius: 25,
        paddingVertical: 16,
        paddingHorizontal: 32,
        flexDirection: 'row',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
    scanButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
        fontFamily: 'Fredoka',
    },
    resultContainer: {
        paddingVertical: 20,
    },
    imageContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    receiptImage: {
        width: 250,
        height: 300,
        borderRadius: 15,
        borderWidth: 2,
        borderColor: '#91483C',
    },
    processingContainer: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    processingText: {
        fontSize: 16,
        color: '#91483C',
        marginTop: 16,
        fontFamily: 'Fredoka',
    },
    confirmationCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 20,
        padding: 20,
        marginTop: 20,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    confirmationTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 20,
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
    dataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        paddingVertical: 8,
    },
    dataLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#666',
        width: 100,
        fontFamily: 'Fredoka',
    },
    dataValue: {
        fontSize: 16,
        color: '#333',
        flex: 1,
        fontFamily: 'Fredoka',
    },
    dataInput: {
        fontSize: 16,
        color: '#333',
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontFamily: 'Fredoka',
    },
    warningText: {
        fontSize: 14,
        color: '#FF6B47',
        textAlign: 'center',
        marginVertical: 10,
        fontFamily: 'Fredoka',
    },
    buttonRow: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    retryButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 15,
        paddingVertical: 12,
        alignItems: 'center',
    },
    retryButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
        fontFamily: 'Fredoka',
    },
    saveButton: {
        flex: 1,
        backgroundColor: '#91483C',
        borderRadius: 15,
        paddingVertical: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#ccc',
    },
    saveButtonText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
        fontFamily: 'Fredoka',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
        fontFamily: 'Fredoka',
    },
    modalSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: 'Fredoka',
    },
    modalButton: {
        backgroundColor: '#FFF2D8',
        borderRadius: 15,
        padding: 16,
        marginBottom: 12,
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalButtonText: {
        fontSize: 16,
        color: '#91483C',
        fontWeight: '600',
        marginLeft: 12,
        fontFamily: 'Fredoka',
    },
    modalCancelButton: {
        padding: 16,
        width: '100%',
        alignItems: 'center',
    },
    modalCancelText: {
        fontSize: 16,
        color: '#999',
        fontFamily: 'Fredoka',
    },
});
