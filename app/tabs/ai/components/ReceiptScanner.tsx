import React, { useState, useRef } from 'react';
import {View,Text,StyleSheet,TouchableOpacity,Alert,ActivityIndicator,ScrollView,ImageBackground,Platform,Modal,Image,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { findCategoryByProduct } from '../../../../lib/productAssociation';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { receiptLearningSystem, OCRWord } from '../../../../lib/receiptLearning';
import { receiptFeedbackSystem, ReceiptImprovementSuggestion } from '../../../../lib/receiptFeedback';
import { receiptStorageSystem } from '../../../../lib/receiptStorage';
import { DeveloperAnnotationModal } from '../../../../lib/developerAnnotations';
import { ReceiptMatchingSystem } from '../../../../lib/receiptMatching';
import { createOCRWorker, OCRProgress, TesseractResult } from '../utils/ocrConfig';
import bg from '@assets/bg/AIback.png';

import ImageCapture from './receipt/ImageCapture';
import ExtractionResults from './receipt/ExtractionResults';
import { translateText, extractAmountFromText, extractDateFromText } from '../utils/receiptTextExtraction';

const receiptMatchingSystem = new ReceiptMatchingSystem();

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

interface OCRError extends Error {
    message: string;
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
    const [feedbackSuggestions, setFeedbackSuggestions] = useState<ReceiptImprovementSuggestion[]>([]);
    const [ocrWords, setOcrWords] = useState<OCRWord[]>([]);
    const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
    const [learningTips, setLearningTips] = useState<string[]>([]);
    const [savedReceiptId, setSavedReceiptId] = useState<string | null>(null);
    const [showDeveloperSuggestion, setShowDeveloperSuggestion] = useState(false);
    const [developerSuggestionData, setDeveloperSuggestionData] = useState<any>(null);
    const [showFeedbackForm, setShowFeedbackForm] = useState(false);
    const [feedbackQuestions, setFeedbackQuestions] = useState<any[]>([]);
    const [userFeedbackData, setUserFeedbackData] = useState<any>({});
    const [showDeveloperAnnotations, setShowDeveloperAnnotations] = useState(false);
    const [matchResult, setMatchResult] = useState<MatchResult | null>(null);

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

    const processImage = async (imageUri: string) => {
        setIsProcessing(true);
        let worker;

        try {
            // Initialize worker with proper configuration
            worker = await createOCRWorker((progress: OCRProgress) => {
                console.log('[ReceiptScanner] OCR Progress:', progress);
                // You can update UI here based on progress if needed
            });

            try {
                // Process the image
                const result = await worker.recognize(imageUri);
                console.log('[ReceiptScanner] Raw OCR result:', result);

                if (!result?.data) {
                    throw new Error('OCR completed but no data was returned. Please try again with a clearer image.');
                }

                // Log the structure of the result
                console.log('[ReceiptScanner] 📊 OCR Result structure:', {
                    hasData: !!result.data,
                    dataKeys: Object.keys(result.data),
                    hasText: !!result.data.text,
                    hasWords: Array.isArray(result.data.words),
                    wordsLength: result.data.words?.length
                });

                // Ensure we have the data object
                const data = result.data;
                const ocrText = data.text || '';
                const confidence = data.confidence || 0;

                if (!ocrText.trim()) {
                    throw new Error('No text was detected in the image. Please try with a clearer image or different lighting conditions.');
                }

                // Extract words with spatial information
                const words: OCRWord[] = [];
                
                // Safely process words if they exist
                if (data.words && Array.isArray(data.words)) {
                    for (const word of data.words) {
                        if (word && typeof word.text === 'string' && word.text.trim()) {
                            words.push({
                                text: word.text,
                                confidence: word.confidence || 0,
                                bbox: word.bbox || { x0: 0, y0: 0, x1: 0, y1: 0 }
                            });
                        }
                    }
                }

                if (words.length === 0) {
                    console.warn('[ReceiptScanner] No words were extracted from the image');
                }

                console.log(`📊 Extracted ${words.length} words`);

                try {
                    // Process the extracted data
                    const intelligentResults = receiptLearningSystem.extractReceiptData(words, data.imageWidth || 1000, data.imageHeight || 1000, ocrText);
                    console.log('🧠 Intelligent processing results:', intelligentResults);

                    // Get layout analysis
                    const layout = receiptLearningSystem.analyzeReceiptLayout(words, data.imageWidth || 1000, data.imageHeight || 1000);
                    console.log('📐 Layout analysis:', layout);

                    // Find similar receipts
                    const matchResult = await receiptMatchingSystem.findSimilarReceipts(
                        ocrText,
                        {
                            text: ocrText,
                            confidence,
                            template: ''
                        },
                        auth.currentUser?.uid || ''
                    );
                    console.log('🔍 Pattern matching result:', matchResult);

                    // Apply learned rules
                    const enhancedResults = receiptMatchingSystem.applyLearnedRules(intelligentResults, matchResult);
                    console.log('✨ Enhanced results:', enhancedResults);

                    // Get category suggestions
                    const categoryMatch = findCategoryByProduct(ocrText.toLowerCase());
                    console.log('🏷️ Category match:', categoryMatch);

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
                        imageWidth: data.imageWidth || 1000,
                        imageHeight: data.imageHeight || 1000
                    };

                    setExtractedData(extracted);
                    setEditableAmount(enhancedResults.amount?.toString() || '');
                    setEditableDate(enhancedResults.date || '');

                    // Show matching info in console for debugging
                    if (matchResult.isMatch) {
                        console.log('🤖 Applied learned extraction rules:', matchResult.suggestedExtraction);
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
                } catch (processingError) {
                    console.error('[ReceiptScanner] Error during data processing:', processingError);
                    // Even if processing fails, we still have the OCR text, so create a basic extraction
                    const extracted: ExtractedData = {
                        rawText: ocrText,
                        confidence: confidence,
                        words: words,
                        imageWidth: data.imageWidth || 1000,
                        imageHeight: data.imageHeight || 1000
                    };
                    setExtractedData(extracted);
                    setAwaitingDateInput(true);
                    setShowConfirmation(true);
                    Alert.alert(
                        'Partial Processing',
                        'The receipt was scanned but some information could not be automatically extracted. Please enter the details manually.',
                        [{ text: 'OK' }]
                    );
                }
            } finally {
                // Clean up worker
                if (worker) {
                    await worker.terminate().catch(error => {
                        console.warn('[ReceiptScanner] Failed to terminate worker:', error);
                    });
                }
            }
        } catch (error) {
            console.error('[ReceiptScanner] Error processing image:', error);
            Alert.alert(
                'Error',
                error instanceof Error ? error.message : 'Failed to process the receipt. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsProcessing(false);
        }
    };

    const handleSubmitFeedback = async () => {
        try {
            console.log('📝 Submitting user feedback for OCR improvement...');

            const user = auth.currentUser;
            if (!user) return;

            // Save feedback for learning
            await receiptFeedbackSystem.saveFeedback(
                selectedImage || '',
                extractedData?.rawText || 'OCR_FAILED',
                extractedData || {},
                userFeedbackData,
                {
                    whatWentWrong: 'OCR extraction failed',
                    merchantName: userFeedbackData.merchant,
                    additionalTips: userFeedbackData.quality_issue
                },
                user.uid
            );

            // If user provided amount and date, create expense and save data
            if (userFeedbackData.amount && userFeedbackData.date) {
                const amount = parseFloat(userFeedbackData.amount);
                const date = userFeedbackData.date;

                // Save expense to expenses collection
                const expenseData = {
                    userId: user.uid,
                    amount: amount,
                    category: 'Other',
                    subcategory: 'Miscellaneous',
                    note: `Receipt scan - ${userFeedbackData.merchant || 'Manual entry'}`,
                    date: new Date(date + 'T12:00:00.000Z').toISOString(),
                    createdAt: new Date().toISOString(),
                    currency: 'RON',
                    source: 'receipt_scanner_manual',
                    receiptId: savedReceiptId // Link to the saved receipt
                };

                await addDoc(collection(db, 'expenses'), expenseData);

                console.log('💰 Expense created from user feedback:', {
                    amount,
                    date,
                    merchant: userFeedbackData.merchant
                });

                Alert.alert(
                    'Success!',
                    `Expense of ${amount} RON saved successfully! Your feedback will help improve receipt recognition.`,
                    [{ text: 'OK', onPress: () => {
                            setShowFeedbackForm(false);
                            resetScanner();
                        }}]
                );
            } else {
                Alert.alert(
                    'Thank You!',
                    'Your feedback will help improve receipt recognition.',
                    [{ text: 'OK', onPress: () => {
                            setShowFeedbackForm(false);
                            resetScanner();
                        }}]
                );
            }

        } catch (error) {
            console.error('Error submitting feedback:', error);
            Alert.alert('Error', 'Failed to save feedback. Please try again.');
        }
    };

    const handleSaveExpense = async () => {
        if (!editableAmount || !selectedImage) {
            Alert.alert('Missing Data', 'Please ensure amount is provided.');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Authentication Error', 'You must be logged in to save expenses.');
            return;
        }

        try {
            console.log('🚀 Starting receipt save process...');

            const finalDate = editableDate || new Date().toISOString().split('T')[0];
            const expenseDate = new Date(finalDate + 'T12:00:00.000Z');

            // Prepare user corrections (handle case where OCR completely failed)
            const originalAmount = extractedData?.amount || 0;
            const originalDate = extractedData?.date || '';

            const userCorrections: any = {};
            if (parseFloat(editableAmount) !== originalAmount) {
                userCorrections.amount = parseFloat(editableAmount);
            }
            if (editableDate !== originalDate) {
                userCorrections.date = editableDate;
            }

            // If OCR failed completely, mark as corrected since user had to enter everything
            const ocrFailed = !extractedData || extractedData.rawText === 'OCR_FAILED';
            if (ocrFailed) {
                userCorrections.amount = parseFloat(editableAmount);
                userCorrections.date = editableDate;
            }

            // Create proper extracted data object
            const finalExtractedData = {
                amount: parseFloat(editableAmount),
                date: finalDate,
                category: extractedData?.category || 'Other',
                subcategory: extractedData?.subcategory || 'Miscellaneous',
                rawText: extractedData?.rawText || 'OCR_FAILED',
                confidence: extractedData?.confidence || 0,
                merchantName: extractedData?.merchantName,
                layout: extractedData?.layout,
                words: extractedData?.words || [],
                imageWidth: extractedData?.imageWidth || 1000,
                imageHeight: extractedData?.imageHeight || 1200
            };

            console.log('📊 Final extracted data:', finalExtractedData);

            // Create metadata for receipt storage
            const metadata = receiptStorageSystem.createMetadataFromOCR(
                finalExtractedData.rawText,
                finalExtractedData,
                Object.keys(userCorrections).length > 0 ? userCorrections : null,
                { ocrFailed }
            );

            console.log('📦 Metadata to be saved:', {
                receiptType: metadata.receiptType,
                extractedData: metadata.extractedData,
                userCorrections: metadata.userCorrections,
                wasCorrected: metadata.wasCorrected,
                ocrConfidence: metadata.ocrConfidence,
                receiptQuality: metadata.receiptQuality
            });

            // Save receipt with structured metadata to Firebase
            console.log('💾 Attempting to save receipt to Firebase...');
            const savedReceipt = await receiptStorageSystem.saveReceiptWithMetadata(
                selectedImage,
                metadata
            );

            setSavedReceiptId(savedReceipt.firestoreId);

            console.log('✅ Receipt saved successfully:', {
                receiptId: savedReceipt.id,
                firestoreId: savedReceipt.firestoreId,
                imageUrl: savedReceipt.imageUrl
            });

            // Save expense to existing collection
            const expenseData = {
                userId: user.uid,
                amount: parseFloat(editableAmount),
                category: finalExtractedData.category,
                subcategory: finalExtractedData.subcategory,
                note: `Receipt scan - ${finalExtractedData.merchantName || finalExtractedData.category}`,
                date: expenseDate.toISOString(),
                createdAt: new Date().toISOString(),
                currency: 'RON',
                source: 'receipt_scanner',
                receiptId: savedReceipt.id // Link to receipt metadata
            };

            console.log('💰 Saving expense data:', expenseData);
            await addDoc(collection(db, 'expenses'), expenseData);

            // Save successful pattern for learning if we have word data
            if (extractedData?.words && extractedData.words.length > 0) {
                receiptLearningSystem.saveSuccessfulPattern(
                    extractedData.rawText,
                    selectedImage,
                    extractedData.words,
                    extractedData.imageWidth || 1000,
                    extractedData.imageHeight || 1200,
                    {
                        amount: parseFloat(editableAmount),
                        date: finalDate,
                        category: extractedData.category || 'Other',
                        subcategory: extractedData.subcategory || 'Miscellaneous'
                    },
                    Object.keys(userCorrections).some(key => userCorrections[key as keyof typeof userCorrections] !== undefined) ? userCorrections : undefined
                );
            }

            // Show success message with developer options
            const hasCorrections = Object.keys(userCorrections).some(key => userCorrections[key as keyof typeof userCorrections] !== undefined);
            const showDevOptions = __DEV__ && (hasCorrections || (extractedData?.confidence || 0) < 80);
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
            if (hasCorrections || (extractedData?.confidence || 0) < 70) {
                setTimeout(() => {
                    if (feedbackSuggestions.length > 0 && !showDevOptions) {
                        setShowFeedbackForm(true);
                    }
                }, 1000);
            }

        } catch (error) {
            console.error('Error saving expense:', error instanceof Error ? error.message : 'Unknown error');
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
        setShowFeedbackForm(false);
        setFeedbackSuggestions([]);
        setOcrWords([]);
        setLearningTips([]);
        setMatchResult(null);
        setShowDeveloperSuggestion(false);
        setDeveloperSuggestionData(null);
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
                    <ImageCapture
                        showImageOptions={showImageOptions}
                        setShowImageOptions={setShowImageOptions}
                        takePhoto={takePhoto}
                        pickImage={pickImage}
                    />
                ) : (
                    <>
                        {isProcessing && (
                            <View style={styles.processingContainer}>
                                <ActivityIndicator size="large" color="#91483C" />
                                <Text style={styles.processingText}>Processing receipt...</Text>
                            </View>
                        )}

                        {showConfirmation && extractedData && (
                            <ExtractionResults
                                selectedImage={selectedImage}
                                extractedData={extractedData}
                                editableAmount={editableAmount}
                                setEditableAmount={setEditableAmount}
                                editableDate={editableDate}
                                setEditableDate={setEditableDate}
                                awaitingDateInput={awaitingDateInput}
                                matchResult={matchResult}
                                learningTips={learningTips}
                                feedbackSuggestions={feedbackSuggestions}
                                onSaveExpense={handleSaveExpense}
                                onReset={resetScanner}
                                onShowFeedback={() => setShowFeedbackForm(true)}
                            />
                        )}
                    </>
                )}
            </ScrollView>

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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
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
