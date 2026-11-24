import React from 'react';
import { act, create, ReactTestRenderer } from 'react-test-renderer';
import { TextInput, TouchableOpacity, Text } from 'react-native';
import { updateDoc } from 'firebase/firestore';
import EditBudget from '../components/budget/EditBudget';

jest.mock('@expo/vector-icons', () => ({ Feather: () => null }));
jest.mock('react-native-draggable-flatlist', () => ({ __esModule: true, default: () => null }));
jest.mock('react-native-chart-kit', () => ({ PieChart: () => null }));
jest.mock('@lib/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
    doc: (_: unknown, collection: string, id: string) => `${collection}/${id}`,
    updateDoc: jest.fn(async () => {}),
}));

test('typing budget changes keeps them local until Save changes, then performs one write', async () => {
    const incomes = [{ type: 'Salary', amount: '100' }];
    let screen!: ReactTestRenderer;
    const onSaved = jest.fn(() => act(() => { screen.unmount(); }));
    act(() => {
        screen = create(<EditBudget budgetId="burrow" incomes={incomes} categories={[]} onSaved={onSaved} onCancel={() => {}} />);
    });
    const field = screen.root.findByType(TextInput);
    for (const amount of ['2', '25', '250']) {
        act(() => { field.props.onChangeText(amount); });
    }
    expect(updateDoc).not.toHaveBeenCalled();
    expect(incomes[0].amount).toBe('100');

    const button = screen.root.findAllByType(TouchableOpacity).find(item =>
        item.findAllByType(Text).some(text => text.props.children === 'Save changes')
    );
    let saves: Promise<void>[] = [];
    act(() => {
        const submit = button!.props.onPress as () => Promise<void>;
        saves = [submit(), submit()];
    });
    await Promise.all(saves);
    expect(updateDoc).toHaveBeenCalledTimes(1);
    expect(updateDoc).toHaveBeenCalledWith('budgets/burrow', { categories: [], incomes: [{ type: 'Salary', amount: '250' }] });
    expect(onSaved).toHaveBeenCalledTimes(1);
});
