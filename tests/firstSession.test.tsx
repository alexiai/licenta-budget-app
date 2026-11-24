import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { Alert, NativeModules, Text, TextInput, TouchableOpacity } from 'react-native';
import DropDownPicker from 'react-native-dropdown-picker';
import { Calendar } from 'react-native-calendars';
import { PieChart } from 'react-native-chart-kit';
import Welcome from '../app/welcome';
import Signup from '../app/auth/signup';
import Login from '../app/auth/login';
import BudgetOnboarding from '../components/budget/BudgetOnboarding';
import BudgetScreen from '../app/tabs/budget';
import AddExpense from '../app/tabs/expenses/add';
import EditExpense from '../app/tabs/expenses/edit';
import OverviewList from '../app/tabs/overview/list';
import OverviewCalendar from '../app/tabs/overview/calendar';
import OverviewChart from '../app/tabs/overview/chart';
import BunnyAssistant from '../app/tabs/ai';
import Profile from '../app/tabs/profile';
import OCRUpload from '../app/tabs/ai/chatbox/ocr';
import ReceiptScanner from '../components/bunnyAssistant/ReceiptScanner';
import axios from 'axios';
import Chat from '../components/bunnyAssistant/ChatInterface';
import { OCRProvider } from '../components/bunnyAssistant/context/OCRContext';
import QuestService from '../lib/services/QuestService';
import { generateSpendingAnalysis } from '../components/bunnyAssistant/analysisUtils';

const mockRecords = new Map<string, Record<string, unknown>>();
const mockPrefs = new Map<string, string>();
const mockAuth = { currentUser: null as { uid: string; email: string } | null };
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: () => false, navigate: jest.fn(), dismissTo: jest.fn() };
let mockSequence = 0;
let mockExpenseId = '';
const mockSnapshot = (path: string) => ({ id: path.split('/').pop(), exists: () => mockRecords.has(path), data: () => mockRecords.get(path) });
const mockDocuments = (spec: string | { collection: string; filters: [string, string][] }) => {
    const collection = typeof spec === 'string' ? spec : spec.collection;
    const filters = typeof spec === 'string' ? [] : spec.filters;
    const docs = [...mockRecords].filter(([path, data]) => path.startsWith(collection + '/')
        && filters.every(([field, value]) => data[field] === value)).map(([path]) => mockSnapshot(path));
    return { docs, empty: docs.length === 0, metadata: { fromCache: false } };
};

jest.mock('expo-router', () => ({
    useRouter: () => mockRouter,
    usePathname: () => '/tabs/overview/list',
    useLocalSearchParams: () => ({ expenseId: mockExpenseId }),
    useFocusEffect: (callback: () => void) => require('react').useEffect(callback, [callback]),
    Link: ({ children }: { children: unknown }) => children,
}));
jest.mock('../app/_layout', () => ({ useAuth: () => ({ user: mockAuth.currentUser, authChecked: true }) }));
jest.mock('@lib/firebase', () => ({ get auth() { return mockAuth; }, db: {}, firebaseConfigured: true }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null, Feather: () => null }));
jest.mock('react-native-dropdown-picker', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-chart-kit', () => ({ PieChart: () => null }));
jest.mock('react-native-calendars', () => ({ Calendar: () => null }));
jest.mock('react-native-draggable-flatlist', () => ({ __esModule: true, default: () => null }));
jest.mock('expo-linear-gradient', () => ({ LinearGradient: ({ children }: { children: unknown }) => children }));
jest.mock('@react-native-voice/voice', () => ({
    __esModule: true, default: {
        start: jest.fn(async () => {}), stop: jest.fn(async () => {}), destroy: jest.fn(async () => {}),
    },
}));
jest.mock('expo-document-picker', () => ({
    getDocumentAsync: async () => ({
        canceled: false, assets: [{ uri: 'file:///fixture-receipt.jpg', name: 'fixture-receipt.jpg', mimeType: 'image/jpeg' }],
    }),
}));
jest.mock('expo-image-picker', () => ({}));
jest.mock('axios', () => ({
    post: jest.fn(async () => ({ data: { receipts: [{ total: '10.00', date: '2026-11-24', currency: 'RON', merchant_name: 'Lidl' }] } })),
    isAxiosError: () => false,
}));
jest.mock('expo-speech', () => ({ speak: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: async (key: string) => mockPrefs.get(key) ?? null,
    setItem: async (key: string, value: string) => { mockPrefs.set(key, value); },
    removeItem: async (key: string) => { mockPrefs.delete(key); },
}));
jest.mock('firebase/auth', () => ({
    createUserWithEmailAndPassword: async (_: unknown, email: string) => {
        mockAuth.currentUser = { uid: 'journey-bunny', email };
        return { user: mockAuth.currentUser };
    },
    signInWithEmailAndPassword: async (_: unknown, email: string) => {
        mockAuth.currentUser = { uid: 'journey-bunny', email };
        return { user: mockAuth.currentUser };
    },
}));
jest.mock('firebase/firestore', () => ({
    collection: (_: unknown, name: string) => name,
    doc: (first: string | object, second?: string, third?: string) => {
        const collection = typeof first === 'string' ? first : second;
        const id = (typeof first === 'string' ? second : third) ?? 'doc-' + ++mockSequence;
        return { id, toString: () => collection + '/' + id };
    },
    where: (field: string, _: string, value: string) => [field, value],
    query: (collection: string, ...filters: [string, string][]) => ({ collection, filters }),
    getDoc: async (path: string) => mockSnapshot(String(path)),
    getDocs: async (spec: string) => mockDocuments(spec),
    onSnapshot: (spec: string, receive: (data: unknown) => void) => {
        receive(String(spec).includes('/') ? mockSnapshot(String(spec)) : mockDocuments(spec));
        return () => {};
    },
    setDoc: async (path: string, data: Record<string, unknown>) => { mockRecords.set(String(path), data); },
    addDoc: async (collection: string, data: Record<string, unknown>) => {
        const id = 'doc-' + ++mockSequence;
        mockRecords.set(collection + '/' + id, data);
        return { id };
    },
    updateDoc: async (path: string, data: Record<string, unknown>) => { mockRecords.set(String(path), { ...mockRecords.get(String(path)), ...data }); },
    deleteDoc: async (path: string) => { mockRecords.delete(String(path)); },
    Timestamp: { now: () => new Date() },
    runTransaction: async (_: unknown, work: (tx: Record<string, unknown>) => Promise<unknown>) => {
        const changes = new Map<string, Record<string, unknown>>();
        const result = await work({
            get: async (path: string) => mockSnapshot(String(path)),
            set: (path: string, data: Record<string, unknown>) => changes.set(String(path), data),
            update: (path: string, data: Record<string, unknown>) => changes.set(String(path), { ...mockRecords.get(String(path)), ...data }),
        });
        for (const [path, data] of changes) mockRecords.set(String(path), data);
        return result;
    },
}));

const savedNativeVoice = NativeModules.Voice;
let screen: ReactTestRenderer | undefined;
const show = async (element: React.ReactElement) => {
    await act(async () => {
        screen?.unmount();
        screen = create(element);
    });
};
const type = (placeholder: string | RegExp, value: string) => {
    const field = screen!.root.findAllByType(TextInput).find(item =>
        typeof placeholder === 'string' ? item.props.placeholder === placeholder : placeholder.test(item.props.placeholder ?? ''));
    if (!field) throw new Error('Field not found: ' + placeholder);
    act(() => { field.props.onChangeText(value); });
};
const tap = async (label: string) => {
    const button = screen!.root.findAllByType(TouchableOpacity).find(item =>
        item.props.accessibilityLabel === label || item.findAll(node => node.props.children === label).length > 0);
    if (!button) throw new Error('Button missing: ' + label);
    await act(async () => { await button.props.onPress(); });
};
const rendered = () => screen!.root.findAllByType(Text).map(node =>
    [node.props.children].flat(Infinity).filter(value => typeof value === 'string' || typeof value === 'number').join('')
).join('\n');
const expenses = () => [...mockRecords].filter(([path]) => path.startsWith('expenses/'))
    .map(([path, entry]) => ({ ...entry, id: path.split('/')[1] })) as Parameters<typeof generateSpendingAnalysis>[0];

afterEach(() => {
    act(() => screen?.unmount());
    screen = undefined;
    jest.useRealTimers();
    jest.restoreAllMocks();
    Reflect.deleteProperty(globalThis, 'alert');
    NativeModules.Voice = savedNativeVoice;
});

test('first-session walkthrough reaches spending views, tips, a claimed quest and the profile badge', async () => {
    jest.useFakeTimers({ doNotFake: ['setImmediate'] }).setSystemTime(new Date(2026, 10, 24, 12));
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const alert = jest.fn();
    Object.defineProperty(globalThis, 'alert', { value: alert, configurable: true });
    await show(<Welcome />);
    await tap('Get Started');
    expect(mockRouter.push).toHaveBeenLastCalledWith('/auth/login');

    await show(<Signup />);
    type('First Name', 'Test');
    type('Last Name', 'Bunny');
    type('Email', 'bunny@example.test');
    type('Password', 'Fixture1!');
    await tap('SIGN UP');
    expect(mockRecords.get('users/journey-bunny')).toMatchObject({ name: 'Test', surname: 'Bunny' });
    expect(mockRouter.replace).toHaveBeenLastCalledWith('/auth/login');

    await show(<Login />);
    type('Email', 'bunny@example.test');
    type('Password', 'Fixture1!');
    await tap('LOG IN');
    expect(mockRouter.replace).toHaveBeenLastCalledWith('/tabs/budget/onboarding');

    await show(<BudgetOnboarding />);
    type('e.g. Monthly Budget', 'November Burrow');
    await tap('Next');
    type('0', '1000');
    await tap('Next');
    await tap('Food & Drinks');
    type('Groceries', '150');
    await tap('Next');
    await tap('Save Budget');
    const budgetId = mockPrefs.get('selectedBudget')!;
    const budget = mockRecords.get('budgets/' + budgetId);
    expect(budget).toMatchObject({
        name: 'November Burrow', period: 'monthly', amount: 1000,
        categories: [{ name: 'Food & Drinks', subcategories: [{ name: 'Groceries', amount: '150' }] }],
    });
    expect(mockRouter.replace).toHaveBeenLastCalledWith('/tabs/budget');
    const baseline = generateSpendingAnalysis([], new Date());
    const [daily] = await QuestService.generateQuests('journey-bunny', baseline, []);

    await show(<AddExpense />);
    type(/How many/, '27');
    const category = screen!.root.findByType(DropDownPicker);
    act(() => { category.props.setValue(() => 'Food & Drinks'); });
    await tap('Groceries');
    await tap('Save Bunnyspense 🐾');
    mockExpenseId = expenses()[0].id;
    expect(expenses()[0]).toMatchObject({ amount: 27, subcategory: 'Groceries', budgetId });

    await show(<EditExpense />);
    type(/How many/, '30');
    const saveEdit = screen!.root.findAllByType(TouchableOpacity).find(button =>
        button.findAll(node => typeof node.props.children === 'string' && /update|save/i.test(node.props.children)).length);
    expect(saveEdit).toBeDefined();
    await act(async () => { await saveEdit!.props.onPress(); });
    expect(expenses()[0].amount).toBe(30);
    expect(alert).toHaveBeenCalled();

    NativeModules.Voice = {};
    await show(<OCRProvider><Chat /><OCRUpload /></OCRProvider>);
    type(/Type an expense/, 'Spent 25 RON on a taxi today');
    await tap('Send expense message');
    expect(expenses()).toHaveLength(1);
    await tap('Save expense');
    type(/Type an expense/, 'Am plătit 35 lei pe cafea azi');
    await tap('Send expense message');
    await tap('Salvează');
    expect(expenses()).toHaveLength(3);
    expect(expenses().reduce((sum, entry) => sum + entry.amount, 0)).toBe(90);

    const voice = require('@react-native-voice/voice').default;
    await tap('Start recording');
    expect(voice.start).toHaveBeenCalledWith('ro-RO');
    act(() => {
        voice.onSpeechStart();
        voice.onSpeechResults({ value: ['Am plătit douăzeci de lei pe cafea azi'] });
        voice.onSpeechEnd();
    });
    expect(expenses()).toHaveLength(3);
    await tap('Send expense message');
    await tap('Salvează');
    expect(expenses()).toHaveLength(4);

    const scanner = screen!.root.findByType(ReceiptScanner);
    const upload = scanner.findAllByType(TouchableOpacity)[0];
    await act(async () => { upload.props.onPress(); });
    expect(axios.post).toHaveBeenCalledWith(expect.stringContaining('/api/ocr'), expect.anything(), expect.anything());
    expect(mockRouter.dismissTo).toHaveBeenCalledWith('/tabs/ai/chatbox');
    expect(expenses()).toHaveLength(4);
    await tap('Salvează');
    expect(expenses()).toHaveLength(5);
    expect(expenses().reduce((sum, entry) => sum + entry.amount, 0)).toBe(120);

    await show(<BudgetScreen />);
    expect(rendered()).toContain('880.00');
    await show(<OverviewList />);
    expect(rendered()).toContain('Groceries');
    expect(rendered()).toContain('Taxi');
    await show(<OverviewChart />);
    const chart = screen!.root.findByType(PieChart);
    expect(chart.props.data).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'Food & Drinks', value: 95 }),
        expect.objectContaining({ name: 'Transport', value: 25 }),
    ]));
    await show(<OverviewCalendar />);
    expect(screen!.root.findByType(Calendar).props.markedDates['2026-11-24']).toBeDefined();

    await show(<BunnyAssistant />);
    expect(rendered()).toContain('Review Food & Drinks spending');
    act(() => { jest.setSystemTime(new Date(2026, 10, 25, 12)); });
    await show(<BunnyAssistant />);
    await tap('Quests');
    await tap('Claim Reward');
    const progress = await QuestService.getUserProgress('journey-bunny');
    expect(progress).toMatchObject({ totalPoints: 50, completedQuests: [daily.id], badges: [{ name: 'First Hop' }] });

    await show(<Profile />);
    expect(rendered()).toContain('First Hop');
    expect(rendered()).toContain('bunny@example.test');
    await tap('Connect Bank Account');
    expect(mockRouter.push).toHaveBeenLastCalledWith('/bank-connect');
}, 30_000);
