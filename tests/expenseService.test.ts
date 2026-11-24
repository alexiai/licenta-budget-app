import { addDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import expenseService from '../lib/services/ExpenseService';

jest.mock('@lib/firebase', () => ({ db: {} }));
jest.mock('firebase/firestore', () => ({
    collection: (_: unknown, name: string) => name,
    doc: (collection: string, id: string) => `${collection}/${id}`,
    addDoc: jest.fn(async () => ({ id: 'expense-id' })),
    updateDoc: jest.fn(async () => {}),
    deleteDoc: jest.fn(async () => {}),
    Timestamp: { now: () => 'timestamp' },
}));

const expense = {
    userId: 'bunny', budgetId: 'burrow', amount: 25.5,
    date: '2026-11-24', category: 'Transport', subcategory: 'Taxi',
};
beforeEach(() => jest.clearAllMocks());

test('creates a linked expense without decrementing the recorded budget income', async () => {
    expect(await expenseService.addExpense(expense)).toBe('expense-id');
    expect(addDoc).toHaveBeenCalledWith('expenses', { ...expense, createdAt: 'timestamp' });
    expect(updateDoc).not.toHaveBeenCalled();
});

test('edits and deletes the selected expense document', async () => {
    await expenseService.updateExpense('expense-id', { amount: 28 });
    await expenseService.deleteExpense('expense-id');
    expect(updateDoc).toHaveBeenCalledWith('expenses/expense-id', { amount: 28, updatedAt: 'timestamp' });
    expect(deleteDoc).toHaveBeenCalledWith('expenses/expense-id');
});

test.each([0, -7, NaN, Infinity])('rejects invalid writes for amount %s', async amount => {
    await expect(expenseService.addExpense({ ...expense, amount })).rejects.toThrow('Invalid expense amount');
    await expect(expenseService.updateExpense('expense-id', { amount })).rejects.toThrow('Invalid expense amount');
    expect(addDoc).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
});
