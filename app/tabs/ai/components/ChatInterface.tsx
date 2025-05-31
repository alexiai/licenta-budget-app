
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
    ImageBackground,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import categories from '../../../../lib/categories';
import { addDoc, collection } from 'firebase/firestore';
import { auth, db } from '../../../../lib/firebase';
import { romanianToEnglish } from '../../../../lib/translationDictionary';
import { findCategoryByProduct } from '../../../../lib/productAssociation';
import bg from '@assets/bg/AIback.png'; // fundalul principal
import * as ImagePicker from 'expo-image-picker';
import { createWorker } from 'tesseract.js'; // Import Tesseract.js

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

// Enhanced OCR data structures for learning
interface OCRWord {
    text: string;
    confidence: number;
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

interface ReceiptPattern {
    id: string;
    ocrText: string;
    extractedData: {
        amount: number;
        date: string;
        items: Array<{ name: string; price: number }>;
    };
    userCorrections?: {
        originalAmount?: number;
        correctedAmount?: number;
        originalDate?: string;
        correctedDate?: string;
    };
    merchant?: string;
    layout: {
        datePosition?: { x: number; y: number; region: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'middle' };
        totalPosition?: { x: number; y: number };
        itemsRegion?: { startY: number; endY: number };
    };
    timestamp: string;
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
    const [isListening, setIsListening] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentParsing, setCurrentParsing] = useState<Partial<ParsedExpense> | null>(null);
    const [awaitingInput, setAwaitingInput] = useState<string | null>(null);
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
    const [userLanguage, setUserLanguage] = useState<'en' | 'ro'>('en'); // Track user's preferred language


    const scrollViewRef = useRef<ScrollView | null>(null);
    const [recognition, setRecognition] = useState<any>(null);
    const workerRef = useRef<any>(null); // Tesseract worker

    // Receipt learning system
    const [receiptPatterns, setReceiptPatterns] = useState<ReceiptPattern[]>([]);

    useEffect(() => {
        initializeSpeechRecognition();
        loadReceiptPatterns();
        return () => {
            if (recognition) {
                recognition.abort();
            }

            // Terminate Tesseract worker on unmount
            if (workerRef.current) {
                workerRef.current.terminate();
            }
        };
    }, []);

    // Load saved receipt patterns from localStorage
    const loadReceiptPatterns = () => {
        try {
            const savedPatterns = localStorage.getItem('receiptPatterns');
            if (savedPatterns) {
                setReceiptPatterns(JSON.parse(savedPatterns));
                console.log('📚 Loaded receipt patterns:', JSON.parse(savedPatterns).length);
            }
        } catch (error) {
            console.log('Error loading receipt patterns:', error);
        }
    };

    // Save receipt patterns to localStorage
    const saveReceiptPatterns = (patterns: ReceiptPattern[]) => {
        try {
            localStorage.setItem('receiptPatterns', JSON.stringify(patterns));
            console.log('💾 Saved receipt patterns:', patterns.length);
        } catch (error) {
            console.log('Error saving receipt patterns:', error);
        }
    };

    // Find similar receipt patterns based on text similarity
    const findSimilarReceipts = (ocrText: string): ReceiptPattern[] => {
        const textLower = ocrText.toLowerCase();
        const words = textLower.split(/\s+/).filter(w => w.length > 2);

        return receiptPatterns
            .map(pattern => {
                const patternWords = pattern.ocrText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                const commonWords = words.filter(word => patternWords.includes(word));
                const similarity = commonWords.length / Math.max(words.length, patternWords.length);

                return { pattern, similarity };
            })
            .filter(({ similarity }) => similarity > 0.3) // 30% similarity threshold
            .sort((a, b) => b.similarity - a.similarity)
            .map(({ pattern }) => pattern);
    };

    // Detect merchant from OCR text with expanded patterns
    const detectMerchantAdvanced = (text: string): { name: string; type: string; confidence: number } | null => {
        const textLower = text.toLowerCase();
        const merchants = {
            // Supermarkets
            'kaufland': { name: 'Kaufland', type: 'supermarket', patterns: ['kaufland', 'kauf land'] },
            'carrefour': { name: 'Carrefour', type: 'supermarket', patterns: ['carrefour', 'carref', 'carr'] },
            'mega image': { name: 'Mega Image', type: 'supermarket', patterns: ['mega image', 'mega', 'megaimage'] },
            'lidl': { name: 'Lidl', type: 'supermarket', patterns: ['lidl', 'lid l'] },
            'penny': { name: 'Penny Market', type: 'supermarket', patterns: ['penny', 'penny market'] },
            'auchan': { name: 'Auchan', type: 'hypermarket', patterns: ['auchan', 'auch'] },
            'cora': { name: 'Cora', type: 'hypermarket', patterns: ['cora'] },

            // Gas stations
            'petrom': { name: 'Petrom', type: 'gas_station', patterns: ['petrom', 'petr'] },
            'omv': { name: 'OMV', type: 'gas_station', patterns: ['omv', 'o m v'] },
            'lukoil': { name: 'Lukoil', type: 'gas_station', patterns: ['lukoil', 'luk'] },
            'rompetrol': { name: 'Rompetrol', type: 'gas_station', patterns: ['rompetrol', 'romp'] },
            'mol': { name: 'MOL', type: 'gas_station', patterns: ['mol', 'm o l'] },

            // Fast food
            'mcdonald': { name: 'McDonald\'s', type: 'fast_food', patterns: ['mcdonald', 'mcdonalds', 'mc donald'] },
            'kfc': { name: 'KFC', type: 'fast_food', patterns: ['kfc', 'k f c', 'kentucky'] },
            'subway': { name: 'Subway', type: 'fast_food', patterns: ['subway', 'sub way'] },

            // Coffee shops
            'starbucks': { name: 'Starbucks', type: 'coffee_shop', patterns: ['starbucks', 'star bucks'] },
            'costa coffee': { name: 'Costa Coffee', type: 'coffee_shop', patterns: ['costa coffee', 'costa'] },

            // Bakeries and local shops
            'panificatie': { name: 'Bakery', type: 'bakery', patterns: ['panificatie', 'brutarie', 'paine', 'bread'] },
            'patiserie': { name: 'Pastry Shop', type: 'pastry', patterns: ['patiserie', 'cofetarie', 'prajituri'] }
        };

        let bestMatch: { name: string; type: string; confidence: number } | null = null;
        let highestConfidence = 0;

        for (const [key, info] of Object.entries(merchants)) {
            for (const pattern of info.patterns) {
                if (textLower.includes(pattern)) {
                    // Calculate confidence based on pattern length and exact match
                    const confidence = pattern.length >= 4 ? 90 : 70;
                    if (confidence > highestConfidence) {
                        highestConfidence = confidence;
                        bestMatch = { name: info.name, type: info.type, confidence };
                    }
                }
            }
        }

        if (bestMatch) {
            console.log(`🏪 Merchant detected: ${bestMatch.name} (${bestMatch.type}) - confidence: ${bestMatch.confidence}%`);
        }

        return bestMatch;
    };

    // Enhanced spatial analysis using OCR word positions
    const analyzeReceiptLayout = (words: OCRWord[], imageWidth: number, imageHeight: number) => {
        console.log('📐 Analyzing receipt layout with', words.length, 'words');

        const layout = {
            dateRegions: [] as Array<{ word: OCRWord; region: string; confidence: number }>,
            priceRegions: [] as Array<{ word: OCRWord; type: 'item' | 'total'; confidence: number }>,
            itemLines: [] as Array<{ words: OCRWord[]; estimatedPrice?: number }>,
            topSection: [] as OCRWord[],
            bottomSection: [] as OCRWord[],
            rightSection: [] as OCRWord[],
            leftSection: [] as OCRWord[]
        };

        // Define regions
        const topY = imageHeight * 0.25;
        const bottomY = imageHeight * 0.75;
        const rightX = imageWidth * 0.75;
        const leftX = imageWidth * 0.25;

        words.forEach(word => {
            const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
            const centerY = (word.bbox.y0 + word.bbox.y1) / 2;

            // Categorize by regions
            if (centerY < topY) layout.topSection.push(word);
            if (centerY > bottomY) layout.bottomSection.push(word);
            if (centerX > rightX) layout.rightSection.push(word);
            if (centerX < leftX) layout.leftSection.push(word);

            // Look for date patterns with spatial context
            const datePattern = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
            if (datePattern.test(word.text)) {
                let region = 'middle';
                let confidence = 60;

                if (centerY < topY && centerX > rightX) {
                    region = 'top-right';
                    confidence = 95; // High confidence for top-right dates
                } else if (centerY < topY && centerX < leftX) {
                    region = 'top-left';
                    confidence = 80;
                } else if (centerY > bottomY) {
                    region = 'bottom';
                    confidence = 85;
                }

                layout.dateRegions.push({ word, region, confidence });
                console.log(`📅 Found date "${word.text}" in ${region} region (confidence: ${confidence}%)`);
            }

            // Look for price patterns
            const pricePattern = /\d+[.,]\d{2}/;
            if (pricePattern.test(word.text)) {
                const price = parseFloat(word.text.replace(',', '.'));
                if (price > 0 && price < 10000) {
                    // Determine if it's likely a total or item price
                    const isTotal = /total|suma|plata/i.test(
                        words.filter(w =>
                            Math.abs(w.bbox.y0 - word.bbox.y0) < 20 &&
                            w.bbox.x0 < word.bbox.x0
                        ).map(w => w.text).join(' ')
                    );

                    layout.priceRegions.push({
                        word,
                        type: isTotal ? 'total' : 'item',
                        confidence: isTotal ? 90 : 70
                    });
                }
            }
        });

        return layout;
    };

    // Smart date extraction using spatial awareness and patterns
    const extractDateWithSpatialAwareness = (words: OCRWord[], imageWidth: number, imageHeight: number, similarReceipts: ReceiptPattern[]): string | null => {
        const layout = analyzeReceiptLayout(words, imageWidth, imageHeight);

        // Use learned patterns from similar receipts
        if (similarReceipts.length > 0) {
            const preferredRegions = similarReceipts
                .filter(r => r.layout.datePosition)
                .map(r => r.layout.datePosition!.region);

            // Look for dates in preferred regions first
            for (const region of preferredRegions) {
                const dateInRegion = layout.dateRegions.find(d => d.region === region);
                if (dateInRegion) {
                    console.log(`📅 Using learned pattern: found date in ${region} region`);
                    return extractValidDate(dateInRegion.word.text);
                }
            }
        }

        // Sort by confidence and try each date
        const sortedDates = layout.dateRegions.sort((a, b) => b.confidence - a.confidence);
        for (const dateInfo of sortedDates) {
            const validDate = extractValidDate(dateInfo.word.text);
            if (validDate) {
                console.log(`📅 Extracted date from ${dateInfo.region}: ${validDate}`);
                return validDate;
            }
        }

        // Fallback: look for any date pattern in the text
        const allText = words.map(w => w.text).join(' ');
        return extractDateFromReceiptText(allText);
    };

    // Validate and format date
    const extractValidDate = (dateStr: string): string | null => {
        const datePatterns = [
            /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/,
            /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})/,
            /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/
        ];

        for (const pattern of datePatterns) {
            const match = dateStr.match(pattern);
            if (match) {
                let day: number, month: number, year: number;

                if (match[3].length === 4) { // DD/MM/YYYY
                    day = parseInt(match[1]);
                    month = parseInt(match[2]) - 1;
                    year = parseInt(match[3]);
                } else if (match[1].length === 4) { // YYYY/MM/DD
                    year = parseInt(match[1]);
                    month = parseInt(match[2]) - 1;
                    day = parseInt(match[3]);
                } else { // DD/MM/YY
                    day = parseInt(match[1]);
                    month = parseInt(match[2]) - 1;
                    year = parseInt(match[3]) + (parseInt(match[3]) < 50 ? 2000 : 1900);
                }

                // Validate date
                if (day >= 1 && day <= 31 && month >= 0 && month <= 11 && year >= 2000 && year <= 2030) {
                    const date = new Date(year, month, day);
                    if (date.getFullYear() === year && date.getMonth() === month && date.getDate() === day) {
                        // Check if date is reasonable (not future, not too old)
                        const today = new Date();
                        const maxPastDays = 365;
                        const minDate = new Date(today.getTime() - maxPastDays * 24 * 60 * 60 * 1000);

                        if (date >= minDate && date <= today) {
                            return date.toISOString().split('T')[0];
                        }
                    }
                }
            }
        }

        return null;
    };

    // Enhanced amount extraction with spatial intelligence
    const extractAmountWithSpatialAwareness = (words: OCRWord[], text: string, similarReceipts: ReceiptPattern[]): number | null => {
        const layout = analyzeReceiptLayout(words, 1000, 1000); // Normalized dimensions
        const merchant = detectMerchantAdvanced(text);

        console.log('🧾 Smart amount extraction starting...');
        console.log('🏪 Merchant:', merchant?.name || 'Unknown');

        // Strategy 1: Look for explicit total with high confidence
        const totalPrices = layout.priceRegions.filter(p => p.type === 'total');
        if (totalPrices.length > 0) {
            const bestTotal = totalPrices.sort((a, b) => b.confidence - a.confidence)[0];
            const amount = parseFloat(bestTotal.word.text.replace(',', '.'));
            console.log(`💰 Found explicit total: ${amount} RON`);
            return amount;
        }

        // Strategy 2: Use learned patterns from similar receipts
        if (similarReceipts.length > 0) {
            console.log(`📚 Using patterns from ${similarReceipts.length} similar receipts`);
            // Logic to apply learned extraction patterns...
        }

        // Strategy 3: For single-item receipts (like "Paine Alba 6.30")
        const itemPrices = layout.priceRegions.filter(p => p.type === 'item');
        if (itemPrices.length === 1) {
            const amount = parseFloat(itemPrices[0].word.text.replace(',', '.'));
            console.log(`💰 Single item detected: ${amount} RON`);
            return amount;
        }

        // Strategy 4: Smart line analysis for products
        const productLines = extractProductLines(words);
        let totalCalculated = 0;
        let itemCount = 0;

        for (const line of productLines) {
            const lineText = line.words.map(w => w.text).join(' ');
            console.log(`📝 Analyzing line: "${lineText}"`);

            // Skip noise lines
            if (shouldSkipLine(lineText)) {
                console.log(`⏭️ Skipping noise line`);
                continue;
            }

            // Extract price from line
            const price = extractPriceFromLine(lineText);
            if (price && price > 0 && price < 1000) { // Reasonable price range
                console.log(`💰 Found item price: ${price} RON`);
                totalCalculated += price;
                itemCount++;
            }
        }

        if (itemCount > 0) {
            console.log(`📊 Calculated total from ${itemCount} items: ${totalCalculated} RON`);
            return totalCalculated;
        }

        // Strategy 5: Fallback to largest reasonable amount
        const allPrices = layout.priceRegions
            .map(p => parseFloat(p.word.text.replace(',', '.')))
            .filter(p => p > 0 && p < 1000)
            .sort((a, b) => b - a);

        if (allPrices.length > 0) {
            console.log(`💰 Fallback: using largest amount: ${allPrices[0]} RON`);
            return allPrices[0];
        }

        console.log('❌ Could not extract amount');
        return null;
    };

    // Group words into logical lines based on Y coordinates
    const extractProductLines = (words: OCRWord[]): Array<{ words: OCRWord[]; y: number }> => {
        const lines: Array<{ words: OCRWord[]; y: number }> = [];
        const tolerance = 10; // Y-coordinate tolerance for same line

        words.forEach(word => {
            const wordY = word.bbox.y0;
            let addedToLine = false;

            for (const line of lines) {
                if (Math.abs(line.y - wordY) <= tolerance) {
                    line.words.push(word);
                    addedToLine = true;
                    break;
                }
            }

            if (!addedToLine) {
                lines.push({ words: [word], y: wordY });
            }
        });

        // Sort lines by Y position and words by X position within each line
        lines.sort((a, b) => a.y - b.y);
        lines.forEach(line => {
            line.words.sort((a, b) => a.bbox.x0 - b.bbox.x0);
        });

        return lines;
    };

    // Check if a line should be skipped (noise filtering)
    const shouldSkipLine = (lineText: string): boolean => {
        const lowerText = lineText.toLowerCase();
        const skipPatterns = [
            /^[\d\s\-\/\.]{1,15}$/, // Just dates/numbers
            /casier|operator|casa/i,
            /tva|subtotal|total/i,
            /bon fiscal|nr\.|cod/i,
            /multumesc|multumim|thank/i,
            /^[\W]{1,5}$/, // Just symbols
            /adresa|telefon|str\./i,
            /plata|card|numerar/i,
            /rest|change/i
        ];

        return skipPatterns.some(pattern => pattern.test(lowerText)) ||
            lowerText.length < 3 ||
            lowerText.length > 100;
    };

    // Extract price from a product line
    const extractPriceFromLine = (lineText: string): number | null => {
        // Enhanced patterns for Romanian receipts
        const patterns = [
            // "PAINE ALBA 6.30" or "PAINE ALBA     6.30"
            /^(.+?)\s+(\d+[.,]\d{2})\s*$/,
            // "1x6.30 PAINE ALBA" or "PAINE ALBA 1x6.30"
            /(\d+[.,]\d{2})/,
            // "PAINE ALBA 1 x 6.30"
            /x\s*(\d+[.,]\d{2})/
        ];

        for (const pattern of patterns) {
            const match = lineText.match(pattern);
            if (match) {
                const priceStr = match[match.length - 1]; // Last capture group
                const price = parseFloat(priceStr.replace(',', '.'));
                if (price > 0 && price < 1000) {
                    return price;
                }
            }
        }

        return null;
    };

    // Save successful receipt pattern for learning
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
        // Keep only last 50 patterns to avoid storage issues
        if (updatedPatterns.length > 50) {
            updatedPatterns.splice(0, updatedPatterns.length - 50);
        }

        setReceiptPatterns(updatedPatterns);
        saveReceiptPatterns(updatedPatterns);
        console.log('📚 Saved new receipt pattern');
    };

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

        return null;
    };

    const parseExpenseFromText = async (text: string): Promise<ParsedExpense> => {
        const originalText = text;
        let translatedText = text;

        const detectedLang = await detectLanguage(text);
        if (detectedLang === 'ro') {
            translatedText = await translateText(text, 'ro', 'en');
        }

        const result: ParsedExpense = {
            note: originalText,
            confidence: 0,
        };

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

        const combinedText = (originalText + ' ' + translatedText).toLowerCase();

        const relativeDate = parseRelativeDate(combinedText);
        if (relativeDate) {
            result.date = relativeDate;
            result.confidence += 25;
        } else {
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
                        const dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
                        if (dateMatch) {
                            const day = parseInt(dateMatch[1]);
                            const month = parseInt(dateMatch[2]) - 1;
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

        const categoryText = (originalText + ' ' + translatedText).toLowerCase();
        console.log(`🔍 Analyzing text for categories: "${categoryText}"`);

        const productMatch = findCategoryByProduct(categoryText);
        if (productMatch) {
            result.category = productMatch.category;
            result.subcategory = productMatch.subcategory;
            result.confidence += productMatch.confidence;
            console.log(`✅ Product association match: ${productMatch.category} (${productMatch.subcategory}) - confidence: ${productMatch.confidence}%`);
        } else {
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

        console.log(`📊 Parsing result: amount=${result.amount}, category=${result.category}, date=${result.date}, confidence=${result.confidence}`);

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

        // Add bread/bakery specific mappings
        mapping['pâine,bread,paine alba,franzela,chifla'] = { category: 'Food & Drinks', subcategory: 'Groceries' };

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
        const texts = {
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
            expenseSaved: (amount: number, category: string, date: string) =>
                userLanguage === 'ro'
                    ? `✅ Cheltuială salvată cu succes!\n💰 ${amount} RON pentru ${category} în data de ${date}.`
                    : `✅ Expense saved successfully!\n💰 ${amount} RON for ${category} on ${date}.`,
            needMoreInfo: userLanguage === 'ro' ? 'Am nevoie de mai multe informații pentru a salva cheltuiala. Te rog să răspunzi la întrebările de mai jos.' : 'I need more information to save the expense. Please answer the questions below.',
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
            // Handle manual confirmation input (if user types instead of clicking buttons)
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
    // OCR Functions
    const requestCameraPermission = async () => {
        if (Platform.OS === 'web') {
            // Web doesn't need explicit permission requests for file picker
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
            // Web doesn't need explicit permission requests for file picker
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
        } catch (error) {
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
        } catch (error) {
            console.error('Error picking image:', error);
            Alert.alert('Error', `Failed to pick image: ${error.message || 'Unknown error'}`);
        }
    };

    const translateReceiptText = async (text: string): Promise<string> => {
        let translatedText = text.toLowerCase();
        const sortedEntries = Object.entries(romanianToEnglish)
            .sort(([a], [b]) => b.length - a.length);        sortedEntries.forEach(([ro, en]) => {
            const regex = new RegExp(`\\b${ro}\\b`, 'gi');
            if (regex.test(translatedText)) {
                translatedText = translatedText.replace(regex, en);
            }
        });

        return translatedText;
    };

    // Enhanced image preprocessing function
    const preprocessImage = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): HTMLCanvasElement => {
        const width = canvas.width;
        const height = canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        // Step 1: Convert to grayscale using luminance formula
        const grayData = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            grayData[i / 4] = gray;
        }

        // Step 2: Calculate adaptive threshold using Otsu's method
        const histogram = new Array(256).fill(0);
        for (let i = 0; i < grayData.length; i++) {
            histogram[grayData[i]]++;
        }

        let sum = 0;
        for (let i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }

        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let mB, mF, max = 0.0;
        let between = 0.0;
        let threshold1 = 0.0;
        let threshold2 = 0.0;

        for (let i = 0; i < 256; i++) {
            wB += histogram[i];
            if (wB === 0) continue;

            wF = grayData.length - wB;
            if (wF === 0) break;

            sumB += i * histogram[i];
            mB = sumB / wB;
            mF = (sum - sumB) / wF;
            between = wB * wF * (mB - mF) * (mB - mF);

            if (between > max) {
                max = between;
                threshold1 = i;
            }
        }

        // Use Otsu threshold, but ensure it's reasonable for receipts (usually bright)
        const adaptiveThreshold = Math.max(threshold1, 120);

        // Step 3: Apply contrast enhancement before binarization
        const processedData = new Uint8ClampedArray(data.length);
        for (let i = 0; i < grayData.length; i++) {
            const pixelIndex = i * 4;
            let gray = grayData[i];

            // Enhance contrast
            gray = Math.min(255, Math.max(0, (gray - 128) * 1.2 + 128));

            // Apply adaptive binarization
            const binaryValue = gray > adaptiveThreshold ? 255 : 0;

            processedData[pixelIndex] = binaryValue;     // Red
            processedData[pixelIndex + 1] = binaryValue; // Green
            processedData[pixelIndex + 2] = binaryValue; // Blue
            processedData[pixelIndex + 3] = data[pixelIndex + 3]; // Alpha
        }

        // Step 4: Noise removal using morphological operations
        const morphologyData = new Uint8ClampedArray(processedData);
        const kernelSize = 3;
        const halfKernel = Math.floor(kernelSize / 2);

        for (let y = halfKernel; y < height - halfKernel; y++) {
            for (let x = halfKernel; x < width - halfKernel; x++) {
                let minVal = 255, maxVal = 0;

                // Check neighborhood
                for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                    for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                        const neighborIndex = ((y + ky) * width + (x + kx)) * 4;
                        const val = processedData[neighborIndex];
                        minVal = Math.min(minVal, val);
                        maxVal = Math.max(maxVal, val);
                    }
                }

                const currentIndex = (y * width + x) * 4;
                // Apply closing operation (erosion followed by dilation) to remove noise
                const processedValue = (maxVal + minVal) > 255 ? 255 : 0;
                morphologyData[currentIndex] = processedValue;
                morphologyData[currentIndex + 1] = processedValue;
                morphologyData[currentIndex + 2] = processedValue;
            }
        }

        // Apply the processed data back to canvas
        const finalImageData = ctx.createImageData(width, height);
        finalImageData.data.set(morphologyData);
        ctx.putImageData(finalImageData, 0, 0);

        console.log(`📸 Image preprocessed: threshold=${adaptiveThreshold}, size=${width}x${height}`);
        return canvas;
    };

    const extractDateFromReceiptText = (text: string): string | null => {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);

        // Enhanced date patterns for Romanian receipts
        const datePatterns = [
            // DD/MM/YYYY, DD.MM.YYYY, DD-MM-YYYY
            {
                pattern: /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/g,
                format: 'DD/MM/YYYY'
            },
            // DD/MM/YY, DD.MM.YY, DD-MM-YY
            {
                pattern: /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2})/g,
                format: 'DD/MM/YY'
            },
            // YYYY/MM/DD, YYYY.MM.DD, YYYY-MM-DD
            {
                pattern: /(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/g,
                format: 'YYYY/MM/DD'
            },
            // Romanian date with text: "06 FEB 2024" or "06-FEB-2024"
            {
                pattern: /(\d{1,2})[\s\-.]?(ian|feb|mar|apr|mai|iun|iul|aug|sep|oct|nov|dec|january|february|march|april|may|june|july|august|september|october|november|december)[\s\-.]?(\d{2,4})/gi,
                format: 'DD MON YYYY'
            }
        ];

        // Time patterns to help identify date lines
        const timePatterns = [
            /(\d{1,2}):(\d{2}):(\d{2})/g, // HH:MM:SS
            /(\d{1,2}):(\d{2})/g,         // HH:MM
        ];

        // Context words that often appear with dates
        const dateContextWords = ['data', 'date', 'timpul', 'ora', 'time', 'emitere', 'issued'];

        // Search in first few lines, last few lines, and lines with context words
        const searchLines = [
            ...lines.slice(0, 6),  // First 6 lines (header)
            ...lines.slice(-6),    // Last 6 lines (footer)
            ...lines.filter(line =>
                dateContextWords.some(word =>
                    line.toLowerCase().includes(word)
                )
            )
        ];

        const foundDates = [];

        for (const line of searchLines) {
            console.log(`📅 Checking line for date: "${line}"`);

            for (const { pattern, format } of datePatterns) {
                pattern.lastIndex = 0; // Reset regex
                const matches = [...line.matchAll(pattern)];

                for (const match of matches) {
                    const dateStr = match[0];
                    let day, month, year;

                    if (format === 'DD MON YYYY') {
                        // Handle text month format
                        const monthNames = {
                            'ian': 0, 'january': 0,
                            'feb': 1, 'february': 1,
                            'mar': 2, 'march': 2,
                            'apr': 3, 'april': 3,
                            'mai': 4, 'may': 4,
                            'iun': 5, 'june': 5,
                            'iul': 6, 'july': 6,
                            'aug': 7, 'august': 7,
                            'sep': 8, 'september': 8,
                            'oct': 9, 'october': 9,
                            'nov': 10, 'november': 10,
                            'dec': 11, 'december': 11
                        };

                        day = parseInt(match[1]);
                        month = monthNames[match[2].toLowerCase()];
                        year = parseInt(match[3]);

                        if (year < 100) {
                            year += year > 50 ? 1900 : 2000;
                        }
                    } else {
                        const parts = dateStr.split(/[\/\-.]/);

                        if (format === 'YYYY/MM/DD') {
                            year = parseInt(parts[0]);
                            month = parseInt(parts[1]) - 1;
                            day = parseInt(parts[2]);
                        } else { // DD/MM/YYYY or DD/MM/YY
                            day = parseInt(parts[0]);
                            month = parseInt(parts[1]) - 1;
                            year = parseInt(parts[2]);

                            if (year < 100) {
                                // Smart 2-digit year interpretation
                                const currentYear = new Date().getFullYear();
                                year += year <= (currentYear % 100 + 5) ? 2000 : 1900;
                            }
                        }
                    }

                    // Enhanced validation
                    if (day >= 1 && day <= 31 &&
                        month >= 0 && month <= 11 &&
                        year >= 2000 && year <= 2030 &&
                        !isNaN(day) && !isNaN(month) && !isNaN(year)) {

                        const date = new Date(year, month, day);

                        // Validate the date is actually valid (not 31st of February, etc.)
                        if (date.getFullYear() === year &&
                            date.getMonth() === month &&
                            date.getDate() === day) {

                            // Check if date is reasonable (not future, not too old)
                            const today = new Date();
                            today.setHours(23, 59, 59, 999); // End of today
                            const maxPastDays = 365; // 1 year ago
                            const minDate = new Date(today.getTime() - maxPastDays * 24 * 60 * 60 * 1000);

                            if (date >= minDate && date <= today) {
                                const isoDate = date.toISOString().split('T')[0];
                                const hasTime = timePatterns.some(tp => {
                                    tp.lastIndex = 0;
                                    return tp.test(line);
                                });
                                const hasContext = dateContextWords.some(word =>
                                    line.toLowerCase().includes(word)
                                );

                                foundDates.push({
                                    date: isoDate,
                                    line: line,
                                    hasTime,
                                    hasContext,
                                    format: format,
                                    confidence: (hasTime ? 2 : 0) + (hasContext ? 1 : 0)
                                });

                                console.log(`📅 Found potential date: ${isoDate} from "${dateStr}" (${format}) - confidence: ${(hasTime ? 2 : 0) + (hasContext ? 1 : 0)}`);
                            }
                        }
                    }
                }
            }
        }

        // Sort by confidence (prefer dates with time and context)
        foundDates.sort((a, b) => b.confidence - a.confidence);

        if (foundDates.length > 0) {
            const bestDate = foundDates[0];
            console.log(`📅 Extracted date: ${bestDate.date} from line: "${bestDate.line}" (${bestDate.format})`);
            return bestDate.date;
        }

        // If no date found, return today
        console.log('📅 No valid date found in receipt, using today');
        return new Date().toISOString().split('T')[0];
    };

    const processReceiptImage = async (imageUri: string) => {
        // Add receipt sent message
        addMessage('🧾 Receipt image sent', true);
        setIsProcessing(true);

        try {
            console.log('🚀 Starting intelligent OCR processing...');

            // Preprocess image for better OCR
            let processedImageUri = imageUri;
            let imageWidth = 0;
            let imageHeight = 0;

            try {
                // Create canvas for image preprocessing
                const img = new Image();
                img.crossOrigin = 'anonymous';

                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = imageUri;
                });

                imageWidth = img.width;
                imageHeight = img.height;

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                if (ctx) {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    ctx.drawImage(img, 0, 0);

                    // Apply preprocessing
                    preprocessImage(canvas, ctx);
                    processedImageUri = canvas.toDataURL('image/jpeg', 0.9);
                    console.log('📸 Image preprocessed successfully');
                }
            } catch (preprocessError) {
                console.log('⚠️ Image preprocessing failed, using original:', preprocessError);
                processedImageUri = imageUri;
            }

            // Initialize Tesseract worker if not already done
            if (!workerRef.current) {
                console.log('Initializing enhanced Tesseract worker...');
                workerRef.current = await createWorker(['eng', 'ron']);

                // Configure for receipt scanning with enhanced parameters
                await workerRef.current.setParameters({
                    tessedit_pageseg_mode: '6', // Uniform block of text (good for receipts)
                    tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzĂÂÎȘȚăâîșț.,:-+/\\ ()€$',
                    preserve_interword_spaces: '1',
                    tessedit_do_invert: '0',
                    tessedit_write_images: '1'
                });

                console.log('🤖 Enhanced Tesseract worker initialized');
            }

            console.log('🔍 Starting OCR recognition with spatial data...');

            // Get detailed OCR results including word positions
            const { data } = await workerRef.current.recognize(processedImageUri);
            const ocrText = data.text;
            const confidence = data.confidence;
            const words: OCRWord[] = data.words.map((word: any) => ({
                text: word.text,
                confidence: word.confidence,
                bbox: word.bbox
            }));

            console.log(`📝 OCR Results: "${ocrText}" (confidence: ${confidence}%)`);
            console.log(`📊 Extracted ${words.length} words with spatial data`);

            // Find similar receipts for pattern learning
            const similarReceipts = findSimilarReceipts(ocrText);
            console.log(`📚 Found ${similarReceipts.length} similar receipt patterns`);

            // Translate Romanian text to English for better category detection
            const translatedText = await translateReceiptText(ocrText);
            const combinedText = ocrText + ' ' + translatedText;

            // Enhanced extraction using spatial awareness and learning
            const amount = extractAmountWithSpatialAwareness(words, combinedText, similarReceipts);
            const date = extractDateWithSpatialAwareness(words, imageWidth, imageHeight, similarReceipts);

            // Detect category using existing logic
            const categoryMatch = findCategoryByProduct(combinedText.toLowerCase());

            const parsed: ParsedExpense = {
                amount: amount || undefined,
                date: date || undefined,
                category: categoryMatch?.category,
                subcategory: categoryMatch?.subcategory,
                note: 'Receipt scan',
                confidence: categoryMatch?.confidence || 0
            };

            console.log('🎯 Final extraction results:', parsed);

            // Save the receipt pattern for learning (before user confirmation)
            const layout = analyzeReceiptLayout(words, imageWidth, imageHeight);
            const extractedData = {
                amount: amount || 0,
                date: date || new Date().toISOString().split('T')[0],
                items: [] // We could extract items here too
            };

            setCurrentParsing(parsed);

            // Create response message with enhanced details
            let responseMessage = '';
            if (userLanguage === 'ro') {
                responseMessage = `🤖 Am analizat bonul fiscal folosind AI avansat:\n\n`;
                if (amount) responseMessage += `💰 Sumă detectată: ${amount} RON\n`;
                if (date) responseMessage += `📅 Data detectată: ${date}\n`;
                if (categoryMatch?.category) responseMessage += `🗂️ Categorie: ${categoryMatch.category}\n`;
                if (categoryMatch?.subcategory) responseMessage += `📝 Subcategorie: ${categoryMatch.subcategory}\n`;
                if (similarReceipts.length > 0) responseMessage += `📚 Folosind experiență din ${similarReceipts.length} bonuri similare\n`;
                responseMessage += `\n❓ Sunt aceste informații corecte?`;
            } else {
                responseMessage = `🤖 I analyzed the receipt using advanced AI:\n\n`;
                if (amount) responseMessage += `💰 Detected amount: ${amount} RON\n`;
                if (date) responseMessage += `📅 Detected date: ${date}\n`;
                if (categoryMatch?.category) responseMessage += `🗂️ Category: ${categoryMatch.category}\n`;
                if (categoryMatch?.subcategory) responseMessage += `📝 Subcategory: ${categoryMatch.subcategory}\n`;
                if (similarReceipts.length > 0) responseMessage += `📚 Using experience from ${similarReceipts.length} similar receipts\n`;
                responseMessage += `\n❓ Is this information correct?`;
            }

            addMessage(responseMessage, false);
            speakText(responseMessage);

            // Add confirmation buttons with learning capability
            const confirmationReplies: QuickReply[] = [
                {
                    text: userLanguage === 'ro' ? '✅ Da, salvează și învață' : '✅ Yes, save and learn',
                    action: () => {
                        setQuickReplies([]);
                        setAwaitingInput(null);

                        // Save the pattern for future learning
                        saveReceiptPattern(ocrText, extractedData, layout);

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
                            'Te rog să îmi spui valorile corecte pentru ca AI-ul să învețe din această experiență.' :
                            'Please tell me the correct values so the AI can learn from this experience.';
                        addMessage(retryMessage, false);
                        speakText(retryMessage);
                    }
                }
            ];

            setQuickReplies(confirmationReplies);
            setAwaitingInput('confirmation');

        } catch (error) {
            console.error('🚨 Enhanced OCR Error:', {
                message: error?.message,
                stack: error?.stack,
                name: error?.name,
                error: error
            });

            let errorMessage = userLanguage === 'ro' ?
                'Nu am putut procesa imaginea cu AI-ul avansat. Te rog să încerci din nou cu o imagine mai clară.' :
                'Could not process the image with advanced AI. Please try again with a clearer image.';

            // Provide more specific error messages
            if (error?.message) {
                if (error.message.includes('NetworkError') || error.message.includes('network')) {
                    errorMessage = userLanguage === 'ro' ?
                        'Eroare de rețea. Verifică conexiunea la internet și încearcă din nou.' :
                        'Network error. Check your internet connection and try again.';
                } else if (error.message.includes('Worker') || error.message.includes('worker')) {
                    errorMessage = userLanguage === 'ro' ?
                        'Eroare la inițializarea AI-ului OCR. Te rog să reîmprospătezi pagina și să încerci din nou.' :
                        'AI OCR initialization error. Please refresh the page and try again.';
                } else if (error.message.includes('Permission') || error.message.includes('permission')) {
                    errorMessage = userLanguage === 'ro' ?
                        'Nu am permisiuni pentru a accesa camera/fișierele. Verifică setările browserului.' :
                        'No permission to access camera/files. Check browser settings.';
                } else {
                    errorMessage += ` (${error.message})`;
                }
            }

            addMessage(errorMessage, false);
            speakText(errorMessage);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReceiptScan = async () => {
        try {
            if (Platform.OS === 'web') {
                // For web, directly open file picker
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
        } catch (error) {
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

        // Detect and set user language based on input
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

                // Show what was understood and ask for confirmation
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

                // Add confirmation buttons
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
            {/* Enhanced Language Support Banner */}
            <View style={styles.languageBanner}>
                <Text style={styles.languageBannerText}>
                    🤖 Smart Receipt AI • Supports English and Romanian 🇬🇧🇷🇴
                </Text>
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
                        <Text style={styles.processingText}>🧠 AI analizează...</Text>
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
                <TouchableOpacity
                    style={[styles.receiptButton, isProcessing && styles.buttonDisabled]}
                    onPress={() => handleReceiptScan()}
                    disabled={isProcessing}
                >
                    {isProcessing ? (
                        <ActivityIndicator size="small" color="#91483C" />
                    ) : (
                        <Text style={styles.receiptEmoji}>🧾</Text>
                    )}
                </TouchableOpacity>

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
    receiptButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#fff0e8',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    receiptEmoji: {
        fontSize: 20,
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
    buttonDisabled: {
        opacity: 0.6,
    },
});
