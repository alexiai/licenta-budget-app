import { classifyExpenseText, detectExpenseLanguage, parseChatExpense, type ChatLanguage } from '@lib/utils/chatExpense';
import { extractExpenseAmount, extractExpenseDate } from '@lib/utils/chatExpenseParsing';
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
    NativeModules,
    Platform,
    ImageBackground,
    Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import categories from '../../lib/categories';
import { auth } from '../../lib/firebase';
import type { ReceiptContext } from '../../lib/productAssociation';
import bg from '@assets/bg/AIback.png'; // fundalul principal
import { useRouter } from 'expo-router';
import { useOCR } from './context/OCRContext';
import expenseService from '../../lib/services/ExpenseService';
import { toISODateString, parseExpenseDate } from '@lib/utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';



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

type ExpenseField = 'amount' | 'date' | 'category' | 'subcategory';

interface QuickReply {
    text: string;
    action: () => void | Promise<void>;
}

const generateUniqueId = () => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export default function ChatInterface(): JSX.Element {
    const router = useRouter();
    const { ocrData, setOCRData } = useOCR();

    const STORAGE_KEY = `ai_chat_messages_${auth.currentUser?.uid ?? 'guest'}`;
    const [historyLoaded, setHistoryLoaded] = useState(false);
    const activeVoiceLocale = useRef<'ro-RO' | 'en-US'>('ro-RO');
    const [voiceLocale, setVoiceLocale] = useState<'ro-RO' | 'en-US'>('ro-RO');

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
    const [awaitingInput, setAwaitingInput] = useState<ExpenseField | null>(null);
    const [quickReplies, setQuickReplies] = useState<QuickReply[]>([]);
    const [userLanguage, setUserLanguage] = useState<'en' | 'ro'>('en'); // Track user's preferred language

    const recentReceipts = useRef<ReceiptContext[]>([]);
    const savingExpense = useRef(false);
    const scrollViewRef = useRef<ScrollView | null>(null);
    const [recognition, setRecognition] = useState<any>(null);

    // Load messages from AsyncStorage on mount
    useEffect(() => {
        (async () => {
            try {
                const stored = await AsyncStorage.getItem(STORAGE_KEY);
                if (stored) {
                    const parsed = JSON.parse(stored);
                    // Convert timestamp strings back to Date objects
                    setMessages(parsed.map((msg: any) => ({ ...msg, timestamp: new Date(msg.timestamp) })));
                }
            } catch (e) {
                // Ignore storage errors and keep the greeting.
            } finally {
                setHistoryLoaded(true);
            }
        })();
    }, [STORAGE_KEY]);

    // Save messages to AsyncStorage whenever they change
    useEffect(() => {
        if (!historyLoaded) return;
        (async () => {
            try {
                await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
            } catch (e) {
                // Ignore errors
            }
        })();
    }, [messages, historyLoaded, STORAGE_KEY]);

    // Initialize Speech Recognition on mount
    useEffect(() => {
        return initializeSpeechRecognition();
    }, []);

    // Handle OCR data when it changes
    useEffect(() => {
        if (historyLoaded && ocrData) {
            recentReceipts.current = [
                { timestamp: new Date(), category: ocrData.category, subcategory: ocrData.subcategory },
                ...recentReceipts.current,
            ].slice(0, 10);
            reviewExpense(ocrData, userLanguage);

            // Clear OCR data
            setOCRData(null);
        }
    }, [historyLoaded, ocrData]);

    const initializeSpeechRecognition = () => {
        if (Platform.OS !== 'web') {
            if (!NativeModules.Voice) return;
            const voice = require('@react-native-voice/voice').default as typeof import('@react-native-voice/voice').default;
            voice.onSpeechStart = () => setIsListening(true);
            voice.onSpeechEnd = () => setIsListening(false);
            voice.onSpeechResults = event => {
                const transcript = event.value?.[0]?.trim();
                if (transcript) setInputText(transcript);
            };
            voice.onSpeechError = () => {
                setIsListening(false);
                showVoiceProblem();
            };
            setRecognition({ start: (locale: string) => voice.start(locale), stop: () => voice.stop() });
            return () => { void voice.destroy().catch(() => {}); };
        }
        if (typeof window === 'undefined') return;
        try {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

            if (!SpeechRecognition) {
                return;
            }

            const recognitionInstance = new SpeechRecognition();
            // Start with Romanian but we'll detect language from input
            recognitionInstance.lang = 'ro-RO';
            recognitionInstance.interimResults = false;
            recognitionInstance.maxAlternatives = 3; // Get multiple alternatives to help with detection
            recognitionInstance.continuous = false;

            recognitionInstance.onstart = () => {
                setIsListening(true);
            };

            recognitionInstance.onresult = (event: any) => {
                const result = event.results?.[event.resultIndex ?? 0];
                const transcript = result?.[0]?.transcript?.trim();
                if (transcript && result.isFinal !== false) setInputText(transcript);
            };

            recognitionInstance.onerror = (event: any) => {
                setIsListening(false);

                showVoiceProblem(event.error);
            };

            recognitionInstance.onend = () => {
                setIsListening(false);
            };

            setRecognition({
                start: (locale: string) => {
                    recognitionInstance.lang = locale;
                    recognitionInstance.start();
                },
                stop: () => recognitionInstance.stop(),
            });
            return () => {
                recognitionInstance.onresult = null;
                recognitionInstance.onstart = null;
                recognitionInstance.onend = null;
                recognitionInstance.onerror = null;
                recognitionInstance.abort();
            };
        } catch (error) {
        }
    };

    const checkSpeechRecognitionSupport = (): boolean => {
        if (Platform.OS !== 'web') return Boolean(NativeModules.Voice);
        if (typeof window === 'undefined') return false;
        return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
    };

    function showVoiceProblem(error?: string) {
        const messages: Record<string, [string, string]> = {
            network: ['Check your network connection and try again.', 'Verifică internetul și încearcă din nou.'],
            'not-allowed': ['Allow microphone access and try again.', 'Permite accesul la microfon și încearcă din nou.'],
            'no-speech': ['No speech was detected. Try again.', 'Nu am detectat voce. Încearcă din nou.'],
        };
        const [en, ro] = messages[error ?? ''] ?? [
            'Could not recognise speech. Check your microphone and try again.',
            'Nu am putut recunoaște vocea. Verifică microfonul și încearcă din nou.',
        ];
        const romanian = activeVoiceLocale.current === 'ro-RO';
        Alert.alert(romanian ? 'Intrare vocală' : 'Voice input', romanian ? ro : en);
    }

    const startListening = async () => {
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

        activeVoiceLocale.current = voiceLocale;
        try {
            await recognition.start(voiceLocale);
        } catch (error) {
            setIsListening(false);
            showVoiceProblem('not-allowed');
        }
    };

    const stopListening = async () => {
        if (recognition && isListening) {
            try {
                await recognition.stop();
            } catch (error) {
            }
        }
    };

    const addMessage = (text: string, isUser = false) => {
        setMessages(previous => [...previous, { id: generateUniqueId(), text, isUser, timestamp: new Date() }]);
        scrollViewRef.current?.scrollToEnd({ animated: true });
    };

    const say = (text: string, language: ChatLanguage) => {
        Speech.speak(text, { language: language === 'ro' ? 'ro-RO' : 'en-US', pitch: 1, rate: 0.85 });
    };

    const ask = (draft: ExpenseInput, field: ExpenseField, language: ChatLanguage, message: string, replies: QuickReply[] = []) => {
        setCurrentParsing(draft);
        setAwaitingInput(field);
        setQuickReplies(replies);
        addMessage(message);
        say(message, language);
    };

    const saveExpense = async (expense: ParsedExpense, language: ChatLanguage) => {
        if (savingExpense.current) return;
        const user = auth.currentUser;
        if (!user) {
            addMessage(language === 'ro' ? 'Autentifică-te pentru a salva cheltuiala.' : 'Sign in to save the expense.');
            return;
        }
        savingExpense.current = true;
        setIsProcessing(true);
        try {
            await expenseService.addExpense({
                ...expense, userId: user.uid, timestamp: new Date(), currency: 'RON', source: 'ai-chat',
            });
            const message = language === 'ro' ? 'Cheltuiala a fost salvată.' : 'Expense saved.';
            addMessage(message);
            say(message, language);
            setQuickReplies([]);
            setCurrentParsing(null);
            setAwaitingInput(null);
        } catch {
            addMessage(language === 'ro' ? 'Salvarea a eșuat. Încearcă din nou.' : 'Saving failed. Please try again.');
        } finally {
            savingExpense.current = false;
            setIsProcessing(false);
        }
    };

    function reviewExpense(draft: ExpenseInput, language: ChatLanguage) {
        const ro = language === 'ro';
        if (!draft.amount) {
            ask(draft, 'amount', language, ro ? 'Cât ai plătit? Scrie o singură sumă în lei.' : 'How much did you pay? Enter one amount in RON.');
            return;
        }
        if (!draft.date || !parseExpenseDate(draft.date) || draft.date > toISODateString(new Date())) {
            ask(draft, 'date', language, ro ? 'Când a fost cheltuiala? Spune „azi”, „ieri” sau scrie data.' : 'When was the expense? Say “today,” “yesterday,” or enter the date.');
            return;
        }
        if (!draft.category) {
            ask(draft, 'category', language, ro ? 'Alege categoria.' : 'Choose a category.', categories.map(category => ({
                text: category.label,
                action: () => reviewExpense({ ...draft, category: category.label, subcategory: undefined }, language),
            })));
            return;
        }
        if (!draft.subcategory) {
            const options = categories.find(category => category.label === draft.category)?.subcategories ?? ['Miscellaneous'];
            ask(draft, 'subcategory', language, ro ? 'Alege subcategoria.' : 'Choose a subcategory.', options.map(subcategory => ({
                text: subcategory,
                action: () => reviewExpense({ ...draft, subcategory }, language),
            })));
            return;
        }

        const expense: ParsedExpense = {
            amount: draft.amount, date: draft.date, category: draft.category,
            subcategory: draft.subcategory, note: draft.note || 'Chatbox',
        };
        setCurrentParsing(expense);
        setAwaitingInput(null);
        addMessage(ro
            ? `Verifică înainte să salvezi:\n${expense.amount.toFixed(2)} RON · ${expense.category} / ${expense.subcategory} · ${expense.date}`
            : `Review before saving:\n${expense.amount.toFixed(2)} RON · ${expense.category} / ${expense.subcategory} · ${expense.date}`);
        setQuickReplies([
            { text: ro ? 'Salvează' : 'Save expense', action: () => saveExpense(expense, language) },
            { text: ro ? 'Schimbă suma' : 'Change amount', action: () => reviewExpense({ ...expense, amount: undefined }, language) },
            { text: ro ? 'Schimbă data' : 'Change date', action: () => reviewExpense({ ...expense, date: undefined }, language) },
            { text: ro ? 'Schimbă categoria' : 'Change category', action: () => reviewExpense({ ...expense, category: undefined }, language) },
            { text: ro ? 'Renunță' : 'Discard', action: () => {
                setCurrentParsing(null);
                setAwaitingInput(null);
                setQuickReplies([]);
            } },
        ]);
    }

    const handleSendMessage = () => {
        const text = inputText.trim();
        if (!historyLoaded || savingExpense.current || !text) return;
        setInputText('');
        if (text.toUpperCase() === 'CLEAR') {
            setMessages([]);
            setQuickReplies([]);
            setCurrentParsing(null);
            setAwaitingInput(null);
            return;
        }
        const language = detectExpenseLanguage(text, userLanguage);
        setUserLanguage(language);
        addMessage(text, true);
        const draft = currentParsing;
        if (draft && awaitingInput === 'amount') {
            reviewExpense({ ...draft, amount: extractExpenseAmount(text) }, language);
        } else if (draft && awaitingInput === 'date') {
            reviewExpense({ ...draft, date: extractExpenseDate(text) ?? undefined }, language);
        } else if (draft && awaitingInput === 'category') {
            const match = classifyExpenseText(text);
            const category = categories.find(item => item.label.toLowerCase() === text.toLowerCase());
            reviewExpense({ ...draft, category: category?.label ?? match?.category, subcategory: category ? undefined : match?.subcategory }, language);
        } else if (draft && awaitingInput === 'subcategory') {
            const options = categories.find(category => category.label === draft.category)?.subcategories ?? [];
            const match = classifyExpenseText(text);
            const subcategory = options.find(option => option.toLowerCase() === text.toLowerCase())
                ?? (match?.category === draft.category ? match?.subcategory : undefined);
            reviewExpense({ ...draft, subcategory }, language);
        } else {
            reviewExpense(parseChatExpense(text, new Date(), recentReceipts.current), language);
        }
    };

    const handleQuickReply = (reply: QuickReply) => {
        if (savingExpense.current) return;
        addMessage(reply.text, true);
        return reply.action();
    };

    const handleOCRNavigation = useCallback(() => {
        router.navigate('/tabs/ai/chatbox/ocr');
    }, [router]);

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
                                disabled={isProcessing}
                                onPress={() => handleQuickReply(reply)}
                            >
                                <Text style={styles.quickReplyText}>{reply.text}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}

            {checkSpeechRecognitionSupport() && (
                <TouchableOpacity
                    accessibilityLabel="Switch speech recognition language"
                    onPress={() => setVoiceLocale(locale => locale === 'ro-RO' ? 'en-US' : 'ro-RO')}
                    disabled={isListening}
                >
                    <Text>{voiceLocale === 'ro-RO' ? 'Voice: Romanian' : 'Voice: English'}</Text>
                </TouchableOpacity>
            )}
            <View style={styles.inputContainer}>
                <TextInput
                    style={styles.textInput}
                    value={inputText}
                    onChangeText={setInputText}
                    accessibilityLabel="Expense message"
                    placeholder={userLanguage === 'ro' ? 'Scrie mesajul tău aici...' : 'Type an expense…'}
                    placeholderTextColor="#999"
                    multiline
                    onSubmitEditing={() => handleSendMessage()}
                />
                <TouchableOpacity
                    style={[
                        styles.voiceButton,
                        !checkSpeechRecognitionSupport() && styles.voiceButtonDisabled
                    ]}
                    accessibilityLabel={isListening ? "Stop recording" : "Start recording"}
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
                    accessibilityLabel="Send expense message"
                    disabled={!historyLoaded || isProcessing || !inputText.trim()}
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
        maxHeight: 70,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    quickRepliesWrapper: {
        flexDirection: 'row',
        flexWrap: 'wrap',
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
