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
import { addDocWithCache } from '@lib/firebase';
import expenseService from '../../../services/ExpenseService';
import { findStoreInText } from '@lib/utils/storeNames';



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

// Add Romanian month names mapping
const ROMANIAN_MONTHS: { [key: string]: number } = {
    'ianuarie': 1, 'ian': 1,
    'februarie': 2, 'feb': 2,
    'martie': 3, 'mar': 3,
    'aprilie': 4, 'apr': 4,
    'mai': 5,
    'iunie': 6, 'iun': 6,
    'iulie': 7, 'iul': 7,
    'august': 8, 'aug': 8,
    'septembrie': 9, 'sept': 9,
    'octombrie': 10, 'oct': 10,
    'noiembrie': 11, 'noi': 11,
    'decembrie': 12, 'dec': 12
};

const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export default function ChatInterface(): JSX.Element {
    const router = useRouter();
    const { ocrData, setOCRData } = useOCR();

    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            text: 'Hi there! I\'m your smart assistant for tracking expenses. You can tell me what you spent today, either by voice or text.',
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
        const textLower = text.toLowerCase();
        const today = new Date();
        
        // Handle Romanian relative dates
        if (textLower.includes('azi') || textLower.includes('astazi')) {
            return today.toISOString().split('T')[0];
        }
        
        if (textLower.includes('ieri')) {
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            return yesterday.toISOString().split('T')[0];
        }
        
        // Handle "acum X zile/saptamani/luni"
        const relativeMatch = textLower.match(/acum\s+(\d+)\s+(zi|zile|sapt[aă]m[aă]n[iă]|lun[iă])/);
        if (relativeMatch) {
            const amount = parseInt(relativeMatch[1]);
            const unit = relativeMatch[2];
            const date = new Date(today);
            
            if (unit.startsWith('zi')) {
                date.setDate(date.getDate() - amount);
            } else if (unit.startsWith('sapt')) {
                date.setDate(date.getDate() - (amount * 7));
            } else if (unit.startsWith('lun')) {
                date.setMonth(date.getMonth() - amount);
            }
            
            return date.toISOString().split('T')[0];
        }
        
        return null;
    };

    const parseExpenseFromText = async (text: string): Promise<ExpenseInput> => {
        console.log('🔍 Parsing expense from text:', text);
        const result: ExpenseInput = {};
        const textToAnalyze = text.toLowerCase() || '';

        // Try to find store name first
        const storeMatch = findStoreInText(textToAnalyze);
        if (storeMatch) {
            result.category = storeMatch.category;
            result.subcategory = storeMatch.subcategory;
            result.note = storeMatch.storeName;
            console.log('🏪 Found store:', storeMatch);
        }

        // Try context-aware category matching if no store match
        if (!result.category) {
            const contextMatch = findCategoryByContext(textToAnalyze, recentReceipts);
            if (contextMatch) {
                result.category = contextMatch.category;
                result.subcategory = contextMatch.subcategory;
                console.log('📊 Found category from context:', { category: result.category, subcategory: result.subcategory });
            }
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

        // Parse date from text
        if (textToAnalyze) {
            let parsedDate = null;
            
            // First try relative date
            parsedDate = parseRelativeDate(textToAnalyze);
            if (parsedDate) {
                result.date = parsedDate;
                console.log('📅 Found relative date:', parsedDate);
            } else {
                // Then try absolute date
                parsedDate = parseAbsoluteDate(textToAnalyze);
                if (parsedDate) {
                    result.date = parsedDate;
                    console.log('📅 Found absolute date:', parsedDate);
                } else {
                    // Default to today if no date found
                    result.date = new Date().toISOString().split('T')[0];
                    console.log('📅 Using default date (today):', result.date);
                }
            }
        }

        // If no category found through context or store, try regular product matching
        if (!result.category) {
            const productMatch = findCategoryByProduct(textToAnalyze);
            if (productMatch) {
                result.category = productMatch.category;
                result.subcategory = productMatch.subcategory;
                console.log('📊 Found category from product:', { category: result.category, subcategory: result.subcategory });
            }
        }

        // If no note set from store name, use subcategory or original text
        if (!result.note) {
            result.note = result.subcategory || textToAnalyze;
        }

        // Ensure we have a category and subcategory for common items
        if (!result.category && textToAnalyze.includes('apa')) {
            result.category = 'Food & Drinks';
            result.subcategory = 'Groceries';
            console.log('📊 Set default category for water');
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

    const addMessage = (text: string, isUser: boolean, isTranslated = false, originalText?: string) => {
        const newMessage: ChatMessage = {
            id: generateUniqueId(),
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

    const handleFollowUpInput = async (text: string) => {
        console.log('🔄 Handling follow-up input:', { text, awaitingInput, currentParsing });
        let handled = false;
        let updatedParsing = { ...currentParsing };

        if (!updatedParsing) {
            updatedParsing = {};
        }

        switch (awaitingInput) {
            case 'amount':
                const amountMatch = text.match(/(\d+(?:[.,]\d{1,2})?)/);
                if (amountMatch) {
                    updatedParsing.amount = parseFloat(amountMatch[1].replace(',', '.'));
                    handled = true;
                }
                break;

            case 'date':
                let parsedDate = parseRelativeDate(text) || parseAbsoluteDate(text);
                if (!parsedDate && text.toLowerCase().includes('today')) {
                    parsedDate = new Date().toISOString().split('T')[0];
                }
                if (parsedDate) {
                    updatedParsing.date = parsedDate;
                    handled = true;
                }
                break;

            case 'category':
                const categoryMatch = categories.find(cat => 
                    text.toLowerCase().includes(cat.label.toLowerCase())
                );
                if (categoryMatch) {
                    updatedParsing.category = categoryMatch.label;
                    handled = true;
                }
                break;

            case 'subcategory':
                const category = categories.find(cat => cat.label === updatedParsing.category);
                if (category) {
                    const subcategoryMatch = category.subcategories.find(sub =>
                        text.toLowerCase().includes(sub.toLowerCase())
                    );
                    if (subcategoryMatch) {
                        updatedParsing.subcategory = subcategoryMatch;
                        handled = true;
                    }
                }
                break;
        }

        if (handled) {
            console.log('✅ Updated parsing:', updatedParsing);
            setCurrentParsing(updatedParsing);
            setAwaitingInput(null);
            
            // Ensure we have a date
            if (!updatedParsing.date) {
                updatedParsing.date = new Date().toISOString().split('T')[0];
                console.log('📅 Added default date:', updatedParsing.date);
            }

            // Ensure we have a note
            if (!updatedParsing.note) {
                updatedParsing.note = updatedParsing.subcategory || text;
                console.log('📝 Added default note:', updatedParsing.note);
            }

            // Show updated expense details
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
                            saveExpense(updatedParsing as ParsedExpense);
                        } else {
                            addMessage("Some information is still missing. Please provide all required details.", false);
                            generateFollowUpQuestions(updatedParsing);
                        }
                    }
                },
                {
                    text: 'No, needs more changes',
                    action: () => handleExpenseCorrection(updatedParsing as ParsedExpense)
                }
            ]);
        } else {
            generateFollowUpQuestions(updatedParsing);
        }
    };

    const isValidExpense = (expense: Partial<ParsedExpense>): boolean => {
        console.log('🔍 Validating expense:', JSON.stringify(expense, null, 2));
        
        const validations = {
            amount: typeof expense.amount === 'number' && expense.amount > 0,
            category: typeof expense.category === 'string' && expense.category.length > 0,
            subcategory: typeof expense.subcategory === 'string' && expense.subcategory.length > 0,
            date: typeof expense.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(expense.date),
            note: !expense.note || (typeof expense.note === 'string' && expense.note.length > 0)
        };

        console.log('✅ Validation results:', validations);

        const invalidFields = Object.entries(validations)
            .filter(([_, isValid]) => !isValid)
            .map(([field]) => field);

        if (invalidFields.length > 0) {
            console.log('❌ Invalid expense. Missing or invalid fields:', invalidFields);
            invalidFields.forEach(field => {
                console.log(`Field ${field}:`, {
                    value: expense[field as keyof ParsedExpense],
                    type: typeof expense[field as keyof ParsedExpense]
                });
            });
            return false;
        }

        return true;
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

            // Check if the original input text contains a store name
            const storeMatch = findStoreInText(expense.note || '');
            const note = storeMatch ? storeMatch.storeName : expense.subcategory;

            // Add to Firestore with caching
            const expenseData = {
                amount: expense.amount,
                category: expense.category,
                subcategory: expense.subcategory,
                date: formattedDate,
                note: note || expense.subcategory,
                timestamp: new Date(),
                userId: user.uid,
                currency: 'RON',
                source: 'ai-chat'
            };

            console.log('📝 Saving expense data:', JSON.stringify(expenseData, null, 2));
            await expenseService.addExpense(expenseData);
            console.log('✅ Expense saved successfully');

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
        const textLower = text.toLowerCase();
        const today = new Date();
        
        // Try to match Romanian date format with month names (e.g., "12 iunie" or "12 iunie 2024")
        for (const [monthName, monthNum] of Object.entries(ROMANIAN_MONTHS)) {
            const pattern = new RegExp(`(\\d{1,2})\\s+${monthName}(?:\\s+(\\d{4}))?`, 'i');
            const match = textLower.match(pattern);
            
            if (match) {
                const day = parseInt(match[1]);
                const year = match[2] ? parseInt(match[2]) : today.getFullYear();
                
                // Validate day and create date
                if (day >= 1 && day <= 31) {
                    const date = new Date(year, monthNum - 1, day);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString().split('T')[0];
                    }
                }
            }
        }
        
        // Try different numeric date formats
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

                // Validate date components
                if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
                    const date = new Date(year, month - 1, day);
                    if (!isNaN(date.getTime())) {
                        return date.toISOString().split('T')[0];
                    }
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
                    style={styles.quickRepliesContainer}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.quickRepliesWrapper}>
                        {quickReplies.map((reply, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.quickReplyButton}
                                onPress={() => handleQuickReply(reply)}
                            >
                                <Text style={styles.quickReplyText}>{reply.text}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
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
        maxHeight: 150,
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    quickRepliesWrapper: {
        flexDirection: 'column',
        gap: 8,
    },
    quickReplyButton: {
        backgroundColor: '#fff0e8',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: '#91483C',
        alignSelf: 'flex-start',
    },
    quickReplyText: {
        color: '#91483C',
        fontSize: 14,
        fontWeight: '500',
        fontFamily: 'Fredoka',
    },
    inputContainer: {
        padding: 16,
        backgroundColor: 'transparent',
        borderTopWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    textInput: {
        flex: 1,
        backgroundColor: '#FFF',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
        color: '#5B3A1C',
        fontFamily: 'Fredoka',
        marginRight: 8,
    },
    voiceButton: {
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
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#91483C',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
