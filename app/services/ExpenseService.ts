import { collection, doc, getDoc, addDoc, updateDoc, query, where, getDocs, deleteDoc, Timestamp } from 'firebase/firestore';
import { db } from '@lib/firebase';
import QuestService from './QuestService';
import { useDataFetching } from '@lib/hooks/useDataFetching';

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

    // Hook for getting expenses with caching
    useExpenses(userId: string) {
        return useDataFetching<Expense[]>(
            'expenses',
            () => this.getExpensesByUserId(userId),
            [userId]
        );
    }

    // Hook for getting period expenses with caching
    useExpensesByPeriod(userId: string, startDate: Date, endDate: Date) {
        return useDataFetching<Expense[]>(
            `expenses_${startDate.toISOString()}_${endDate.toISOString()}`,
            () => this.getExpensesByPeriod(userId, startDate, endDate),
            [userId, startDate, endDate]
        );
    }

    async addExpense(expense: Omit<Expense, 'id'>): Promise<string> {
        console.log('[ExpenseService] Adding new expense:', expense);
        try {
            // Add the expense to Firestore
            const docRef = await addDoc(this.expensesCollection, {
                ...expense,
                createdAt: Timestamp.now()
            });
            console.log('[ExpenseService] Expense added with ID:', docRef.id);

            // Update quest progress
            await QuestService.trackExpense(expense.userId, {
                ...expense,
                id: docRef.id
            });
            console.log('[ExpenseService] Quest progress updated');

            // If there's a budget, update it
            if (expense.budgetId) {
                console.log('[ExpenseService] Updating budget:', expense.budgetId);
                await this.updateBudget(expense.budgetId, expense.amount);
            }

            return docRef.id;
        } catch (error) {
            console.error('[ExpenseService] Error adding expense:', error);
            throw error;
        }
    }

    async updateExpense(id: string, expense: Partial<Expense>): Promise<void> {
        console.log('[ExpenseService] Updating expense:', { id, expense });
        const docRef = doc(this.expensesCollection, id);
        await updateDoc(docRef, {
            ...expense,
            updatedAt: Timestamp.now()
        });
        console.log('[ExpenseService] Updated expense successfully');
    }

    async deleteExpense(id: string): Promise<void> {
        console.log('[ExpenseService] Starting delete operation for expense:', id);
        try {
            const docRef = doc(this.expensesCollection, id);
            
            // Get the expense data before deletion
            const expenseSnap = await getDoc(docRef);
            if (!expenseSnap.exists()) {
                console.error('[ExpenseService] Expense not found:', id);
                throw new Error('Expense not found');
            }
            console.log('[ExpenseService] Found expense to delete:', expenseSnap.data());
            
            // Delete the expense
            await deleteDoc(docRef);
            console.log('[ExpenseService] Successfully deleted expense from Firestore');
            
            // Get budget data if expense was part of a budget
            const expenseData = expenseSnap.data();
            if (expenseData.budgetId) {
                console.log('[ExpenseService] Expense was part of budget:', expenseData.budgetId);
                const budgetRef = doc(db, 'budgets', expenseData.budgetId);
                const budgetSnap = await getDoc(budgetRef);
                
                if (budgetSnap.exists()) {
                    const budgetData = budgetSnap.data();
                    const newAmount = (budgetData.amount || 0) + expenseData.amount;
                    console.log('[ExpenseService] Updating budget amount:', {
                        oldAmount: budgetData.amount,
                        expenseAmount: expenseData.amount,
                        newAmount
                    });
                    
                    await updateDoc(budgetRef, {
                        amount: newAmount,
                        updatedAt: new Date().toISOString()
                    });
                    console.log('[ExpenseService] Successfully updated budget amount');
                }
            }
            
            console.log('[ExpenseService] Delete operation completed successfully');
        } catch (error) {
            console.error('[ExpenseService] Error in delete operation:', error);
            throw error;
        }
    }

    private async updateBudget(budgetId: string, expenseAmount: number): Promise<void> {
        console.log('[ExpenseService] Updating budget:', { budgetId, expenseAmount });
        const budgetRef = doc(db, 'budgets', budgetId);
        const budgetSnap = await getDoc(budgetRef);

        if (budgetSnap.exists()) {
            const current = budgetSnap.data();
            const newAmount = (current.amount || 0) - expenseAmount;
            await updateDoc(budgetRef, {
                amount: newAmount,
                updatedAt: new Date().toISOString()
            });
            console.log('[ExpenseService] Budget updated successfully');
        }
    }

    async getExpensesByUserId(userId: string): Promise<Expense[]> {
        console.log('[ExpenseService] Fetching expenses for user:', userId);
        const q = query(this.expensesCollection, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const expenses = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        } as Expense));
        console.log('[ExpenseService] Found expenses:', expenses.length);
        return expenses;
    }

    async getExpensesByPeriod(userId: string, startDate: Date, endDate: Date): Promise<Expense[]> {
        console.log('[ExpenseService] Fetching expenses for period:', { userId, startDate, endDate });
        const q = query(
            this.expensesCollection,
            where('userId', '==', userId),
            where('date', '>=', startDate.toISOString()),
            where('date', '<=', endDate.toISOString())
        );
        const snapshot = await getDocs(q);
        const expenses = snapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id
        } as Expense));
        console.log('[ExpenseService] Found expenses for period:', expenses.length);
        return expenses;
    }
}

export const expenseService = new ExpenseService();

export default expenseService; 