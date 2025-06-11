// lib/utils/expenseFilters.ts
import { getCurrentBudgetPeriod, getPreviousPeriod, getNextPeriod, getCurrentDate } from './budgetPeriods';

export interface BudgetData {
    period: string;
    startDay: string;
    name: string;
}

export interface Expense {
    id: string;
    amount: number;
    category: string;
    subcategory: string;
    date: string;
    note?: string;
    userId: string;
    timestamp?: Date;
    currency?: string;
    budgetId?: string;
    source?: string;
}

export function filterExpensesByPeriod(
    expenses: Expense[],
    budget: BudgetData,
    periodOffset: number = 0
): Expense[] {
    if (!budget) return expenses;

    const currentDate = getCurrentDate();
    let tempDate = currentDate;

    if (periodOffset < 0) {
        for (let i = 0; i > periodOffset; i--) {
            const prevPeriod = getPreviousPeriod(tempDate, budget.period, budget.startDay);
            tempDate = prevPeriod.start;
        }
    } else if (periodOffset > 0) {
        for (let i = 0; i < periodOffset; i++) {
            const nextPeriod = getNextPeriod(tempDate, budget.period, budget.startDay);
            tempDate = nextPeriod.start;
        }
    }

    const periodRange = getCurrentBudgetPeriod(tempDate, budget.period, budget.startDay);
    return expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        const inRange = expenseDate >= periodRange.start && expenseDate <= periodRange.end;
        return inRange;
    });
}



export function getPeriodTitle(budget: BudgetData, periodOffset: number = 0): string {
    if (!budget) return 'All Time';

    const currentDate = getCurrentDate();
    let tempDate = currentDate;

    if (periodOffset < 0) {
        for (let i = 0; i > periodOffset; i--) {
            const prevPeriod = getPreviousPeriod(tempDate, budget.period, budget.startDay);
            tempDate = prevPeriod.start;
        }
    } else if (periodOffset > 0) {
        for (let i = 0; i < periodOffset; i++) {
            const nextPeriod = getNextPeriod(tempDate, budget.period, budget.startDay);
            tempDate = nextPeriod.start;
        }
    }

    const periodRange = getCurrentBudgetPeriod(tempDate, budget.period, budget.startDay);
    const start = periodRange.start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const end = periodRange.end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return `${start} - ${end}`;
}
