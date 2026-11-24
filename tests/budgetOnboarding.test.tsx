import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { Text, TouchableOpacity as MockTouchableOpacity } from 'react-native';
import { setDoc } from 'firebase/firestore';
import BudgetOnboarding from '../components/budget/BudgetOnboarding';

const mockReplace = jest.fn();
jest.mock('@expo/vector-icons', () => ({ Ionicons: () => null }));
jest.mock('expo-router', () => ({
    useRouter: () => ({ replace: mockReplace, canGoBack: () => false }),
}));
jest.mock('@lib/firebase', () => ({ auth: { currentUser: { uid: 'bunny' } }, db: {} }));
jest.mock('firebase/firestore', () => ({
    collection: jest.fn(),
    doc: jest.fn(() => ({ id: 'budget-id' })),
    setDoc: jest.fn(async () => {}),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
    setItem: jest.fn(async () => {}),
}));
jest.mock('../components/budget/steps/BasicInfoStep', () => ({
    __esModule: true,
    default: ({ onNext, updateData }: { onNext(): void; updateData(value: object): void }) => (
        <MockTouchableOpacity testID="basic-next" onPress={() => {
            updateData({ name: 'Bunny budget', period: 'weekly', startDay: '3' });
            onNext();
        }} />
    ),
}));
jest.mock('../components/budget/steps/IncomeStep', () => ({
    __esModule: true,
    default: ({ onNext, updateData }: { onNext(): void; updateData(value: object): void }) => (
        <MockTouchableOpacity testID="income-next" onPress={() => {
            updateData({ incomes: [{ type: 'Salary', amount: '1500' }] });
            onNext();
        }} />
    ),
}));
jest.mock('../components/budget/steps/ExpensesStep', () => ({
    __esModule: true,
    default: ({ onNext }: { onNext(): void }) => (
        <MockTouchableOpacity testID="expenses-next" onPress={onNext} />
    ),
}));

test('advancing through budget onboarding and rapidly saving writes exactly one budget', async () => {
    let screen!: ReactTestRenderer;
    act(() => { screen = create(<BudgetOnboarding />); });
    for (const id of ['basic-next', 'income-next', 'expenses-next']) {
        act(() => screen.root.findAllByProps({ testID: id })[0].props.onPress());
    }
    const save = screen.root.findAllByType(MockTouchableOpacity).find(button =>
        button.findAllByType(Text).some(text => text.props.children === 'Save Budget')
    );
    expect(save).toBeDefined();
    let saves: Promise<void>[] = [];
    act(() => {
        const submit = save!.props.onPress as () => Promise<void>;
        saves = [submit(), submit()];
    });
    await Promise.all(saves);
    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(setDoc).toHaveBeenCalledWith({ id: 'budget-id' }, expect.objectContaining({
        userId: 'bunny', name: 'Bunny budget', period: 'weekly', startDay: '3', amount: 1500,
    }));
    expect(mockReplace).toHaveBeenCalledWith('/tabs/budget');
    act(() => screen.unmount());
});

