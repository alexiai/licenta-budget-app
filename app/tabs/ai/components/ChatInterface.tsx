import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ImageBackground,
    Platform,
    ScrollView,
    TextInput,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import categories from '../../../../lib/categories';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import bg from '@assets/bg/AIback.png';
import * as ImagePicker from 'expo-image-picker';
import { useOCR } from '../hooks/useOCR';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { extractDateWithSpatialAwareness } from '../utils/dateExtraction';
import { extractAmountWithSpatialAwareness } from '../utils/amountExtraction';
import { detectMerchantAdvanced, analyzeReceiptLayout } from '../utils/receiptExtraction';
import { parseExpenseFromText, ParsedExpense, findCategoryByProduct } from '../utils/expenseParser';
import { translateText, detectLanguage, getLocalizedText } from '../utils/textProcessing';
import MessageList from './chat/MessageList';
import QuickReplies from './chat/QuickReplies';
import ChatInput from './chat/ChatInput';
import { createWorker } from 'tesseract.js';
import { matchReceiptTemplate, extractReceiptData } from '../utils/receiptTemplates';
import { preprocessImage } from '../utils/imagePreprocessing';
import { OCRWord } from '../hooks/useOCR';
import { ReceiptPattern } from '../types/receipt';
import { createOCRWorker, OCRProgress, TesseractResult } from '../utils/ocrConfig';
import { ReceiptMatchingSystem } from '../../../../lib/receiptMatching';

const receiptMatchingSystem = new ReceiptMatchingSystem();

interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    isTranslated?: boolean;
    originalText?: string;
}

interface QuickReply {
    text: string;
    action: () => void;
}

interface ExtendedOCRResult {
    text: string;
    confidence: number;
    words?: OCRWord[];
    imageWidth?: number;
    imageHeight?: number;
    amount?: number | null;
    date?: string | null;
}

interface ChatInterfaceProps {
    action: () => void;
}

export default function ChatInterface(): JSX.Element {
    const router = useRouter();

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            text: 'Hi there! I\'m your smart assistant for tracking expenses. You can tell me what you spent today, either by voice or text. For example: "I spent 100 RON on gas today." I also understand Romanian! 🇬🇧🇷🇴',
            isUser: false,
            timestamp: new Date(),
        },
    ]);

    const [inputText, setInputText] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentParsing, setCurrentParsing] = useState<ParsedExpense | null>(null);
    const [awaitingInput, setAwaitingInput] = useState<string | null>(null);
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
    const [userLanguage, setUserLanguage] = useState<'en' | 'ro'>('en');

    const scrollViewRef = useRef<ScrollView>(null);
    const [receiptPatterns, setReceiptPatterns] = useState<ReceiptPattern[]>([]);

    const { workerRef, loadReceiptPatterns, saveReceiptPatterns, findSimilarReceipts, preprocessImage, translateReceiptText } = useOCR();

    const { isListening, startListening, stopListening, checkSpeechRecognitionSupport } = useSpeechRecognition((spokenText) => {
        setInputText(spokenText);
        handleSendMessage(spokenText);
    });

    useEffect(() => {
        setReceiptPatterns(loadReceiptPatterns());
        return () => {
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    const saveReceiptPattern = (ocrText: string, extractedData: any, layout: any, userCorrections?: any) => {
        const pattern: ReceiptPattern = {
            id: Date.now().toString(),
            ocrText,
            extractedData,
            userCorrections,
            merchant: detectMerchantAdvanced(ocrText)?.name,
            layout,
            timestamp: new Date().toISOString()
        };

        const updatedPatterns = [...receiptPatterns, pattern];
        if (updatedPatterns.length > 50) {
            updatedPatterns.splice(0, updatedPatterns.length - 50);
        }

        setReceiptPatterns(updatedPatterns);
        saveReceiptPatterns(updatedPatterns);
        console.log('📚 Saved new receipt pattern');
    };

    const speakText = (text: string, language?: 'en' | 'ro') => {
        const targetLanguage = language || userLanguage;
        const speechOptions = {
            language: targetLanguage === 'ro' ? 'ro-RO' : 'en-US',
            pitch: 1,
            rate: 0.85,
            voice: undefined as string | undefined
        };

        if (targetLanguage === 'ro') {
            speechOptions.voice = 'com.apple.ttsbundle.Ioana-compact';
        } else {
            speechOptions.voice = 'com.apple.ttsbundle.Samantha-compact';
        }

        Speech.speak(text, speechOptions);
    };

    const addMessage = (text: string, isUser: boolean, isTranslated = false, originalText?: string, language?: 'en' | 'ro') => {
        const newMessage: ChatMessage = {
            id: Date.now().toString(),
            text,
            isUser,
            timestamp: new Date(),
            isTranslated,
            originalText,
        };

        setMessages(prev => [...prev, newMessage]);
        setTimeout(() => scrollViewRef.current?.scrollToEnd({ animated: true }), 100);
    };

    const generateFollowUpQuestions = (parsed: ParsedExpense) => {
        const questions: string[] = [];
        const replies: QuickReply[] = [];

        if (!parsed.amount) {
            questions.push(getLocalizedText('amountQuestion'));
            setAwaitingInput('amount');
        } else if (!parsed.date) {
            questions.push(getLocalizedText('dateQuestion'));

            const dateOptions = [
                { text: getLocalizedText('today'), date: new Date().toISOString().split('T')[0] },
                { text: getLocalizedText('yesterday'), date: (() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        return yesterday.toISOString().split('T')[0];
                    })() },
                { text: getLocalizedText('twoDaysAgo'), date: (() => {
                        const twoDaysAgo = new Date();
                        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                        return twoDaysAgo.toISOString().split('T')[0];
                    })() },
                { text: getLocalizedText('oneWeekAgo'), date: (() => {
                        const weekAgo = new Date();
                        weekAgo.setDate(weekAgo.getDate() - 7);
                        return weekAgo.toISOString().split('T')[0];
                    })() }
            ];

            dateOptions.forEach(option => {
                replies.push({
                    text: option.text,
                    action: () => {
                        const updatedParsing = { ...parsed, date: option.date };
                        setCurrentParsing(updatedParsing);
                        setQuickReplies([]);
                        setAwaitingInput(null);

                        if (updatedParsing.amount && updatedParsing.category && updatedParsing.subcategory) {
                            saveExpense(updatedParsing);
                        } else {
                            generateFollowUpQuestions(updatedParsing);
                        }
                    }
                });
            });

            setAwaitingInput('date');
        } else if (!parsed.category) {
            questions.push(getLocalizedText('categoryQuestion'));

            categories.forEach(cat => {
                replies.push({
                    text: cat.label,
                    action: () => {
                        const updatedParsing = { ...parsed, category: cat.label };
                        setCurrentParsing(updatedParsing);
                        askForSubcategory(cat.label, cat.subcategories);
                    }
                });
            });

            setAwaitingInput('category');
        } else if (!parsed.subcategory) {
            const categoryData = categories.find(c => c.label === parsed.category);
            if (categoryData) {
                askForSubcategory(parsed.category, categoryData.subcategories);
                return true;
            }
        }

        if (questions.length > 0) {
            addMessage(questions[0], false);
            if (replies.length > 0) {
                setQuickReplies(replies);
            }
            speakText(questions[0]);
            return true;
        }

        return false;
    };

    const askForSubcategory = (category: string, subcategories: string[]) => {
        const message = getLocalizedText('subcategoryQuestion').replace('{category}', category);
        addMessage(message, false);

        const replies: QuickReply[] = subcategories.slice(0, 4).map(sub => ({
            text: sub,
            action: () => {
                const updatedParsing = { ...currentParsing, category, subcategory: sub };
                setCurrentParsing(updatedParsing);
                setQuickReplies([]);
                setAwaitingInput(null);

                if (updatedParsing.amount && updatedParsing.category && updatedParsing.subcategory && updatedParsing.date) {
                    saveExpense(updatedParsing);
                } else {
                    generateFollowUpQuestions(updatedParsing);
                }
            }
        }));

        if (subcategories.length > 4) {
            replies.push({
                text: 'General',
                action: () => {
                    const updatedParsing = { ...currentParsing, category, subcategory: 'General' };
                    setCurrentParsing(updatedParsing);
                    setQuickReplies([]);
                    setAwaitingInput(null);

                    if (updatedParsing.amount && updatedParsing.category && updatedParsing.subcategory && updatedParsing.date) {
                        saveExpense(updatedParsing);
                    } else {
                        generateFollowUpQuestions(updatedParsing);
                    }
                }
            });
        }

        setQuickReplies(replies);
        setAwaitingInput('subcategory');
    };

    const handleFollowUpInput = async (input: string) => {
        if (awaitingInput === 'confirmation') {
            const inputLower = input.toLowerCase();
            if (inputLower.includes('da') || inputLower.includes('yes') || inputLower.includes('corect')) {
                setQuickReplies([]);
                setAwaitingInput(null);
                if (currentParsing?.amount && currentParsing?.category && currentParsing?.subcategory && currentParsing?.date) {
                    saveExpense(currentParsing);
                } else {
                    if (!generateFollowUpQuestions(currentParsing || { confidence: 0 })) {
                        const errorMessage = getLocalizedText('needMoreInfo');
                        addMessage(errorMessage, false);
                        speakText(errorMessage);
                    }
                }
            } else if (inputLower.includes('nu') || inputLower.includes('no') || inputLower.includes('greșit')) {
                setQuickReplies([]);
                setAwaitingInput(null);
                setCurrentParsing(null);
                const retryMessage = userLanguage === 'ro' ?
                    'Încearcă să faci o poză mai clară sau să introduci cheltuiala manual.' :
                    'Try taking a clearer photo or enter the expense manually.';
                addMessage(retryMessage, false);
                speakText(retryMessage);
            } else {
                addMessage(userLanguage === 'ro' ? 'Te rog să răspunzi cu "da" sau "nu".' : 'Please answer with "yes" or "no".', false);
            }
        } else if (awaitingInput === 'amount') {
            const amountMatch = input.match(/(\d+(?:[.,]\d{1,2})?)/);
            if (amountMatch) {
                const amount = parseFloat(amountMatch[1].replace(',', '.'));
                setCurrentParsing(prev => ({ ...prev, amount }));

                if (currentParsing?.date && currentParsing?.category && currentParsing?.subcategory) {
                    saveExpense({ ...currentParsing, amount });
                } else {
                    const nextQuestion = generateFollowUpQuestions({ ...currentParsing, amount, confidence: 0 });
                    if (!nextQuestion) {
                        addMessage('Mulțumesc! Mai am nevoie de câteva detalii.', false);
                    }
                }
            } else {
                addMessage('Nu am putut identifica suma. Te rog să specifici un număr (ex: 50, 25.5)', false);
                speakText('Nu am putut identifica suma. Te rog să specifici un număr.');
            }
        } else if (awaitingInput === 'date') {
            const parsedDateInput = await parseExpenseFromText(input);
            if (parsedDateInput.date) {
                setCurrentParsing(prev => ({ ...prev, date: parsedDateInput.date }));
                setAwaitingInput(null);
                setQuickReplies([]);

                if (currentParsing?.amount && currentParsing?.category && currentParsing?.subcategory) {
                    saveExpense({ ...currentParsing, date: parsedDateInput.date });
                } else {
                    const nextQuestion = generateFollowUpQuestions({ ...currentParsing, date: parsedDateInput.date, confidence: 0 });
                    if (!nextQuestion) {
                        addMessage('Mulțumesc! Mai am nevoie de câteva detalii.', false);
                    }
                }
            } else {
                addMessage('Nu am putut înțelege data. Te rog să specifici când a avut loc cheltuiala (ex: "azi", "ieri", "acum 3 zile", "15/12/2024")', false);
                speakText('Nu am putut înțelege data. Te rog să specifici când a avut loc cheltuiala.');
            }
        } else if (awaitingInput === 'category') {
            const inputLower = input.toLowerCase();
            const matchedCategory = categories.find(cat =>
                cat.label.toLowerCase().includes(inputLower) ||
                cat.subcategories.some(sub => sub.toLowerCase().includes(inputLower))
            );

            if (matchedCategory) {
                setCurrentParsing(prev => ({ ...prev, category: matchedCategory.label }));
                askForSubcategory(matchedCategory.label, matchedCategory.subcategories);
            } else {
                addMessage('Nu am recunoscut categoria. Te rog să alegi din opțiunile de mai jos:', false);
                const replies: QuickReply[] = categories.map(cat => ({
                    text: cat.label,
                    action: () => {
                        setCurrentParsing(prev => ({ ...prev, category: cat.label }));
                        askForSubcategory(cat.label, cat.subcategories);
                    }
                }));
                setQuickReplies(replies);
                speakText('Nu am recunoscut categoria. Te rog să alegi din opțiunile afișate.');
            }
        } else if (awaitingInput === 'subcategory') {
            const inputLower = input.toLowerCase();
            const currentCategory = categories.find(c => c.label === currentParsing?.category);

            if (currentCategory) {
                const matchedSub = currentCategory.subcategories.find(sub =>
                    sub.toLowerCase().includes(inputLower)
                );

                if (matchedSub) {
                    setCurrentParsing(prev => ({ ...prev, subcategory: matchedSub }));
                    setAwaitingInput(null);
                    setQuickReplies([]);

                    if (currentParsing?.amount) {
                        saveExpense({ ...currentParsing, subcategory: matchedSub });
                    } else {
                        addMessage('Perfect! Acum, cât ai cheltuit?', false);
                        setAwaitingInput('amount');
                    }
                } else {
                    addMessage('Nu am recunoscut subcategoria. Te rog să alegi din opțiunile de mai jos:', false);
                    if (currentParsing?.category) {
                        askForSubcategory(currentParsing.category!, currentCategory.subcategories);
                        speakText('Nu am recunoscut subcategoria. Te rog să alegi din opțiunile afișate.');
                    }
                }
            }
        }
    };

    const requestCameraPermission = async () => {
        if (Platform.OS === 'web') {
            return true;
        }

        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera permission is needed to scan receipts.');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error requesting camera permission:', error);
            return false;
        }
    };

    const requestLibraryPermission = async () => {
        if (Platform.OS === 'web') {
            return true;
        }

        try {
            const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Photo library permission is needed to upload receipts.');
                return false;
            }
            return true;
        } catch (error) {
            console.error('Error requesting library permission:', error);
            return false;
        }
    };

    const takePhoto = async () => {
        try {
            if (Platform.OS === 'web') {
                Alert.alert('Camera not available', 'Camera is not available on web. Please use the file picker instead.');
                return;
            }

            const hasPermission = await requestCameraPermission();
            if (!hasPermission) return;

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]) {
                await processReceiptImage(result.assets[0].uri);
            }
        } catch (err) {
            const error = err as Error;
            console.error('Error taking photo:', error);
            Alert.alert('Error', `Failed to take photo: ${error.message || 'Unknown error'}`);
        }
    };

    const pickImage = async () => {
        try {
            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [3, 4],
                quality: 0.8,
            });

            if (!result.canceled && result.assets?.[0]) {
                await processReceiptImage(result.assets[0].uri);
            }
        } catch (err) {
            const error = err as Error;
            console.error('Error picking image:', error);
            Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
        }
    };

    const processReceiptImage = async (imageUri: string): Promise<ExtendedOCRResult> => {
        try {
            // Initialize worker with proper configuration
            const worker = await createOCRWorker((progress: OCRProgress) => {
                console.log('OCR Progress:', progress);
                // You can update UI here based on progress if needed
            });

            try {
                // Process the image
                const result = await worker.recognize(imageUri);
                console.log('Raw OCR result:', result);
                
                // Safely extract and transform the data
                if (!result?.data) {
                    throw new Error('No OCR result data was returned. Please try again with a clearer image.');
                }

                const data = result.data;
                const ocrText = data.text || '';
                const confidence = data.confidence || 0;

                if (!ocrText.trim()) {
                    throw new Error('No text was detected in the image. Please try with a clearer image or different lighting conditions.');
                }

                // Convert TesseractWord[] to OCRWord[] with safe data
                const words: OCRWord[] = [];
                if (data.words && Array.isArray(data.words)) {
                    for (const word of data.words) {
                        if (word && typeof word.text === 'string' && word.text.trim()) {
                            words.push({
                                text: word.text,
                                confidence: word.confidence || 0,
                                bbox: {
                                    x0: word.bbox?.x0 || 0,
                                    y0: word.bbox?.y0 || 0,
                                    x1: word.bbox?.x1 || 0,
                                    y1: word.bbox?.y1 || 0
                                }
                            });
                        }
                    }
                }

                if (words.length === 0) {
                    console.warn('No words were extracted from the image');
                }

                // Template matching and data extraction
                const template = matchReceiptTemplate(ocrText);
                console.log('🔍 Template matching result:', {
                    matchedTemplate: template?.name || 'No match',
                    patterns: template ? Object.keys(template.patterns).length : 0
                });

                const extracted = extractReceiptData(ocrText, template || undefined);
                console.log('📑 Structured data extraction:', {
                    total: extracted.total,
                    date: extracted.date,
                    itemCount: extracted.items.length,
                    vatEntries: extracted.vat.length,
                    confidence: extracted.confidence
                });

                // Find similar receipts for context
                const matchResult = await receiptMatchingSystem.findSimilarReceipts(
                    ocrText,
                    {
                        text: ocrText,
                        confidence,
                        template: template?.name || ''
                    },
                    ''
                );
                console.log(`📚 Found ${matchResult.similarReceipts.length} similar receipt patterns`);

                const amount = extracted.total || extractAmountWithSpatialAwareness(words, ocrText, matchResult.similarReceipts);
                const date = extracted.date || extractDateWithSpatialAwareness(words, data.imageWidth || 1000, data.imageHeight || 1000, matchResult.similarReceipts);

                // Return the processed data
                return {
                    text: ocrText,
                    confidence,
                    amount,
                    date,
                    words,
                    imageWidth: data.imageWidth || 1000,
                    imageHeight: data.imageHeight || 1000
                };
            } finally {
                // Clean up worker
                if (worker) {
                    await worker.terminate().catch(error => {
                        console.warn('Failed to terminate worker:', error);
                    });
                }
            }
        } catch (error) {
            console.error('Error processing receipt image:', error);
            throw error;
        }
    };

    const handleReceiptScan = async () => {
        try {
            if (Platform.OS === 'web') {
                await pickImage();
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
        } catch (err) {
            const error = err as Error;
            console.error('Receipt scan error:', error);
            Alert.alert('Error', `Failed to start receipt scan: ${error.message || 'Unknown error'}`);
        }
    };

    const saveExpense = async (expense: Partial<ParsedExpense>, userCorrections?: any) => {
        if (!expense.amount || !expense.category || !expense.date) {
            addMessage('Îmi pare rău, nu am toate informațiile necesare pentru a salva cheltuiala (sumă, categorie și dată).', false);
            speakText('Nu am toate informațiile necesare pentru a salva cheltuiala.');
            return;
        }

        const user = auth.currentUser;
        if (!user) {
            addMessage('Trebuie să fii autentificat pentru a salva cheltuieli.', false);
            speakText('Trebuie să fii autentificat pentru a salva cheltuieli.');
            return;
        }

        try {
            let dateString = expense.date || new Date().toISOString().split('T')[0];

            if (dateString.includes('T')) {
                dateString = dateString.split('T')[0];
            }

            const expenseDate = new Date(dateString + 'T12:00:00.000Z');

            const expenseData = {
                userId: user.uid,
                amount: expense.amount,
                category: expense.category,
                subcategory: expense.subcategory || 'General',
                note: expense.note || `${expense.category} - ${expense.subcategory || 'General'}`,
                date: expenseDate.toISOString(),
                createdAt: new Date().toISOString(),
                currency: 'RON',
                source: expense.note === 'Receipt scan' ? 'receipt_scanner_ai' : 'ai_assistant'
            };

            await addDoc(collection(db, 'expenses'), expenseData);

            const displayDate = expense.date === new Date().toISOString().split('T')[0] ?
                (userLanguage === 'ro' ? 'azi' : 'today') :
                new Date(dateString).toLocaleDateString(userLanguage === 'ro' ? 'ro-RO' : 'en-US');

            const confirmationMessage = getLocalizedText('expenseSaved')
                .replace('{amount}', expense.amount.toString())
                .replace('{category}', expense.category)
                .replace('{subcategory}', expense.subcategory || 'General')
                .replace('{date}', displayDate);

            addMessage(confirmationMessage + '\n\n🧠 AI-ul a învățat din această tranzacție!', false);
            speakText(getLocalizedText('expenseSavedVoice'));

            setCurrentParsing(null);
            setAwaitingInput(null);
            setQuickReplies([]);

            console.log('💾 Enhanced expense saved successfully:', expenseData);
        } catch (error) {
            console.error('Error saving expense:', error);
            addMessage('A apărut o eroare la salvarea cheltuielii. Te rog să încerci din nou.', false);
            speakText('A apărut o eroare la salvarea cheltuielii.');
        }
    };

    const handleSendMessage = async (messageText?: string) => {
        const textToSend = messageText || inputText.trim();
        if (!textToSend) return;

        setIsProcessing(true);

        const detectedLang = await detectLanguage(textToSend);
        setUserLanguage(detectedLang);

        addMessage(textToSend, true);
        setInputText('');
        setQuickReplies([]);

        try {
            if (awaitingInput) {
                await handleFollowUpInput(textToSend);
            } else {
                const parsed = await parseExpenseFromText(textToSend);
                setCurrentParsing(parsed);

                let confirmationMessage = userLanguage === 'ro' ?
                    '🎯 Am înțeles următoarele:\n\n' :
                    '🎯 I understood the following:\n\n';

                if (parsed.amount) confirmationMessage += `💰 ${userLanguage === 'ro' ? 'Sumă' : 'Amount'}: ${parsed.amount} RON\n`;
                if (parsed.category) confirmationMessage += `🗂️ ${userLanguage === 'ro' ? 'Categorie' : 'Category'}: ${parsed.category}\n`;
                if (parsed.subcategory) confirmationMessage += `📝 ${userLanguage === 'ro' ? 'Subcategorie' : 'Subcategory'}: ${parsed.subcategory}\n`;
                if (parsed.date) {
                    const displayDate = parsed.date === new Date().toISOString().split('T')[0] ?
                        (userLanguage === 'ro' ? 'azi' : 'today') :
                        new Date(parsed.date).toLocaleDateString(userLanguage === 'ro' ? 'ro-RO' : 'en-US');
                    confirmationMessage += `📅 ${userLanguage === 'ro' ? 'Data' : 'Date'}: ${displayDate}\n`;
                }

                confirmationMessage += `\n❓ ${userLanguage === 'ro' ? 'Este aceasta informația corectă?' : 'Is this information correct?'}`;

                addMessage(confirmationMessage, false);
                speakText(confirmationMessage);

                const confirmationReplies: QuickReply[] = [
                    {
                        text: userLanguage === 'ro' ? '✅ Da, salvează' : '✅ Yes, save it',
                        action: () => {
                            setQuickReplies([]);
                            setAwaitingInput(null);
                            if (parsed.amount && parsed.category && parsed.subcategory && parsed.date) {
                                saveExpense(parsed);
                            } else {
                                if (!generateFollowUpQuestions(parsed)) {
                                    const errorMessage = getLocalizedText('needMoreInfo');
                                    addMessage(errorMessage, false);
                                    speakText(errorMessage);
                                }
                            }
                        }
                    },
                    {
                        text: userLanguage === 'ro' ? '❌ Nu, corectează' : '❌ No, let me correct',
                        action: () => {
                            setQuickReplies([]);
                            setAwaitingInput(null);
                            setCurrentParsing(null);
                            const retryMessage = userLanguage === 'ro' ?
                                'Te rog să îmi spui din nou cheltuiala sau să o introduci manual.' :
                                'Please tell me the expense again or enter it manually.';
                            addMessage(retryMessage, false);
                            speakText(retryMessage);
                        }
                    }
                ];

                setQuickReplies(confirmationReplies);
                setAwaitingInput('confirmation');
            }
        } catch (error) {
            console.log('Error processing message:', error);
            const errorText = userLanguage === 'ro' ? 'A apărut o eroare. Te rog să încerci din nou.' : 'An error occurred. Please try again.';
            addMessage(errorText, false);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleQuickReply = (reply: QuickReply) => {
        addMessage(reply.text, true);
        reply.action();
    };

    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <View style={styles.languageBanner}>
                <Text style={styles.languageBannerText}>
                    🤖 Smart Receipt AI • Supports English and Romanian 🇬🇧🇷🇴
                </Text>
            </View>

            <MessageList
                messages={messages}
                isProcessing={isProcessing}
                scrollViewRef={scrollViewRef}
            />

            <QuickReplies
                quickReplies={quickReplies}
                onQuickReply={handleQuickReply}
            />

            <ChatInput
                inputText={inputText}
                setInputText={setInputText}
                isProcessing={isProcessing}
                isListening={isListening}
                checkSpeechRecognitionSupport={checkSpeechRecognitionSupport}
                onSendMessage={() => handleSendMessage()}
                onReceiptScan={handleReceiptScan}
                startListening={startListening}
                stopListening={stopListening}
            />
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefaf6',
    },
    languageBanner: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingVertical: 8,
        paddingHorizontal: 16,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    languageBannerText: {
        fontSize: 14,
        color: '#91483C',
        fontWeight: '500',
    },
});
