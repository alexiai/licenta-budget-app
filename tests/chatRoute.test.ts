jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('expo-speech', () => ({ speak: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({}));
jest.mock('@lib/firebase', () => ({ auth: {}, db: {} }));
jest.mock('../lib/services/ExpenseService', () => ({}));

test('Expo can load the chat route before React mounts a screen', () => {
    const { default: ChatInterface } = require('../components/bunnyAssistant/ChatInterface');
    expect(typeof ChatInterface).toBe('function');
});
