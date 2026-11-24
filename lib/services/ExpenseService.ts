import { collection, doc, addDoc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@lib/firebase';

export interface Expense {
    id: string;
    userId: string;
    amount: number;
    category: string;
    subcategory: string;
    note?: string;
    date: string;
    currency?: string;
    budgetId?: string | null;
    source?: string;
    timestamp?: Date;
}

class ExpenseService {
    private readonly expensesCollection;

    constructor() {
        this.expensesCollection = collection(db, 'expenses');
    }

    async addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
        if (!Number.isFinite(expense.amount) || expense.amount <= 0) throw new Error('Invalid expense amount');
        const ref = await addDoc(this.expensesCollection, { ...expense, createdAt: Timestamp.now() });
        return ref.id;
    }

    async updateExpense(id: string, expense: Partial<Expense>): Promise<void> {
        if (expense.amount !== undefined && (!Number.isFinite(expense.amount) || expense.amount <= 0)) {
            throw new Error('Invalid expense amount');
        }
        await updateDoc(doc(this.expensesCollection, id), { ...expense, updatedAt: Timestamp.now() });
    }

    async deleteExpense(id: string): Promise<void> {
        await deleteDoc(doc(this.expensesCollection, id));
    }
}

export const expenseService = new ExpenseService();

export default expenseService; 