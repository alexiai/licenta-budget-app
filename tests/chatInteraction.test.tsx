import React from 'react';
import { act, create, type ReactTestRenderer, type ReactTestInstance } from 'react-test-renderer';
import { Alert, NativeModules, Platform, TextInput, TouchableOpacity } from 'react-native';
import * as Speech from 'expo-speech';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ChatInterface from '../components/bunnyAssistant/ChatInterface';
import { OCRProvider } from '../components/bunnyAssistant/context/OCRContext';
import expenseService from '../lib/services/ExpenseService';

jest.mock('expo-router', () => ({ useRouter: () => ({ navigate: jest.fn() }) }));
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-speech', () => ({ speak: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
    getItem: jest.fn(async () => null), setItem: jest.fn(async () => {}), removeItem: jest.fn(async () => {}),
}));
jest.mock('@lib/firebase', () => ({ auth: { currentUser: { uid: 'test-bunny' } } }));
jest.mock('../lib/services/ExpenseService', () => ({
    __esModule: true, default: { addExpense: jest.fn(async () => 'expense-fake') },
}));
jest.mock('@react-native-voice/voice', () => ({
    __esModule: true, default: {
        start: jest.fn(async () => {}), stop: jest.fn(async () => {}), destroy: jest.fn(async () => {}),
    },
}));

interface SpeechEvent { results?: { isFinal: boolean; 0: { transcript: string } }[]; resultIndex?: number; error?: string }

class FakeRecognition {
    static last: FakeRecognition;
    lang = '';
    onstart: (() => void) | null = null;
    onend: (() => void) | null = null;
    onresult: ((event: SpeechEvent) => void) | null = null;
    onerror: ((event: SpeechEvent) => void) | null = null;
    start = jest.fn(() => this.onstart?.());
    stop = jest.fn(() => this.onend?.());
    abort = jest.fn();
    constructor() { FakeRecognition.last = this; }
    deliver(transcript: string, final = true) { this.onresult?.({ results: [{ isFinal: final, 0: { transcript } }] }); }
}

const originalPlatform = Platform.OS;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalVoice = NativeModules.Voice;
let screen: ReactTestRenderer;
const setPlatform = (platform: typeof Platform.OS) => Object.defineProperty(Platform, 'OS', { value: platform, configurable: true, writable: true });
function windowWith(key?: string) {
    Object.defineProperty(globalThis, 'window', { configurable: true, value: key ? { [key]: FakeRecognition } : {} });
}
function render() {
    return act(async () => {
        screen = create(<OCRProvider><ChatInterface /></OCRProvider>);
    });
}
function input() { return screen.root.findByType(TextInput); }
function labeled(label: string) {
    const button = screen.root.findAllByType(TouchableOpacity).find(item => item.props.accessibilityLabel === label);
    if (!button) throw new Error('Missing control: ' + label);
    return button;
}
function quick(text: string): ReactTestInstance {
    const button = screen.root.findAllByType(TouchableOpacity)
        .find(item => item.findAll(node => node.props.children === text).length > 0);
    if (!button) throw new Error('Missing reply: ' + text);
    return button;
}
function type(value: string) { act(() => { input().props.onChangeText(value); }); }
function send() { act(() => { labeled('Send expense message').props.onPress(); }); }
function press(text: string) { act(() => { quick(text).props.onPress(); }); }
async function save(text: string) { await act(async () => { await quick(text).props.onPress(); }); }
function rendered() { return JSON.stringify(screen.toJSON()); }

beforeEach(() => {
    jest.clearAllMocks();
    setPlatform('web');
    windowWith();
});
afterEach(() => {
    if (screen) act(() => { screen.unmount(); });
    setPlatform(originalPlatform);
    if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
    else Reflect.deleteProperty(globalThis, 'window');
    NativeModules.Voice = originalVoice;
    jest.restoreAllMocks();
});

test.each([
    ['Spent 18 RON on coffee yesterday', 'Save expense', 18, 'Coffee', 'en-US'],
    ['Am plătit 12,50 lei pe cafea ieri', 'Salvează', 12.5, 'Coffee', 'ro-RO'],
])('reviews and saves typed chat in the matching language: %s', async (text, saveText, amount, subcategory, language) => {
    await render();
    type(text);
    send();
    expect(expenseService.addExpense).not.toHaveBeenCalled();
    expect(rendered()).toContain(amount.toFixed(2));
    await save(saveText);
    expect(expenseService.addExpense).toHaveBeenCalledTimes(1);
    expect(expenseService.addExpense).toHaveBeenCalledWith(expect.objectContaining({ amount, subcategory, note: text }));
    expect(Speech.speak).toHaveBeenLastCalledWith(expect.any(String), expect.objectContaining({ language }));
});

test('a missing amount, category and subcategory require confirmation after the follow-up answers', async () => {
    await render();
    type('Spent money on something');
    send();
    expect(rendered()).toContain('How much did you pay');
    type('21.50');
    send();
    press('Other');
    press('Miscellaneous');
    expect(expenseService.addExpense).not.toHaveBeenCalled();
    await save('Save expense');
    expect(expenseService.addExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 21.5, subcategory: 'Miscellaneous' }));
});

test('an invalid date prompts for correction and a corrected amount still requires confirmation', async () => {
    await render();
    type('Am platit 15 lei pe cafea pe 31/02/2026');
    send();
    expect(rendered()).toContain('Când a fost cheltuiala?');
    type('ieri');
    send();
    press('Schimbă suma');
    type('17,50');
    send();
    expect(rendered()).toContain('17.50 RON');
    expect(expenseService.addExpense).not.toHaveBeenCalled();
    await save('Salvează');
    expect(expenseService.addExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 17.5 }));
});

test('opening chat restores stored history and keeps microphone disabled when unsupported', async () => {
    jest.mocked(AsyncStorage.getItem).mockResolvedValueOnce(JSON.stringify([
        { id: 'old', text: 'Prior Bunnyspense', isUser: true, timestamp: '2026-11-23' },
    ]));
    await render();
    expect(rendered()).toContain('Prior Bunnyspense');
    expect(AsyncStorage.removeItem).not.toHaveBeenCalled();
    expect(labeled('Start recording').props.disabled).toBe(true);
});

test.each([
    ['SpeechRecognition', false, 'Am plătit douăzeci și cinci de lei pe cafea ieri', 'Salvează', 'ro-RO'],
    ['webkitSpeechRecognition', true, 'I spent twenty-five RON for coffee yesterday', 'Save expense', 'en-US'],
])('browser voice via %s puts final text in the draft before review', async (api, switchLanguage, transcript, saveText, locale) => {
    windowWith(api);
    await render();
    if (switchLanguage) act(() => { labeled('Switch speech recognition language').props.onPress(); });
    act(() => { labeled('Start recording').props.onPress(); });
    const recognition = FakeRecognition.last;
    expect(recognition.lang).toBe(locale);
    act(() => recognition.deliver('temporary text', false));
    expect(input().props.value).toBe('');
    act(() => recognition.deliver('   ' + transcript + '  '));
    expect(input().props.value).toBe(transcript);
    expect(expenseService.addExpense).not.toHaveBeenCalled();
    act(() => { labeled('Stop recording').props.onPress(); });
    expect(recognition.stop).toHaveBeenCalledTimes(1);
    send();
    expect(expenseService.addExpense).not.toHaveBeenCalled();
    await save(saveText);
    expect(expenseService.addExpense).toHaveBeenCalledWith(expect.objectContaining({ amount: 25, subcategory: 'Coffee' }));
});

test.each(['not-allowed', 'no-speech', 'network'])('browser voice recovers from %s while leaving typing enabled', async error => {
    windowWith('SpeechRecognition');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render();
    act(() => { labeled('Start recording').props.onPress(); });
    act(() => FakeRecognition.last.onerror?.({ error }));
    expect(alert).toHaveBeenCalledTimes(1);
    expect(labeled('Start recording').props.disabled).toBe(false);
    type('12 RON for coffee');
    expect(input().props.value).toBe('12 RON for coffee');
    expect(expenseService.addExpense).not.toHaveBeenCalled();
});

test('native voice selects the locale, accepts a result, and destroys the recognizer on close', async () => {
    setPlatform('android');
    NativeModules.Voice = {};
    const voice = require('@react-native-voice/voice').default;
    await render();
    act(() => { labeled('Switch speech recognition language').props.onPress(); });
    await act(async () => { await labeled('Start recording').props.onPress(); });
    expect(voice.start).toHaveBeenCalledWith('en-US');
    act(() => voice.onSpeechStart());
    act(() => voice.onSpeechResults({ value: ['Twenty RON for coffee'] }));
    expect(input().props.value).toBe('Twenty RON for coffee');
    await act(async () => { await labeled('Stop recording').props.onPress(); });
    expect(voice.stop).toHaveBeenCalledTimes(1);
    act(() => { screen.unmount(); });
    expect(voice.destroy).toHaveBeenCalledTimes(1);
});

test('discarding a reviewed message leaves the expense list unchanged', async () => {
    await render();
    type('Spent 25 RON for coffee today');
    send();
    press('Discard');
    expect(rendered()).not.toContain('Save expense');
    expect(expenseService.addExpense).not.toHaveBeenCalled();
});

test('tomorrow requires an actual expense date before the save option is offered', async () => {
    await render();
    type('Add 40 RON for groceries tomorrow');
    send();
    expect(rendered()).toContain('When was the expense?');
    expect(expenseService.addExpense).not.toHaveBeenCalled();
    type('today');
    send();
    await save('Save expense');
    expect(expenseService.addExpense).toHaveBeenCalledTimes(1);
});

test('a rejected browser microphone start returns to an editable text input', async () => {
    windowWith('SpeechRecognition');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render();
    FakeRecognition.last.start.mockImplementationOnce(() => { throw new Error('microphone unavailable'); });
    await act(async () => { await labeled('Start recording').props.onPress(); });
    expect(alert).toHaveBeenCalledTimes(1);
    type('50 RON for groceries');
    expect(input().props.value).toBe('50 RON for groceries');
});

test('unmounting browser speech aborts recognition and detaches callbacks', async () => {
    windowWith('SpeechRecognition');
    await render();
    const recognition = FakeRecognition.last;
    act(() => { screen.unmount(); });
    expect(recognition.abort).toHaveBeenCalledTimes(1);
    expect(recognition.onresult).toBeNull();
    expect(recognition.onerror).toBeNull();
});

test('English microphone denial uses an English message after switching locale', async () => {
    windowWith('SpeechRecognition');
    const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    await render();
    act(() => { labeled('Switch speech recognition language').props.onPress(); });
    await act(async () => { await labeled('Start recording').props.onPress(); });
    act(() => FakeRecognition.last.onerror?.({ error: 'not-allowed' }));
    expect(alert).toHaveBeenCalledWith('Voice input', 'Allow microphone access and try again.');
});
