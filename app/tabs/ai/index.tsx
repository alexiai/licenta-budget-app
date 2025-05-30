
import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import  categories from '../../../lib/categories';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../../lib/firebase';
import { romanianToEnglish } from '../../../lib/translationDictionary';
import { findCategoryByProduct } from '../../../lib/productAssociation';

interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    isTranslated?: boolean;
    originalText?: string;
}

interface ParsedExpense {
    amount?: number;
    category?: string;
    subcategory?: string;
    date?: string;
    note?: string;
    confidence: number;
}

interface QuickReply {
    text: string;
    action: () => void;
}

export default function AiScreen(): JSX.Element {
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            id: '1',
            text: 'Salut! Sunt asistentul tău pentru cheltuieli. Poți să-mi spui ce ai cheltuit azi, fie vocal, fie prin text. De exemplu: "Am fost la benzinărie și am cheltuit 100 de lei azi."',
            isUser: false,
            timestamp: new Date(),
        },
    ]);

    const [inputText, setInputText] = useState('');
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentParsing, setCurrentParsing] = useState<Partial<ParsedExpense> | null>(null);
    const [awaitingInput, setAwaitingInput] = useState<string | null>(null);
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);

    const scrollViewRef = useRef<ScrollView | null>(null);


    const [recognition, setRecognition] = useState<any>(null);

    useEffect(() => {
        initializeSpeechRecognition();
        return () => {
            if (recognition) {
                recognition.abort();
            }
        };
    }, []);

    const initializeSpeechRecognition = () => {
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (!SpeechRecognition) {
                console.log('Speech Recognition not available in this browser');
                return;
            }

            const recognitionInstance = new SpeechRecognition();
            recognitionInstance.lang = 'ro-RO';
            recognitionInstance.interimResults = false;
            recognitionInstance.maxAlternatives = 1;
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
        // Import the comprehensive translation dictionary
        const { romanianToEnglish } = await import('../../../lib/translationDictionary');

        if (fromLang === toLang) return text;

        try {
            if (fromLang === 'ro' && toLang === 'en') {
                let translatedText = text.toLowerCase();
                const originalText = translatedText;

                // Sort by length (longest first) to avoid partial replacements
                const sortedEntries = Object.entries(romanianToEnglish)
                    .sort(([a], [b]) => b.length - a.length);

                // Replace Romanian words with English equivalents
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

            return text; // Return original if no translation available
        } catch (error) {
            console.log('Translation error:', error);
            return text; // Fallback to original text
        }
    };

    const speakText = (text: string) => {
        Speech.speak(text, {
            language: 'ro-RO',
            pitch: 1,
            rate: 0.9,
        });
    };

    const detectLanguage = async (text: string): Promise<'ro' | 'en'> => {
        const textLower = text.toLowerCase();

        // Check for Romanian diacritics
        const hasRomanianChars = /[ăâîșțĂÂÎȘȚ]/.test(text);

        // Extended Romanian word patterns
        const romanianWords = [
            'am', 'fost', 'cheltuit', 'azi', 'ieri', 'lei', 'pentru', 'și', 'cu', 'la',
            'benzinărie', 'magazin', 'restaurant', 'cafea', 'mâncare', 'băutură',
            'chirie', 'electricitate', 'apă', 'internet', 'haine', 'doctor', 'medicament',
            'plătit', 'cost', 'costa', 'suma', 'bani', 'cheltuială', 'cheltuieli'
        ];

        const hasRomanianWords = romanianWords.some(word => textLower.includes(word));

        // Check for English patterns
        const englishWords = ['spent', 'paid', 'cost', 'bought', 'purchase', 'dollar', 'euro'];
        const hasEnglishWords = englishWords.some(word => textLower.includes(word));

        // If Romanian indicators are present, return Romanian
        if (hasRomanianChars || hasRomanianWords) {
            return 'ro';
        }

        // If English indicators are present and no Romanian, return English
        if (hasEnglishWords) {
            return 'en';
        }

        // Default to Romanian (since this is primarily a Romanian app)
        return 'ro';
    };

    const parseRelativeDate = (text: string): string | null => {
        const combinedText = text.toLowerCase();

        // Enhanced relative date patterns for Romanian and English
        const relativeDatePatterns = [
            // Romanian patterns
            { pattern: /(?:acum\s+)?(\d+)\s+(?:zile|zi)\s+(?:în urmă|inainte)/gi, unit: 'days', multiplier: -1 },
            { pattern: /(?:acum\s+)?(\d+)\s+(?:săptămâni|săptămână)\s+(?:în urmă|inainte)/gi, unit: 'weeks', multiplier: -1 },
            { pattern: /(?:acum\s+)?(\d+)\s+(?:luni|lună)\s+(?:în urmă|inainte)/gi, unit: 'months', multiplier: -1 },
            { pattern: /(?:peste\s+)?(\d+)\s+(?:zile|zi)/gi, unit: 'days', multiplier: 1 },
            { pattern: /(?:peste\s+)?(\d+)\s+(?:săptămâni|săptămână)/gi, unit: 'weeks', multiplier: 1 },

            // English patterns
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

        return null;
    };

    const parseExpenseFromText = async (text: string): Promise<ParsedExpense> => {
        const originalText = text;
        let translatedText = text;

        // Auto-detect language and translate if needed
        const detectedLang = await detectLanguage(text);
        if (detectedLang === 'ro') {
            translatedText = await translateText(text, 'ro', 'en');
        }

        const result: ParsedExpense = {
            note: originalText,
            confidence: 0,
        };

        // Extract amount (supports both Romanian and English formats)
        const amountPatterns = [
            /(\d+(?:[.,]\d{1,2})?)\s*(?:lei|ron|euros?|dollars?|\$|€)/gi,
            /(?:spent|cheltuit|plătit|cost|costa)\s*(\d+(?:[.,]\d{1,2})?)/gi,
            /(\d+(?:[.,]\d{1,2})?)\s*(?:for|pentru)/gi,
        ];

        for (const pattern of amountPatterns) {
            const match = text.match(pattern);
            if (match) {
                const numberMatch = match[0].match(/(\d+(?:[.,]\d{1,2})?)/);
                if (numberMatch) {
                    result.amount = parseFloat(numberMatch[1].replace(',', '.'));
                    result.confidence += 30;
                    break;
                }
            }
        }

        // Enhanced date extraction with relative date support
        const combinedText = (originalText + ' ' + translatedText).toLowerCase();

        // First try relative date parsing
        const relativeDate = parseRelativeDate(combinedText);
        if (relativeDate) {
            result.date = relativeDate;
            result.confidence += 25;
        } else {
            // Then try absolute date patterns
            const absoluteDatePatterns = [
                /(?:azi|today|astăzi)/gi,
                /(?:ieri|yesterday)/gi,
                /(?:alaltăieri|day before yesterday)/gi,
                /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
            ];

            for (const pattern of absoluteDatePatterns) {
                if (pattern.test(text)) {
                    if (/(?:azi|today|astăzi)/gi.test(text)) {
                        result.date = new Date().toISOString().split('T')[0];
                    } else if (/(?:ieri|yesterday)/gi.test(text)) {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        result.date = yesterday.toISOString().split('T')[0];
                    } else if (/(?:alaltăieri|day before yesterday)/gi.test(text)) {
                        const dayBefore = new Date();
                        dayBefore.setDate(dayBefore.getDate() - 2);
                        result.date = dayBefore.toISOString().split('T')[0];
                    } else {
                        // Handle explicit date format (dd/mm/yyyy)
                        const dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
                        if (dateMatch) {
                            const day = parseInt(dateMatch[1]);
                            const month = parseInt(dateMatch[2]) - 1; // JavaScript months are 0-indexed
                            const year = parseInt(dateMatch[3]);
                            const fullYear = year < 100 ? 2000 + year : year;

                            const parsedDate = new Date(fullYear, month, day);
                            if (!isNaN(parsedDate.getTime())) {
                                result.date = parsedDate.toISOString().split('T')[0];
                            }
                        }
                    }
                    result.confidence += 20;
                    break;
                }
            }
        }

        // Smart category and subcategory matching using product associations
        const categoryText = (originalText + ' ' + translatedText).toLowerCase();
        console.log(`🔍 Analyzing text for categories: "${categoryText}"`);

        // Try product associations first (more specific)
        const productMatch = findCategoryByProduct(categoryText);
        if (productMatch) {
            result.category = productMatch.category;
            result.subcategory = productMatch.subcategory;
            result.confidence += productMatch.confidence;
            console.log(`✅ Product association match: ${productMatch.category} (${productMatch.subcategory}) - confidence: ${productMatch.confidence}%`);
        } else {
            // Fallback to manual category mapping
            const categoryMapping = createCategoryMapping();
            for (const [keywords, categoryInfo] of Object.entries(categoryMapping)) {
                const keywordList = keywords.split(',').map(k => k.trim().toLowerCase());
                if (keywordList.some(keyword => categoryText.includes(keyword))) {
                    result.category = categoryInfo.category;
                    result.subcategory = categoryInfo.subcategory;
                    result.confidence += 25;
                    console.log(`✅ Manual mapping match: ${categoryInfo.category} (${categoryInfo.subcategory})`);
                    break;
                }
            }
        }

        // DON'T set a default date - let the follow-up logic handle missing dates
        console.log(`📊 Parsing result: amount=${result.amount}, category=${result.category}, date=${result.date}, confidence=${result.confidence}`);

        return result;
    };

    const createCategoryMapping = () => {
        const mapping: { [key: string]: { category: string; subcategory: string } } = {};

        // Food & Drinks
        mapping['benzinărie,gas,fuel,combustibil,petrol'] = { category: 'Transport', subcategory: 'Gas' };
        mapping['uber,taxi,rideshare,bolt'] = { category: 'Transport', subcategory: 'Taxi' };
        mapping['autobuz,bus,metro,subway,transport public'] = { category: 'Transport', subcategory: 'Public Transport' };

        mapping['magazin,grocery,supermarket,kaufland,carrefour,mega'] = { category: 'Food & Drinks', subcategory: 'Groceries' };
        mapping['restaurant,mâncare,food,dining'] = { category: 'Food & Drinks', subcategory: 'Restaurant' };
        mapping['cafea,coffee,cappuccino,latte,espresso'] = { category: 'Food & Drinks', subcategory: 'Coffee' };
        mapping['băutură,drink,bere,beer,wine,vin'] = { category: 'Food & Drinks', subcategory: 'Drinks' };

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
            questions.push('Cât ai cheltuit? Te rog să specifici suma.');
            setAwaitingInput('amount');
        } else if (!parsed.date) {
            questions.push('Când a avut loc această cheltuială? Poți spune "azi", "ieri", "acum 3 zile" sau o dată specifică.');

            // Add quick date options
            const dateOptions = [
                { text: 'Azi', date: new Date().toISOString().split('T')[0] },
                { text: 'Ieri', date: (() => {
                        const yesterday = new Date();
                        yesterday.setDate(yesterday.getDate() - 1);
                        return yesterday.toISOString().split('T')[0];
                    })() },
                { text: 'Acum 2 zile', date: (() => {
                        const twoDaysAgo = new Date();
                        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
                        return twoDaysAgo.toISOString().split('T')[0];
                    })() },
                { text: 'Acum o săptămână', date: (() => {
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

                        // Check if we have enough info to save now
                        if (updatedParsing.amount && updatedParsing.category && updatedParsing.subcategory) {
                            saveExpense(updatedParsing);
                        } else {
                            // Continue with other missing fields
                            generateFollowUpQuestions(updatedParsing);
                        }
                    }
                });
            });

            setAwaitingInput('date');
        } else if (!parsed.category) {
            questions.push('Pentru ce categorie a fost această cheltuială? Alege una din opțiunile de mai jos:');

            // Add all category options as quick replies
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
        addMessage(`Ai ales ${category}. Ce subcategorie?`, false);

        const replies: QuickReply[] = subcategories.slice(0, 4).map(sub => ({
            text: sub,
            action: () => {
                const updatedParsing = { ...currentParsing, category, subcategory: sub };
                setCurrentParsing(updatedParsing);
                setQuickReplies([]);
                setAwaitingInput(null);

                // Check if we have all required info now
                if (updatedParsing.amount && updatedParsing.category && updatedParsing.subcategory && updatedParsing.date) {
                    saveExpense(updatedParsing);
                } else {
                    // Continue asking for missing info
                    generateFollowUpQuestions(updatedParsing);
                }
            }
        }));

        // Add "General" fallback option
        if (subcategories.length > 4) {
            replies.push({
                text: 'General',
                action: () => {
                    const updatedParsing = { ...currentParsing, category, subcategory: 'General' };
                    setCurrentParsing(updatedParsing);
                    setQuickReplies([]);
                    setAwaitingInput(null);

                    // Check if we have all required info now
                    if (updatedParsing.amount && updatedParsing.category && updatedParsing.subcategory && updatedParsing.date) {
                        saveExpense(updatedParsing);
                    } else {
                        // Continue asking for missing info
                        generateFollowUpQuestions(updatedParsing);
                    }
                }
            });
        }

        setQuickReplies(replies);
        setAwaitingInput('subcategory');
    };

    const handleFollowUpInput = async (input: string) => {
        if (awaitingInput === 'amount') {
            const amountMatch = input.match(/(\d+(?:[.,]\d{1,2})?)/);
            if (amountMatch) {
                const amount = parseFloat(amountMatch[1].replace(',', '.'));
                setCurrentParsing(prev => ({ ...prev, amount }));

                if (currentParsing?.date && currentParsing?.category && currentParsing?.subcategory) {
                    saveExpense({ ...currentParsing, amount });
                } else {
                    // Continue with follow-up questions for missing info
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
            // Try to parse the date input
            const parsedDateInput = await parseExpenseFromText(input);
            if (parsedDateInput.date) {
                setCurrentParsing(prev => ({ ...prev, date: parsedDateInput.date }));
                setAwaitingInput(null);
                setQuickReplies([]);

                // Check if we have enough info to save
                if (currentParsing?.amount && currentParsing?.category && currentParsing?.subcategory) {
                    saveExpense({ ...currentParsing, date: parsedDateInput.date });
                } else {
                    // Continue with follow-up questions for missing info
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
            // Try to find matching category from input
            const inputLower = input.toLowerCase();
            const matchedCategory = categories.find(cat =>
                cat.label.toLowerCase().includes(inputLower) ||
                cat.subcategories.some(sub => sub.toLowerCase().includes(inputLower))
            );

            if (matchedCategory) {
                setCurrentParsing(prev => ({ ...prev, category: matchedCategory.label }));
                askForSubcategory(matchedCategory.label, matchedCategory.subcategories);
            } else {
                // Show all categories as fallback options
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
                    // Show subcategory options as fallback
                    addMessage('Nu am recunoscut subcategoria. Te rog să alegi din opțiunile de mai jos:', false);
                    if (currentParsing?.category) {
                        askForSubcategory(currentParsing.category!, currentCategory.subcategories);
                        speakText('Nu am recunoscut subcategoria. Te rog să alegi din opțiunile afișate.');
                    }

                }
            }
        }
    };

    const saveExpense = async (expense: Partial<ParsedExpense>) => {
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
            // Create proper date string from expense.date
            let dateString = expense.date || new Date().toISOString().split('T')[0];

            // If date is already a full ISO string, extract just the date part
            if (dateString.includes('T')) {
                dateString = dateString.split('T')[0];
            }

            // Create full ISO date for the expense
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
                source: 'ai_assistant'
            };

            await addDoc(collection(db, 'expenses'), expenseData);

            const displayDate = expense.date === new Date().toISOString().split('T')[0] ? 'azi' :
                new Date(dateString).toLocaleDateString('ro-RO');

            const confirmationMessage = `✅ Perfect! Am salvat cheltuiala de ${expense.amount} lei pentru ${expense.category} (${expense.subcategory || 'General'}) din data de ${displayDate}.`;

            addMessage(confirmationMessage, false);
            speakText('Cheltuiala a fost salvată cu succes!');

            // Reset state
            setCurrentParsing(null);
            setAwaitingInput(null);
            setQuickReplies([]);

            console.log('💾 Expense saved successfully:', expenseData);
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
        addMessage(textToSend, true);
        setInputText('');
        setQuickReplies([]);

        try {
            if (awaitingInput) {
                await handleFollowUpInput(textToSend);
            } else {
                const parsed = await parseExpenseFromText(textToSend);
                setCurrentParsing(parsed);

                // Check if we have all required information
                if (parsed.amount && parsed.category && parsed.subcategory && parsed.date) {
                    // We have everything, save directly
                    saveExpense(parsed);
                } else {
                    // Ask for missing information
                    if (!generateFollowUpQuestions(parsed)) {
                        addMessage('Nu am putut înțelege cheltuiala. Poți să reformulezi? De exemplu: "Am cheltuit 50 lei pe cafea azi"', false);
                        speakText('Nu am putut înțelege cheltuiala. Poți să reformulezi?');
                    }
                }
            }
        } catch (error) {
            console.log('Error processing message:', error);
            addMessage('A apărut o eroare. Te rog să încerci din nou.', false);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleQuickReply = (reply: QuickReply) => {
        addMessage(reply.text, true);
        reply.action();
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🎙️ Asistent Cheltuieli</Text>
                <Text style={styles.subtitle}>Vorbește sau scrie în română</Text>
            </View>

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
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefaf6',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        alignItems: 'center',
        backgroundColor: '#fff0e8',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
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
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 1 },
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
        flexDirection: 'row',
        padding: 16,
        backgroundColor: 'white',
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        fontSize: 16,
        maxHeight: 100,
        marginRight: 8,
    },
    voiceButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff0e8',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
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
