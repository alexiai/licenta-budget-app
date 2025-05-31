
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
import { receiptLearningSystem, OCRWord } from '../../../../lib/receiptLearning';
import { receiptFeedbackSystem, ReceiptImprovementSuggestion } from '../../../../lib/receiptFeedback';
import { receiptStorageSystem } from '../../../../lib/receiptStorage';
import { DeveloperAnnotationModal } from '../../../../lib/developerAnnotations';
import { receiptMatchingSystem, MatchResult } from '../../../../lib/receiptMatching';
import bg from '@assets/bg/AIback.png';

interface ExtractedData {
    amount?: number;
    date?: string;
    category?: string;
    subcategory?: string;
    rawText: string;
    confidence: number;
    merchantName?: string;
    layout?: any;
    words?: OCRWord[];
    imageWidth?: number;
    imageHeight?: number;
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
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedbackSuggestions, setFeedbackSuggestions] = useState<ReceiptImprovementSuggestion[]>([]);
    const [ocrWords, setOcrWords] = useState<OCRWord[]>([]);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [learningTips, setLearningTips] = useState<string[]>([]);
    const [showDeveloperAnnotations, setShowDeveloperAnnotations] = useState(false);
    const [savedReceiptId, setSavedReceiptId] = useState<string | null>(null);
    const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
    const [showDeveloperSuggestion, setShowDeveloperSuggestion] = useState(false);
    const [developerSuggestionData, setDeveloperSuggestionData] = useState<any>(null);

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
        setLearningTips(receiptFeedbackSystem.generateImprovementTips());

        try {
            console.log('🚀 Starting intelligent OCR processing...');

            if (!workerRef.current) {
                console.log('🤖 Initializing enhanced Tesseract worker...');
                workerRef.current = await createWorker(['eng', 'ron']);

                // Enhanced parameters for receipt scanning
                await workerRef.current.setParameters({
                    tessedit_pageseg_mode: '6',
                    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzĂÂÎȘȚăâîșț.,:-+/\\ ()€$',
                    preserve_interword_spaces: '1'
                });
            }

            // Get detailed OCR results including word positions
            const { data } = await workerRef.current.recognize(imageUri);
            const ocrText = data.text;
            const confidence = data.confidence;

            // Extract words with spatial information
            const words: OCRWord[] = data.words
                .filter((word: any) => word.text.trim().length > 0)
                .map((word: any) => ({
                    text: word.text,
                    confidence: word.confidence,
                    bbox: word.bbox
                }));

            setOcrWords(words);

            // Get image dimensions (simplified - in real implementation you'd get actual dimensions)
            const imageWidth = 1000;
            const imageHeight = 1200;
            setImageSize({ width: imageWidth, height: imageHeight });

            console.log(`📝 OCR Results: "${ocrText}" (confidence: ${confidence}%)`);
            console.log(`📊 Extracted ${words.length} words with spatial data`);

            // Use intelligent extraction system
            const intelligentResults = receiptLearningSystem.extractReceiptData(
                words,
                imageWidth,
                imageHeight,
                ocrText
            );

            // Check for similar receipts and apply learned patterns
            const user = auth.currentUser;
            let enhancedResults = intelligentResults;
            let currentMatchResult: MatchResult | null = null;

            if (user) {
                console.log('🔍 Checking for similar receipt patterns...');
                currentMatchResult = await receiptMatchingSystem.findSimilarReceipts(
                    ocrText,
                    {
                        ...intelligentResults,
                        rawText: ocrText,
                        confidence: confidence
                    },
                    user.uid
                );

                setMatchResult(currentMatchResult);

                if (currentMatchResult.isMatch) {
                    console.log(`🎯 Found matching pattern with ${currentMatchResult.confidence}% confidence`);
                    enhancedResults = receiptMatchingSystem.applyLearnedRules(
                        intelligentResults,
                        currentMatchResult
                    );
                }

                // Check for developer suggestions (dev mode only)
                if (__DEV__) {
                    const devSuggestions = await receiptMatchingSystem.getDeveloperSuggestions(
                        currentMatchResult,
                        user.uid
                    );

                    if (devSuggestions.showSuggestion) {
                        setDeveloperSuggestionData(devSuggestions.suggestionData);
                        console.log('💡 Developer suggestion available for layout matching');
                    }
                }
            }

            // Translate Romanian text to English for better category detection
            const translatedText = await translateText(ocrText);
            const combinedText = ocrText + ' ' + translatedText;

            // Detect category using existing logic
            const categoryMatch = findCategoryByProduct(combinedText.toLowerCase());

            const extracted: ExtractedData = {
                amount: enhancedResults.amount || undefined,
                date: enhancedResults.date || undefined,
                category: categoryMatch?.category,
                subcategory: categoryMatch?.subcategory,
                rawText: ocrText,
                confidence: enhancedResults.confidence,
                merchantName: enhancedResults.merchant?.name,
                layout: enhancedResults.layout,
                words: words,
                imageWidth: imageWidth,
                imageHeight: imageHeight
            };

            setExtractedData(extracted);
            setEditableAmount(enhancedResults.amount?.toString() || '');
            setEditableDate(enhancedResults.date || '');

            // Show matching info in console for debugging
            if (currentMatchResult?.isMatch) {
                console.log('🤖 Applied learned extraction rules:', currentMatchResult.suggestedExtraction);
            }

            // If confidence is low, prepare feedback form
            if (intelligentResults.confidence < 70) {
                const suggestions = receiptFeedbackSystem.generateFeedbackQuestions(ocrText, extracted);
                setFeedbackSuggestions(suggestions);
            }

            if (!intelligentResults.date) {
                setAwaitingDateInput(true);
            }

            setShowConfirmation(true);

        } catch (error) {
            console.error('🚨 Enhanced OCR Error:', error);
            Alert.alert('OCR Error', 'Failed to process the image. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const saveExpense = async () => {
        if (!extractedData || !editableAmount || !selectedImage) {
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

            // Prepare user corrections
            const userCorrections = {
                amount: parseFloat(editableAmount) !== extractedData.amount ? parseFloat(editableAmount) : undefined,
                date: editableDate !== extractedData.date ? editableDate : undefined
            };

            // Create metadata for receipt storage
            const metadata = receiptStorageSystem.createMetadataFromOCR(
                extractedData.rawText,
                {
                    ...extractedData,
                    amount: parseFloat(editableAmount),
                    date: finalDate
                },
                Object.keys(userCorrections).some(key => userCorrections[key as keyof typeof userCorrections] !== undefined) ? userCorrections : null
            );

            // Save receipt with structured metadata
            const savedReceipt = await receiptStorageSystem.saveReceiptWithMetadata(
                selectedImage,
                metadata
            );

            setSavedReceiptId(savedReceipt.firestoreId);

            console.log('📦 Receipt saved with metadata:', {
                id: savedReceipt.id,
                type: metadata.receiptType,
                quality: metadata.receiptQuality,
                wasCorrected: metadata.wasCorrected
            });

            // Save expense to existing collection
            const expenseData = {
                userId: user.uid,
                amount: parseFloat(editableAmount),
                category: extractedData.category || 'Other',
                subcategory: extractedData.subcategory || 'Miscellaneous',
                note: `Receipt scan - ${extractedData.merchantName || extractedData.category || 'Other'}`,
                date: expenseDate.toISOString(),
                createdAt: new Date().toISOString(),
                currency: 'RON',
                source: 'receipt_scanner',
                receiptId: savedReceipt.id // Link to receipt metadata
            };

            await addDoc(collection(db, 'expenses'), expenseData);

            // Save successful pattern for learning (existing logic)
            if (extractedData.words) {
                receiptLearningSystem.saveSuccessfulPattern(
                    extractedData.rawText,
                    selectedImage,
                    extractedData.words,
                    extractedData.imageWidth || 1000,
                    extractedData.imageHeight || 1200,
                    {
                        amount: extractedData.amount,
                        date: extractedData.date,
                        category: extractedData.category,
                        subcategory: extractedData.subcategory
                    },
                    Object.keys(userCorrections).some(key => userCorrections[key as keyof typeof userCorrections] !== undefined) ? userCorrections : undefined
                );
            }

            // Show success message with developer options
            const hasCorrections = Object.keys(userCorrections).some(key => userCorrections[key as keyof typeof userCorrections] !== undefined);
            const showDevOptions = __DEV__ && (hasCorrections || extractedData.confidence < 80);
            const hasDeveloperSuggestion = __DEV__ && developerSuggestionData;

            const alertButtons = [{ text: 'OK', onPress: () => resetScanner() }];

            if (hasDeveloperSuggestion) {
                alertButtons.push({
                    text: 'Use Similar Layout',
                    onPress: () => setShowDeveloperSuggestion(true)
                });
            }

            if (showDevOptions) {
                alertButtons.push({
                    text: 'Add Annotations',
                    onPress: () => setShowDeveloperAnnotations(true)
                });
            }

            Alert.alert(
                'Success!',
                `Expense of ${editableAmount} RON saved successfully!${
                    hasDeveloperSuggestion ? '\n\nSimilar layout detected!' : ''
                }${showDevOptions ? '\n\nDeveloper: Add annotations?' : ''}`,
                alertButtons
            );

            // If there were low confidence or user corrections, potentially ask for feedback
            if (hasCorrections || extractedData.confidence < 70) {
                setTimeout(() => {
                    if (feedbackSuggestions.length > 0 && !showDevOptions) {
                        setShowFeedbackForm(true);
                    }
                }, 1000);
            }

        } catch (error) {
            console.error('Error saving expense:', error);
            Alert.alert('Error', 'Failed to save expense. Please try again.');
        }
    };

    const handleSubmitFeedback = async () => {
        if (!extractedData || !selectedImage) return;

        const user = auth.currentUser;
        if (!user) return;

        try {
            // Collect feedback data (simplified - in real implementation you'd collect form data)
            const userFeedback = {
                whatWentWrong: 'OCR extraction had low confidence',
                whereWasAmount: 'Unknown',
                whereWasDate: 'Unknown',
                merchantName: extractedData.merchantName || 'Unknown',
                receiptType: extractedData.category || 'Unknown',
                additionalTips: 'User provided feedback through form'
            };

            const userCorrections = {
                amount: parseFloat(editableAmount) !== extractedData.amount ? parseFloat(editableAmount) : undefined,
                date: editableDate !== extractedData.date ? editableDate : undefined
            };

            await receiptFeedbackSystem.saveFeedback(
                selectedImage,
                extractedData.rawText,
                extractedData,
                userCorrections,
                userFeedback,
                user.uid
            );

            setShowFeedbackForm(false);
            Alert.alert('Thank you!', 'Your feedback will help improve future receipt scanning.');
        } catch (error) {
            console.error('Error submitting feedback:', error);
            Alert.alert('Error', 'Failed to submit feedback.');
        }
    };

    const resetScanner = () => {
        setSelectedImage(null);
        setExtractedData(null);
        setShowConfirmation(false);
        setEditableAmount('');
        setEditableDate('');
        setAwaitingDateInput(false);
        setShowFeedbackForm(false);
        setFeedbackSuggestions([]);
        setOcrWords([]);
        setLearningTips([]);
        setMatchResult(null);
        setShowDeveloperSuggestion(false);
        setDeveloperSuggestionData(null);
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

                                {matchResult?.isMatch && (
                                    <View style={styles.matchContainer}>
                                        <Text style={styles.matchTitle}>🎯 Pattern Match Found</Text>
                                        <Text style={styles.matchText}>
                                            Similar to {matchResult.bestMatch?.metadata.receiptType} layout ({matchResult.confidence}% match)
                                        </Text>
                                        <Text style={styles.matchSubtext}>
                                            Applied learned extraction rules automatically
                                        </Text>
                                    </View>
                                )}

                                {learningTips.length > 0 && (
                                    <View style={styles.tipsContainer}>
                                        <Text style={styles.tipsTitle}>💡 Learning Tips</Text>
                                        {learningTips.slice(0, 2).map((tip, index) => (
                                            <Text key={index} style={styles.tipText}>{tip}</Text>
                                        ))}
                                    </View>
                                )}

                                {extractedData.confidence < 70 && feedbackSuggestions.length > 0 && (
                                    <TouchableOpacity
                                        style={styles.feedbackButton}
                                        onPress={() => setShowFeedbackForm(true)}
                                    >
                                        <Ionicons name="school" size={16} color="#91483C" />
                                        <Text style={styles.feedbackButtonText}>
                                            Help me learn from this receipt
                                        </Text>
                                    </TouchableOpacity>
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

            {/* Learning Feedback Modal */}
            <Modal
                visible={showFeedbackForm}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowFeedbackForm(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.feedbackModal}>
                        <ScrollView showsVerticalScrollIndicator={false}>
                            <Text style={styles.feedbackTitle}>🤔 Help me learn from this receipt</Text>
                            <Text style={styles.feedbackSubtitle}>
                                Your feedback will help me recognize similar receipts better in the future.
                            </Text>

                            {feedbackSuggestions.map((suggestion, index) => (
                                <View key={index} style={styles.suggestionSection}>
                                    <Text style={styles.suggestionMessage}>{suggestion.message}</Text>

                                    {suggestion.questions.map((question, qIndex) => (
                                        <View key={qIndex} style={styles.questionContainer}>
                                            <Text style={styles.questionText}>{question}</Text>
                                            <TextInput
                                                style={styles.feedbackInput}
                                                placeholder="Your answer..."
                                                multiline={true}
                                                numberOfLines={2}
                                            />
                                        </View>
                                    ))}
                                </View>
                            ))}

                            <View style={styles.feedbackButtonRow}>
                                <TouchableOpacity
                                    style={styles.feedbackCancelButton}
                                    onPress={() => setShowFeedbackForm(false)}
                                >
                                    <Text style={styles.feedbackCancelText}>Skip</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.feedbackSubmitButton}
                                    onPress={handleSubmitFeedback}
                                >
                                    <Text style={styles.feedbackSubmitText}>Submit Feedback</Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Developer Suggestion Modal */}
            <Modal
                visible={showDeveloperSuggestion && __DEV__}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowDeveloperSuggestion(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.suggestionModal}>
                        <Text style={styles.suggestionTitle}>🎯 Similar Layout Detected</Text>
                        {developerSuggestionData && (
                            <>
                                <Text style={styles.suggestionSubtitle}>
                                    This receipt is {developerSuggestionData.confidence}% similar to a previous {developerSuggestionData.similarReceipt.receiptType} layout.
                                </Text>

                                <View style={styles.layoutPreview}>
                                    <Text style={styles.previewTitle}>Suggested Template:</Text>
                                    <Text style={styles.previewText}>• Type: {developerSuggestionData.similarReceipt.receiptType}</Text>
                                    <Text style={styles.previewText}>• Date: {developerSuggestionData.similarReceipt.dateLocation}</Text>
                                    <Text style={styles.previewText}>• Amount: {developerSuggestionData.similarReceipt.amountLocation}</Text>
                                    <Text style={styles.previewText}>• Quality: {developerSuggestionData.similarReceipt.receiptQuality}</Text>
                                </View>

                                <View style={styles.suggestionButtonRow}>
                                    <TouchableOpacity
                                        style={styles.suggestionRejectButton}
                                        onPress={() => {
                                            setShowDeveloperSuggestion(false);
                                            setShowDeveloperAnnotations(true);
                                        }}
                                    >
                                        <Text style={styles.suggestionRejectText}>Manual Annotation</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.suggestionAcceptButton}
                                        onPress={() => {
                                            // Auto-apply the suggested layout
                                            setShowDeveloperSuggestion(false);
                                            resetScanner();
                                        }}
                                    >
                                        <Text style={styles.suggestionAcceptText}>Apply Template</Text>
                                    </TouchableOpacity>
                                </View>
                            </>
                        )}
                    </View>
                </View>
            </Modal>

            {/* Developer Annotation Modal */}
            {__DEV__ && extractedData && savedReceiptId && (
                <DeveloperAnnotationModal
                    visible={showDeveloperAnnotations}
                    onClose={() => {
                        setShowDeveloperAnnotations(false);
                        resetScanner();
                    }}
                    receiptId={savedReceiptId}
                    currentMetadata={receiptStorageSystem.createMetadataFromOCR(
                        extractedData.rawText,
                        extractedData,
                        {
                            amount: parseFloat(editableAmount) !== extractedData.amount ? parseFloat(editableAmount) : undefined,
                            date: editableDate !== extractedData.date ? editableDate : undefined
                        }
                    )}
                    onSave={(annotations) => {
                        console.log('📝 Developer annotations saved:', annotations);
                    }}
                />
            )}
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
    tipsContainer: {
        backgroundColor: '#E8F5E8',
        borderRadius: 12,
        padding: 16,
        marginVertical: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    tipsTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2E7D32',
        marginBottom: 8,
        fontFamily: 'Fredoka',
    },
    tipText: {
        fontSize: 14,
        color: '#388E3C',
        marginBottom: 4,
        fontFamily: 'Fredoka',
    },
    feedbackButton: {
        backgroundColor: '#FFF2D8',
        borderRadius: 12,
        padding: 12,
        marginVertical: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#91483C',
    },
    feedbackButtonText: {
        fontSize: 14,
        color: '#91483C',
        marginLeft: 8,
        fontFamily: 'Fredoka',
    },
    feedbackModal: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        margin: 20,
        maxHeight: '80%',
    },
    feedbackTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
    feedbackSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
        fontFamily: 'Fredoka',
    },
    suggestionSection: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    suggestionMessage: {
        fontSize: 16,
        color: '#333',
        marginBottom: 12,
        fontWeight: '600',
        fontFamily: 'Fredoka',
    },
    questionContainer: {
        marginBottom: 12,
    },
    questionText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 6,
        fontFamily: 'Fredoka',
    },
    feedbackInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
        minHeight: 40,
        fontFamily: 'Fredoka',
    },
    feedbackButtonRow: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
    },
    feedbackCancelButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 15,
        paddingVertical: 12,
        alignItems: 'center',
    },
    feedbackCancelText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
        fontFamily: 'Fredoka',
    },
    feedbackSubmitButton: {
        flex: 2,
        backgroundColor: '#91483C',
        borderRadius: 15,
        paddingVertical: 12,
        alignItems: 'center',
    },
    feedbackSubmitText: {
        fontSize: 16,
        color: 'white',
        fontWeight: '600',
        fontFamily: 'Fredoka',
    },
    matchContainer: {
        backgroundColor: '#E3F2FD',
        borderRadius: 12,
        padding: 16,
        marginVertical: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    matchTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1976D2',
        marginBottom: 8,
        fontFamily: 'Fredoka',
    },
    matchText: {
        fontSize: 14,
        color: '#1565C0',
        marginBottom: 4,
        fontFamily: 'Fredoka',
    },
    matchSubtext: {
        fontSize: 12,
        color: '#42A5F5',
        fontStyle: 'italic',
        fontFamily: 'Fredoka',
    },
    suggestionModal: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        margin: 20,
        maxHeight: '70%',
    },
    suggestionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
    suggestionSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
        fontFamily: 'Fredoka',
    },
    layoutPreview: {
        backgroundColor: '#f8f8f8',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    previewTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
        fontFamily: 'Fredoka',
    },
    previewText: {
        fontSize: 14,
        color: '#555',
        marginBottom: 4,
        fontFamily: 'Fredoka',
    },
    suggestionButtonRow: {
        flexDirection: 'row',
        gap: 12,
    },
    suggestionRejectButton: {
        flex: 1,
        backgroundColor: '#f0f0f0',
        borderRadius: 15,
        paddingVertical: 12,
        alignItems: 'center',
    },
    suggestionRejectText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
        fontFamily: 'Fredoka',
    },
    suggestionAcceptButton: {
        flex: 2,
        backgroundColor: '#91483C',
        borderRadius: 15,
        paddingVertical: 12,
        alignItems: 'center',
    },
    suggestionAcceptText: {
        fontSize: 14,
        color: 'white',
        fontWeight: '600',
        fontFamily: 'Fredoka',
    },
});
