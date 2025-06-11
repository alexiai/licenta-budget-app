import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
    ImageBackground,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import categories from '../../../../lib/categories';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { romanianToEnglish } from '../../../../lib/translationDictionary';
import { findCategoryByProduct, findCategoryByContext, ReceiptContext } from '../../../../lib/productAssociation';
import bg from '@assets/bg/AIback.png'; // fundalul principal
import { useRouter } from 'expo-router';
import { useOCR, OCRDataProvider } from '../context/OCRContext';
import { addDocWithCache } from '../../../../lib/firebase';



interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    isTranslated?: boolean;
    originalText?: string;
}

interface ParsedExpense {
    amount: number;
    category: string;
    subcategory: string;
    date: string;
    note: string;
}

interface ExpenseInput {
    amount?: number;
    category?: string;
    subcategory?: string;
    date?: string;
    note?: string;
}

type PartialExpense = Partial<ParsedExpense>;

interface QuickReply {
    text: string;
    action: () => void;
}

interface LocalizedTexts {
    [key: string]: {
        en: string;
        ro: string;
    };
}

// Add new correction patterns
const CORRECTION_PATTERNS = {
    amount: [
        /(?:the )?(?:total|amount|cost|price) (?:was|should be|is) (\d+(?:[.,]\d{1,2})?)/i,
        /(?:it|that) (?:costs?|was) (\d+(?:[.,]\d{1,2})?)/i,
        /(?:not|incorrect|wrong|no,?) (?:it was|it's|its) (\d+(?:[.,]\d{1,2})?)/i,
        /(\d+(?:[.,]\d{1,2})?) (?:lei|ron|euros?|dollars?|\$|€)/i
    ],
    date: [
        /(?:the )?date (?:was|should be|is) (today|yesterday|[\d\/\.-]+)/i,
        /(?:it was|happened|occurred) (today|yesterday|[\d\/\.-]+)/i,
        /(?:not|incorrect|wrong|no,?) (?:it was) (today|yesterday|[\d\/\.-]+)/i
    ],
    category: [
        /(?:it was|it's|its)(?: a)? (.+?) expense/i,
        /(?:the )?category (?:was|should be|is) (.+)/i,
        /(?:it's|its|it was)(?: for)? (.+?)(?:, not|not| instead)/i
    ]
};

// Add new interface for correction state
interface CorrectionState {
    originalExpense: ParsedExpense;
    correctedFields: Set<keyof ParsedExpense>;
}

// Add receipt context tracking
const [recentReceipts, setRecentReceipts] = useState<ReceiptContext[]>([]);

export default function ChatInterface(): JSX.Element {
    const router = useRouter();
    const { ocrData, setOCRData } = useOCR();

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            text: 'Hi there! I\'m your smart assistant for tracking expenses. You can tell me what you spent today, either by voice or text. For example: "I spent 100 RON on gas today." I also understand Romanian! 🇬🇧🇷🇴',
            isUser: false,
            timestamp: new Date(),
        },
    ]);

    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentParsing, setCurrentParsing] = useState<ExpenseInput | null>(null);
    const [awaitingInput, setAwaitingInput] = useState<string | null>(null);
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
    const [userLanguage, setUserLanguage] = useState<'en' | 'ro'>('en'); // Track user's preferred language

    const scrollViewRef = useRef<ScrollView | null>(null);
    const [recognition, setRecognition] = useState<any>(null);

    // Add correction state to component state
    const [correctionState, setCorrectionState] = useState<CorrectionState | null>(null);

    // Add state for OCR confirmation
    const [pendingExpense, setPendingExpense] = useState<ParsedExpense | null>(null);

    // Initialize OCR provider
    useEffect(() => {
        OCRDataProvider.init(setOCRData);
    }, [setOCRData]);

    // Handle OCR data when it changes
    useEffect(() => {
        if (ocrData) {
            // Show confirmation message
            addMessage(`I found the following expense details from your receipt:
Amount: ${ocrData.amount} RON
Category: ${ocrData.category}
Subcategory: ${ocrData.subcategory}
Date: ${ocrData.date}

Is this correct?`, false);

            // Add quick reply buttons
            setQuickReplies([
                {
                    text: 'Yes, save it',
                    action: () => confirmAndSaveExpense(ocrData)
                },
                {
                    text: 'No, needs changes',
                    action: () => handleExpenseCorrection(ocrData)
                }
            ]);

            // Clear OCR data
            setOCRData(null);
        }
    }, [ocrData]);

    const initializeSpeechRecognition = () => {
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (!SpeechRecognition) {
                console.log('Speech Recognition not available in this browser');
                return;
            }

            const recognitionInstance = new SpeechRecognition();
            // Start with Romanian but we'll detect language from input
            recognitionInstance.lang = 'ro-RO';
            recognitionInstance.interimResults = false;
            recognitionInstance.maxAlternatives = 3; // Get multiple alternatives to help with detection
            recognitionInstance.continuous = false;

            recognitionInstance.onstart = () => {
                console.log('Speech recognition started');
                setIsListening(true);
            };

            recognitionInstance.onresult = (event: any) => {
                if (event.results && event.results[0] && event.results[0][0]) {
                    const spokenText = event.results[0][0].transcript;
                    console.log('Speech recognition result:', spokenText);
                    setInputText(spokenText);
                    handleSendMessage(spokenText);
                }
            };

            recognitionInstance.onerror = (event: any) => {
                console.error('Speech recognition error:', event.error);
                setIsListening(false);

                let errorMessage = 'Nu am putut înțelege ce ai spus. Încearcă din nou.';
                if (event.error === 'network') {
                    errorMessage = 'Eroare de rețea. Verifică conexiunea la internet.';
                } else if (event.error === 'not-allowed') {
                    errorMessage = 'Accesul la microfon nu este permis. Verifică setările browserului.';
                } else if (event.error === 'no-speech') {
                    errorMessage = 'Nu am detectat nicio voce. Încearcă să vorbești mai tare.';
                }

                Alert.alert('Eroare vocală', errorMessage);
            };

            recognitionInstance.onend = () => {
                console.log('Speech recognition ended');
                setIsListening(false);
            };

            setRecognition(recognitionInstance);
        } catch (error) {
            console.log('Speech Recognition initialization error:', error);
        }
    };

    const checkSpeechRecognitionSupport = (): boolean => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        return !!SpeechRecognition;
    };

    const startListening = () => {
        if (!checkSpeechRecognitionSupport()) {
            Alert.alert(
                'Funcție indisponibilă',
                'Recunoașterea vocală nu este suportată în acest browser. Încearcă Chrome sau Edge.'
            );
            return;
        }

        if (!recognition) {
            Alert.alert('Eroare', 'Recunoașterea vocală nu este inițializată.');
            return;
        }

        try {
            recognition.start();
        } catch (error) {
            console.log('Start listening error:', error);
            Alert.alert('Eroare', 'Nu pot porni ascultarea. Verifică permisiunile microfonului.');
        }
    };

    const stopListening = () => {
        if (recognition && isListening) {
            try {
                recognition.stop();
            } catch (error) {
                console.log('Stop listening error:', error);
            }
        }
    };

    const translateText = async (text: string, fromLang = 'ro', toLang = 'en'): Promise<string> => {
        const { romanianToEnglish } = await import('../../../../lib/translationDictionary');

        if (fromLang === toLang) return text;

        try {
            if (fromLang === 'ro' && toLang === 'en') {
                let translatedText = text.toLowerCase();
                const originalText = translatedText;

                const sortedEntries = Object.entries(romanianToEnglish)
                    .sort(([a], [b]) => b.length - a.length);

                sortedEntries.forEach(([ro, en]) => {
                    const regex = new RegExp(`\\b${ro}\\b`, 'gi');
                    if (regex.test(translatedText)) {
                        console.log(`🔄 Translation: "${ro}" → "${en}"`);
                        translatedText = translatedText.replace(regex, en);
                    }
                });

                console.log(`📝 Full translation: "${text}" → "${translatedText}"`);
                return translatedText;
            }

            return text;
        } catch (error) {
            console.log('Translation error:', error);
            return text;
        }
    };

    const speakText = (text: string, language?: 'en' | 'ro') => {
        const targetLanguage = language || userLanguage;
        const speechOptions = {
            language: targetLanguage === 'ro' ? 'ro-RO' : 'en-US',
            pitch: 1,
            rate: 0.85,
            voice: undefined as string | undefined
        };

        // Try to use a more natural voice if available
        if (targetLanguage === 'ro') {
            // For Romanian, try to find a Romanian voice
            speechOptions.voice = 'com.apple.ttsbundle.Ioana-compact'; // iOS Romanian voice
        } else {
            // For English, use default or a more natural voice
            speechOptions.voice = 'com.apple.ttsbundle.Samantha-compact'; // iOS English voice
        }

        Speech.speak(text, speechOptions);
    };

    const detectLanguage = async (text: string): Promise<'ro' | 'en'> => {
        const textLower = text.toLowerCase();
        const hasRomanianChars = /[ăâîșțĂÂÎȘȚ]/.test(text);
        const romanianWords = [
            'am', 'fost', 'cheltuit', 'azi', 'ieri', 'lei', 'pentru', 'și', 'cu', 'la',
            'benzinărie', 'magazin', 'restaurant', 'cafea', 'mâncare', 'băutură',
            'chirie', 'electricitate', 'apă', 'internet', 'haine', 'doctor', 'medicament',
            'plătit', 'cost', 'costa', 'suma', 'bani', 'cheltuială', 'cheltuieli'
        ];
        const hasRomanianWords = romanianWords.some(word => textLower.includes(word));
        const englishWords = ['spent', 'paid', 'cost', 'bought', 'purchase', 'dollar', 'euro'];
        const hasEnglishWords = englishWords.some(word => textLower.includes(word));

        if (hasRomanianChars || hasRomanianWords) {
            return 'ro';
        }
        if (hasEnglishWords) {
            return 'en';
        }
        return 'ro';
    };

    const parseRelativeDate = (text: string): string | null => {
        const combinedText = text.toLowerCase();

        const relativeDatePatterns = [
            { pattern: /(?:acum\s+)?(\d+)\s+(?:zile|zi)\s+(?:în urmă|inainte)/gi, unit: 'days', multiplier: -1 },
            { pattern: /(?:acum\s+)?(\d+)\s+(?:săptămâni|săptămână)\s+(?:în urmă|inainte)/gi, unit: 'weeks', multiplier: -1 },
            { pattern: /(?:acum\s+)?(\d+)\s+(?:luni|lună)\s+(?:în urmă|inainte)/gi, unit: 'months', multiplier: -1 },
            { pattern: /(?:peste\s+)?(\d+)\s+(?:zile|zi)/gi, unit: 'days', multiplier: 1 },
            { pattern: /(?:peste\s+)?(\d+)\s+(?:săptămâni|săptămână)/gi, unit: 'weeks', multiplier: 1 },
            { pattern: /(\d+)\s+days?\s+ago/gi, unit: 'days', multiplier: -1 },
            { pattern: /(\d+)\s+weeks?\s+ago/gi, unit: 'weeks', multiplier: -1 },
            { pattern: /(\d+)\s+months?\s+ago/gi, unit: 'months', multiplier: -1 },
            { pattern: /in\s+(\d+)\s+days?/gi, unit: 'days', multiplier: 1 },
            { pattern: /in\s+(\d+)\s+weeks?/gi, unit: 'weeks', multiplier: 1 },
        ];

        for (const { pattern, unit, multiplier } of relativeDatePatterns) {
            const match = combinedText.match(pattern);
            if (match) {
                const numberMatch = match[0].match(/(\d+)/);
                if (numberMatch) {
                    const number = parseInt(numberMatch[1]) * multiplier;
                    const targetDate = new Date();

                    if (unit === 'days') {
                        targetDate.setDate(targetDate.getDate() + number);
                    } else if (unit === 'weeks') {
                        targetDate.setDate(targetDate.getDate() + (number * 7));
                    } else if (unit === 'months') {
                        targetDate.setMonth(targetDate.getMonth() + number);
                    }

                    console.log(`🗓️ Relative date detected: "${match[0]}" → ${targetDate.toISOString().split('T')[0]}`);
                    return targetDate.toISOString().split('T')[0];
                }
            }
        }

        // Check for absolute date patterns
        const absoluteDatePatterns = [
            /(?:azi|today|astăzi)/gi,
            /(?:ieri|yesterday)/gi,
            /(?:alaltăieri|day before yesterday)/gi,
            /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
        ];

        for (const pattern of absoluteDatePatterns) {
            if (pattern.test(combinedText)) {
                if (/(?:azi|today|astăzi)/gi.test(combinedText)) {
                    return new Date().toISOString().split('T')[0];
                } else if (/(?:ieri|yesterday)/gi.test(combinedText)) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    return yesterday.toISOString().split('T')[0];
                } else if (/(?:alaltăieri|day before yesterday)/gi.test(combinedText)) {
                    const dayBefore = new Date();
                    dayBefore.setDate(dayBefore.getDate() - 2);
                    return dayBefore.toISOString().split('T')[0];
                } else {
                    const dateMatch = combinedText.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
                    if (dateMatch) {
                        const day = parseInt(dateMatch[1]);
                        const month = parseInt(dateMatch[2]) - 1;
                        const year = parseInt(dateMatch[3]);
                        const fullYear = year < 100 ? 2000 + year : year;

                        const parsedDate = new Date(fullYear, month, day);
                        if (!isNaN(parsedDate.getTime())) {
                            return parsedDate.toISOString().split('T')[0];
                        }
                    }
                }
                break;
            }
        }

        return null;
    };

    const parseExpenseFromText = async (text: string): Promise<ExpenseInput> => {
        console.log('🔍 Parsing expense from text:', text);
        const result: ExpenseInput = {
            note: text
        };
        const textToAnalyze = text.toLowerCase() || '';

        // Try context-aware category matching first
        const contextMatch = findCategoryByContext(textToAnalyze, recentReceipts);
        if (contextMatch) {
            result.category = contextMatch.category;
            result.subcategory = contextMatch.subcategory;
            console.log('📊 Found category from context:', { category: result.category, subcategory: result.subcategory });
        }

        // Enhanced amount patterns
        const amountPatterns = [
            // Currency symbols and words
            /(\d+(?:[.,]\d{1,2})?)\s*(?:lei|ron|euros?|dollars?|\$|€)/gi,
            // Verbs indicating spending
            /(?:spent|cheltuit|plătit|platit|cost|costa|paid|am dat)\s*(\d+(?:[.,]\d{1,2})?)/gi,
            // Prepositions
            /(\d+(?:[.,]\d{1,2})?)\s*(?:for|pentru|pe|on)/gi,
            // Standalone numbers with decimals
            /(?:^|\s)(\d+(?:[.,]\d{1,2}))(?:\s|$)/g,
            // Numbers at the start of text
            /^(\d+(?:[.,]\d{1,2})?)\s/g
        ];

        for (const pattern of amountPatterns) {
            const matches = textToAnalyze.matchAll(pattern);
            for (const match of Array.from(matches)) {
                const numberMatch = match[1]?.match(/(\d+(?:[.,]\d{1,2})?)/);
                if (numberMatch) {
                    const amount = parseFloat(numberMatch[1].replace(',', '.'));
                    if (!isNaN(amount) && amount > 0) {
                        result.amount = amount;
                        console.log('💰 Found amount:', amount, 'from pattern:', pattern);
                        break;
                    }
                }
            }
            if (result.amount) break;
        }

        if (textToAnalyze) {
            const relativeDate = parseRelativeDate(textToAnalyze);
            if (relativeDate) {
                result.date = relativeDate;
                console.log('📅 Found relative date:', relativeDate);
            } else {
                const absoluteDate = parseAbsoluteDate(textToAnalyze);
                if (absoluteDate) {
                    result.date = absoluteDate;
                    console.log('📅 Found absolute date:', absoluteDate);
                }
            }
        }

        // If no category found through context, try regular product matching
        if (!result.category) {
            const productMatch = findCategoryByProduct(textToAnalyze);
            if (productMatch) {
                result.category = productMatch.category;
                result.subcategory = productMatch.subcategory;
                console.log('📊 Found category from product:', { category: result.category, subcategory: result.subcategory });
            }
        }

        console.log('✨ Final parsed expense:', result);
        return result;
    };

    const createCategoryMapping = () => {
        const mapping: { [key: string]: { category: string; subcategory: string } } = {};

        mapping['benzinărie,gas,fuel,combustibil,petrol'] = { category: 'Transport', subcategory: 'Gas' };
        mapping['uber,taxi,rideshare,bolt'] = { category: 'Transport', subcategory: 'Taxi' };
        mapping['autobuz,bus,metro,subway,transport public'] = { category: 'Transport', subcategory: 'Public Transport' };

        mapping['magazin,grocery,supermarket,kaufland,carrefour,mega'] = { category: 'Food & Drinks', subcategory: 'Groceries' };
        mapping['restaurant,mâncare,food,dining'] = { category: 'Food & Drinks', subcategory: 'Restaurant' };
        mapping['cafea,coffee,cappuccino,latte,espresso'] = { category: 'Food & Drinks', subcategory: 'Coffee' };
        mapping['băutură,drink,bere,beer,wine,vin'] = { category: 'Food & Drinks', subcategory: 'Drinks' };
        mapping['gogoașă,gogoasa,donut,desert,dulciuri,prăjitură,tort,înghețată,ciocolată'] = { category: 'Food & Drinks', subcategory: 'Coffee' };

        mapping['chirie,rent,închiriere'] = { category: 'Housing', subcategory: 'Rent' };
        mapping['electricitate,electricity,curent'] = { category: 'Housing', subcategory: 'Electricity' };
        mapping['apă,water,canal'] = { category: 'Housing', subcategory: 'Water' };
        mapping['internet,wifi,broadband'] = { category: 'Housing', subcategory: 'Internet' };
        mapping['întreținere,maintenance,reparații'] = { category: 'Housing', subcategory: 'Maintenance' };

        mapping['haine,clothes,îmbrăcăminte,shopping'] = { category: 'Lifestyle', subcategory: 'Clothes' };
        mapping['înfrumusețare,beauty,cosmetice,parfum'] = { category: 'Lifestyle', subcategory: 'Beauty' };
        mapping['sport,gym,fitness,sală'] = { category: 'Lifestyle', subcategory: 'Sports' };

        mapping['doctor,medic,hospital,spital'] = { category: 'Health', subcategory: 'Doctor' };
        mapping['medicament,pills,pastile,pharmacy,farmacie'] = { category: 'Health', subcategory: 'Medication' };

        mapping['film,movie,cinema,concert,show'] = { category: 'Entertainment', subcategory: 'Movies' };
        mapping['jocuri,games,gaming'] = { category: 'Entertainment', subcategory: 'Games' };

        mapping['economii,savings,save'] = { category: 'Savings', subcategory: 'Savings' };

        return mapping;
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

    const getLocalizedText = (key: string, language: 'en' | 'ro' = userLanguage): string => {
        const texts: LocalizedTexts = {
            amountQuestion: {
                en: 'How much did you spend? Please specify the amount.',
                ro: 'Cât ai cheltuit? Te rog să specifici suma.'
            },
            dateQuestion: {
                en: 'When did this expense occur? You can say "today", "yesterday", "3 days ago" or a specific date.',
                ro: 'Când a avut loc această cheltuială? Poți spune "azi", "ieri", "acum 3 zile" sau o dată specifică.'
            },
            categoryQuestion: {
                en: 'What category was this expense for? Choose one from the options below:',
                ro: 'Pentru ce categorie a fost această cheltuială? Alege una din opțiunile de mai jos:'
            },
            subcategoryQuestion: {
                en: 'You chose {category}. What subcategory?',
                ro: 'Ai ales {category}. Ce subcategorie?'
            },
            today: {
                en: 'Today',
                ro: 'Azi'
            },
            yesterday: {
                en: 'Yesterday',
                ro: 'Ieri'
            },
            twoDaysAgo: {
                en: '2 days ago',
                ro: 'Acum 2 zile'
            },
            oneWeekAgo: {
                en: '1 week ago',
                ro: 'Acum o săptămână'
            },
            expenseSaved: {
                en: '✅ Perfect! I saved the expense of {amount} RON for {category} ({subcategory}) from {date}.',
                ro: '✅ Perfect! Am salvat cheltuiala de {amount} lei pentru {category} ({subcategory}) din data de {date}.'
            },
            expenseSavedVoice: {
                en: 'Expense saved successfully!',
                ro: 'Cheltuiala a fost salvată cu succes!'
            },
            couldNotUnderstand: {
                en: 'I couldn\'t understand the expense. Could you rephrase? For example: "I spent 50 RON on coffee today"',
                ro: 'Nu am putut înțelege cheltuiala. Poți să reformulezi? De exemplu: "Am cheltuit 50 lei pe cafea azi"'
            }
        };

        return texts[key]?.[language] || texts[key]?.en || key;
    };

    const generateFollowUpQuestions = (parsed: ExpenseInput, onComplete?: () => void): void => {
        const questions: string[] = [];
        const replies: QuickReply[] = [];

        if (!parsed.amount) {
            questions.push(getLocalizedText('amountQuestion'));
            setAwaitingInput('amount');
        } else if (!parsed.date) {
            questions.push(getLocalizedText('dateQuestion'));

            const dateOptions = [
                { text: 'Today', date: new Date().toISOString().split('T')[0] },
                { text: 'Yesterday', date: new Date(Date.now() - 86400000).toISOString().split('T')[0] }
            ];

            dateOptions.forEach(option => {
                replies.push({
                    text: option.text,
                    action: () => {
                        const updatedParsing = { ...parsed, date: option.date };
                        setCurrentParsing(updatedParsing);
                        setQuickReplies([]);
                        setAwaitingInput(null);

                        if (updatedParsing.amount && updatedParsing.category && updatedParsing.subcategory && updatedParsing.note) {
                            saveExpense(updatedParsing as ParsedExpense);
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
                onComplete?.();
                return;
            }
        }

        if (questions.length > 0) {
            addMessage(questions[0], false);
            if (replies.length > 0) {
                setQuickReplies(replies);
            }
            speakText(questions[0]);
            onComplete?.();
            return;
        }

        // If we get here, we have all the data we need
        if (isValidExpense(parsed)) {
            saveExpense(parsed as ParsedExpense);
        }
        onComplete?.();
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

                if (updatedParsing.amount && updatedParsing.category && updatedParsing.subcategory && updatedParsing.date && updatedParsing.note) {
                    saveExpense(updatedParsing as ParsedExpense);
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

                    if (updatedParsing.amount && updatedParsing.category && updatedParsing.subcategory && updatedParsing.date && updatedParsing.note) {
                        saveExpense(updatedParsing as ParsedExpense);
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
        if (!awaitingInput || !currentParsing) return;

        const updatedParsing = { ...currentParsing };
        let handled = true;

        switch (awaitingInput) {
            case 'amount':
                const amountMatch = input.match(/(\d+(?:[.,]\d{1,2})?)/);
                if (amountMatch?.[1]) {
                    updatedParsing.amount = parseFloat(amountMatch[1].replace(',', '.'));
                    addMessage(`Got it! I've updated the amount to ${updatedParsing.amount} RON.`, false);
                } else {
                    addMessage("I didn't understand the amount. Please try again with a number.", false);
                    handled = false;
                }
                break;

            case 'date':
                const date = parseRelativeDate(input);
                if (date) {
                    updatedParsing.date = date;
                } else {
                    addMessage("I didn't understand the date. Please try again.", false);
                    handled = false;
                }
                break;

            case 'category':
                const matchedCategory = categories.find(cat =>
                    cat.label.toLowerCase().includes(input.toLowerCase()) ||
                    cat.subcategories.some(sub => sub.toLowerCase().includes(input.toLowerCase()))
                );

                if (matchedCategory) {
                    updatedParsing.category = matchedCategory.label;
                    askForSubcategory(matchedCategory.label, matchedCategory.subcategories);
                } else {
                    addMessage('Nu am recunoscut categoria. Te rog să alegi din opțiunile de mai jos:', false);
                    const replies = categories.map(cat => ({
                        text: cat.label,
                        action: () => {
                            updatedParsing.category = cat.label;
                            askForSubcategory(cat.label, cat.subcategories);
                        }
                    }));
                    setQuickReplies(replies);
                    speakText('Nu am recunoscut categoria. Te rog să alegi din opțiunile afișate.');
                }
                break;

            case 'subcategory':
                const category = categories.find(c => c.label === currentParsing?.category);
                if (category) {
                    const matchedSubcategory = category.subcategories.find(sub =>
                        sub.toLowerCase().includes(input.toLowerCase())
                    );

                    if (matchedSubcategory) {
                        updatedParsing.subcategory = matchedSubcategory;
                    } else {
                        addMessage('Nu am recunoscut subcategoria. Te rog să alegi din opțiunile de mai jos:', false);
                        const replies = category.subcategories.map(sub => ({
                            text: sub,
                            action: () => {
                                updatedParsing.subcategory = sub;
                            }
                        }));
                        setQuickReplies(replies);
                        speakText('Nu am recunoscut subcategoria. Te rog să alegi din opțiunile afișate.');
                    }
                }
                break;
        }

        if (handled) {
            setCurrentParsing(updatedParsing);
            setAwaitingInput(null);
            
            // Show updated expense details with proper template string
            addMessage(
                `Here's the updated expense:\n` +
                `Amount: ${updatedParsing.amount} RON\n` +
                `Category: ${updatedParsing.category}\n` +
                `Subcategory: ${updatedParsing.subcategory}\n` +
                `Date: ${updatedParsing.date}\n\n` +
                `Is this correct now?`,
                false
            );

            setQuickReplies([
                {
                    text: 'Yes, save it',
                    action: () => {
                        if (isValidExpense(updatedParsing)) {
                            confirmAndSaveExpense(updatedParsing as ParsedExpense);
                        } else {
                            addMessage("Some information is still missing. Please provide all required details.", false);
                        }
                    }
                },
                {
                    text: 'No, needs more changes',
                    action: () => {
                        if (isValidExpense(updatedParsing)) {
                            handleExpenseCorrection(updatedParsing as ParsedExpense);
                        } else {
                            generateFollowUpQuestions(updatedParsing);
                        }
                    }
                }
            ]);
        }
    };

    const isValidExpense = (expense: Partial<ParsedExpense>): expense is ParsedExpense => {
        console.log('🔍 Validating expense:', JSON.stringify(expense, null, 2));
        
        const validations = {
            amount: typeof expense.amount === 'number' && expense.amount > 0 && !isNaN(expense.amount),
            category: typeof expense.category === 'string' && expense.category.length > 0,
            subcategory: typeof expense.subcategory === 'string' && expense.subcategory.length > 0,
            date: typeof expense.date === 'string' && (
                /^\d{4}-\d{2}-\d{2}$/.test(expense.date) || // YYYY-MM-DD
                /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(expense.date) // ISO string
            ),
            note: typeof expense.note === 'string' && expense.note.length > 0
        };

        // Additional validation for amount
        if (validations.amount && expense.amount! > 1000000) {
            console.log('❌ Amount exceeds reasonable limit');
            validations.amount = false;
        }

        // Additional validation for date
        if (validations.date) {
            const expenseDate = new Date(expense.date!);
            const now = new Date();
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(now.getFullYear() - 1);
            
            if (expenseDate > now || expenseDate < oneYearAgo) {
                console.log('❌ Date is outside reasonable range');
                validations.date = false;
            }
        }

        // Additional validation for category
        if (validations.category && validations.subcategory) {
            const categoryExists = categories.some(cat => 
                cat.label === expense.category && 
                cat.subcategories.includes(expense.subcategory!)
            );
            if (!categoryExists) {
                console.log('❌ Invalid category/subcategory combination');
                validations.category = false;
                validations.subcategory = false;
            }
        }

        console.log('✅ Validation results:', validations);

        const isValid = Object.values(validations).every(v => v);
        
        if (!isValid) {
            console.log('❌ Invalid expense. Missing or invalid fields:', 
                Object.entries(validations)
                    .filter(([_, valid]) => !valid)
                    .map(([field]) => field)
            );
        } else {
            console.log('✅ Expense is valid');
        }

        return isValid;
    };

    const saveExpense = async (expense: ParsedExpense) => {
        console.log('🔄 Attempting to save expense:', JSON.stringify(expense, null, 2));
        if (!isValidExpense(expense)) {
            console.error('❌ Invalid expense data:', JSON.stringify(expense, null, 2));
            addMessage('Sorry, the expense data is incomplete. Please try again.', false);
            return;
        }

        try {
            setIsProcessing(true);
            const user = auth.currentUser;
            if (!user) {
                console.error('❌ No authenticated user found');
                throw new Error('User not authenticated');
            }

            // Ensure date is in YYYY-MM-DD format
            const formattedDate = expense.date.includes('T') 
                ? expense.date.split('T')[0] 
                : expense.date;

            // Handle note - if it's a store name use it, otherwise use subcategory
            const note = expense.note && expense.note !== expense.subcategory 
                ? expense.note  // Use note if it's a store name
                : expense.subcategory;  // Default to subcategory if no store name

            // Add to Firestore with caching
            const expenseData = {
                ...expense,
                date: formattedDate,
                note: note,
                timestamp: new Date(),
                userId: user.uid,
                currency: 'RON',
                source: 'ai-chat'
            };
            console.log('📝 Saving expense data:', JSON.stringify(expenseData, null, 2));
            
            // Try direct Firestore first, then fall back to cached version if offline
            try {
                const docRef = await addDoc(collection(db, 'expenses'), expenseData);
                console.log('✅ Expense saved successfully with ID:', docRef.id);
                console.log('💾 Final saved expense:', JSON.stringify({ id: docRef.id, ...expenseData }, null, 2));
            } catch (firestoreError) {
                console.warn('⚠️ Direct Firestore save failed, trying cached version:', firestoreError);
                const docRef = await addDocWithCache('expenses', expenseData);
                console.log('✅ Expense saved to cache with ID:', docRef.id);
            }

            const successMessage = userLanguage === 'ro'
                ? `Perfect! Am salvat cheltuiala de ${expense.amount} lei pentru ${expense.category}.`
                : `Great! I've saved your expense of ${expense.amount} RON for ${expense.category}.`;

            addMessage(successMessage, false);
            speakText(userLanguage === 'ro' ? 'Cheltuiala a fost salvată cu succes!' : 'Expense saved successfully!');
            setQuickReplies([]);
            setCurrentParsing(null);
            setAwaitingInput(null);
        } catch (error) {
            console.error('❌ Error saving expense:', error);
            console.error('❌ Error details:', error instanceof Error ? error.message : 'Unknown error');
            console.error('❌ Failed expense data:', JSON.stringify(expense, null, 2));
            
            const errorMessage = userLanguage === 'ro'
                ? 'A apărut o eroare la salvarea cheltuielii. Te rog să încerci din nou.'
                : 'Sorry, there was an error saving your expense. Please try again.';
            
            addMessage(errorMessage, false);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCorrection = async (text: string) => {
        if (!correctionState) {
            addMessage("I'm not sure what you want to correct. Please try scanning the receipt again.", false);
            return;
        }

        const { originalExpense, correctedFields } = correctionState;
        let updatedExpense = { ...originalExpense };

        // Handle amount corrections
        const amountMatch = text.match(/(\d+(\.\d+)?)/);
        if (amountMatch?.[1] && (text.toLowerCase().includes('amount') || text.toLowerCase().includes('total') || text.toLowerCase().includes('lei') || text.toLowerCase().includes('ron'))) {
            updatedExpense.amount = parseFloat(amountMatch[1]);
            correctedFields.add('amount');
        }

        // Handle date corrections
        if (text.toLowerCase().includes('date') || text.toLowerCase().includes('today') || text.toLowerCase().includes('yesterday')) {
            if (text.toLowerCase().includes('today')) {
                updatedExpense.date = new Date().toISOString().split('T')[0];
            } else if (text.toLowerCase().includes('yesterday')) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                updatedExpense.date = yesterday.toISOString().split('T')[0];
            }
            correctedFields.add('date');
        }

        // Handle category corrections
        const categoryMatch = categories.find(cat => 
            text.toLowerCase().includes(cat.label.toLowerCase()) ||
            cat.subcategories.some(sub => text.toLowerCase().includes(sub.toLowerCase()))
        );

        if (categoryMatch) {
            updatedExpense.category = categoryMatch.label;
            // Find matching subcategory if mentioned
            const subcategoryMatch = categoryMatch.subcategories.find(sub =>
                text.toLowerCase().includes(sub.toLowerCase())
            );
            if (subcategoryMatch) {
                updatedExpense.subcategory = subcategoryMatch;
            }
            correctedFields.add('category');
        }

        // Update the correction state
        setCorrectionState({
            originalExpense: updatedExpense,
            correctedFields
        });

        // If all necessary corrections are made, save the expense
        if (isValidExpense(updatedExpense)) {
            addMessage("I've updated the expense with your corrections. Would you like to save it now?", false);
            setQuickReplies([
                {
                    text: 'Yes, save it',
                    action: () => {
                        saveExpense(updatedExpense);
                        setCorrectionState(null);
                    }
                },
                {
                    text: 'No, more corrections needed',
                    action: () => {
                        addMessage("What else needs to be corrected?", false);
                    }
                }
            ]);
        } else {
            addMessage("I've noted your correction. What else needs to be fixed?", false);
        }
    };

    const formatDate = (dateStr: string): string => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    };

    const parseAbsoluteDate = (text: string): string | null => {
        // Try different date formats
        const formats = [
            /(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})/, // DD/MM/YYYY
            /(\d{4})[\/\.-](\d{1,2})[\/\.-](\d{1,2})/, // YYYY/MM/DD
        ];

        for (const format of formats) {
            const match = text.match(format);
            if (match) {
                let year = parseInt(match[3]);
                const month = parseInt(match[2]);
                const day = parseInt(match[1]);

                // Handle 2-digit years
                if (year < 100) {
                    year += 2000;
                }

                const date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            }
        }

        return null;
    };

    const handleSendMessage = async (messageText?: string) => {
        const textToSend = messageText || inputText.trim();
        if (!textToSend) return;

        setIsProcessing(true);

        try {
            // Detect and set user language based on input
            const detectedLang = await detectLanguage(textToSend);
            setUserLanguage(detectedLang);

            addMessage(textToSend, true);
            setInputText('');
            setQuickReplies([]);

            // Regular message handling
            if (awaitingInput) {
                await handleFollowUpInput(textToSend);
            } else {
                const parsed = await parseExpenseFromText(textToSend);
                const parsedWithNote = {
                    ...parsed,
                    note: textToSend
                };
                setCurrentParsing(parsedWithNote);

                if (parsed.amount && parsed.category && parsed.subcategory) {
                    // If we have the main expense details, ask for confirmation
                    const date = parsed.date || new Date().toISOString().split('T')[0];
                    const expenseToConfirm: ParsedExpense = {
                        amount: parsed.amount,
                        category: parsed.category,
                        subcategory: parsed.subcategory,
                        date: date,
                        note: textToSend
                    };
                    
                    addMessage(
                        `I found these expense details:\n` +
                        `Amount: ${expenseToConfirm.amount} RON\n` +
                        `Category: ${expenseToConfirm.category}\n` +
                        `Subcategory: ${expenseToConfirm.subcategory}\n` +
                        `Date: ${expenseToConfirm.date}\n\n` +
                        `Is this correct?`,
                        false
                    );

                    setQuickReplies([
                        {
                            text: 'Yes, save it',
                            action: () => confirmAndSaveExpense(expenseToConfirm)
                        },
                        {
                            text: 'No, needs changes',
                            action: () => handleExpenseCorrection(expenseToConfirm)
                        }
                    ]);
                } else {
                    generateFollowUpQuestions(parsedWithNote);
                }
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

    const handleOCRNavigation = useCallback(() => {
        router.push('/tabs/ai/chatbox/ocr');
    }, [router]);

    const confirmAndSaveExpense = async (expense: ParsedExpense) => {
        try {
            setIsProcessing(true);
            const user = auth.currentUser;
            if (!user) {
                throw new Error('User not authenticated');
            }

            await addDocWithCache('expenses', {
                ...expense,
                timestamp: new Date(),
                userId: user.uid
            });

            addMessage("Perfect! I've saved your expense.", false);
            setPendingExpense(null);
            setQuickReplies([]);
        } catch (error) {
            console.error('Error saving expense:', error);
            addMessage('Sorry, there was an error saving the expense. Please try again.', false);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleExpenseCorrection = (expense: ParsedExpense) => {
        addMessage("What needs to be corrected? You can tell me what's wrong or choose from these options:", false);
        
        setQuickReplies([
            {
                text: 'Change amount',
                action: () => {
                    addMessage("What's the correct amount?", false);
                    setAwaitingInput('amount');
                }
            },
            {
                text: 'Change category',
                action: () => {
                    addMessage('Please select the correct category:', false);
                    setQuickReplies(categories.map(cat => ({
                        text: cat.label,
                        action: () => {
                            const updatedExpense = { ...expense, category: cat.label };
                            setPendingExpense(updatedExpense);
                            askForSubcategory(cat.label, cat.subcategories);
                        }
                    })));
                }
            },
            {
                text: 'Change date',
                action: () => {
                    addMessage("What's the correct date? You can say 'today', 'yesterday', or specify a date.", false);
                    setAwaitingInput('date');
                }
            }
        ]);
    };

    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <TouchableOpacity
                style={styles.ocrButton}
                onPress={handleOCRNavigation}
            >
                <Ionicons name="receipt-outline" size={24} color="#91483C" />
                <Text style={styles.ocrButtonText}>Upload Receipt</Text>
            </TouchableOpacity>

            <ScrollView
                ref={scrollViewRef}
                style={styles.messagesContainer}
                showsVerticalScrollIndicator={false}
            >
                {messages.map((message) => (
                    <View
                        key={message.id}
                        style={[
                            styles.messageContainer,
                            message.isUser ? styles.userMessage : styles.botMessage,
                        ]}
                    >
                        <Text style={[
                            styles.messageText,
                            message.isUser ? styles.userMessageText : styles.botMessageText,
                        ]}>
                            {message.text}
                        </Text>
                        {message.isTranslated && (
                            <Text style={styles.originalText}>
                                Original: {message.originalText}
                            </Text>
                        )}
                    </View>
                ))}

                {isProcessing && (
                    <View style={styles.processingContainer}>
                        <ActivityIndicator size="small" color="#91483C" />
                        <Text style={styles.processingText}>Se procesează...</Text>
                    </View>
                )}
            </ScrollView>

            {quickReplies.length > 0 && (
                <ScrollView
                    horizontal
                    style={styles.quickRepliesContainer}
                    showsHorizontalScrollIndicator={false}
                >
                    {quickReplies.map((reply, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.quickReplyButton}
                            onPress={() => handleQuickReply(reply)}
                        >
                            <Text style={styles.quickReplyText}>{reply.text}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            )}

            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    value={inputText}
                    onChangeText={setInputText}
                    placeholder="Scrie mesajul tău aici..."
                    placeholderTextColor="#999"
                    multiline
                    onSubmitEditing={() => handleSendMessage()}
                />
                <TouchableOpacity
                    style={[
                        styles.voiceButton,
                        !checkSpeechRecognitionSupport() && styles.voiceButtonDisabled
                    ]}
                    onPress={isListening ? stopListening : startListening}
                    disabled={!checkSpeechRecognitionSupport()}
                >
                    <Ionicons
                        name={isListening ? "stop" : "mic"}
                        size={24}
                        color={!checkSpeechRecognitionSupport() ? "#ccc" : (isListening ? "#FF4444" : "#91483C")}
                    />
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.sendButton}
                    onPress={() => handleSendMessage()}
                    disabled={!inputText.trim()}
                >
                    <Ionicons name="send" size={20} color="white" />
                </TouchableOpacity>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefaf6',
    },
    ocrButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff0e8',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 20,
        margin: 16,
        borderWidth: 1,
        borderColor: '#91483C',
        alignSelf: 'flex-start',
    },
    ocrButtonText: {
        color: '#91483C',
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 8,
    },
    messagesContainer: {
        flex: 1,
        padding: 16,
    },
    messageContainer: {
        marginVertical: 4,
        maxWidth: '80%',
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#91483C',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    botMessage: {
        alignSelf: 'flex-start',
        backgroundColor: 'white',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 10,
        boxShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
        elevation: 2,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userMessageText: {
        color: 'white',
    },
    botMessageText: {
        color: '#333',
    },
    originalText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#666',
        marginTop: 4,
    },
    processingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    processingText: {
        marginLeft: 8,
        color: '#91483C',
        fontSize: 14,
    },
    quickRepliesContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    quickReplyButton: {
        backgroundColor: '#fff0e8',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#91483C',
    },
    quickReplyText: {
        color: '#91483C',
        fontSize: 14,
        fontWeight: '500',
    },
    inputContainer: {
        padding: 16,
        backgroundColor: 'white',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        maxHeight: 100,
        marginBottom: 8,
    },
    voiceButton: {
        position: 'absolute',
        right: 76,
        bottom: 24,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff0e8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    voiceButtonDisabled: {
        backgroundColor: '#f5f5f5',
        opacity: 0.6,
    },
    sendButton: {
        position: 'absolute',
        right: 24,
        bottom: 24,
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#91483C',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
