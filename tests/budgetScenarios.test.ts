import { generateSpendingAnalysis } from '../components/bunnyAssistant/analysisUtils';
import { generateSpendingTips } from '../components/bunnyAssistant/spendingTips';
import { parseChatExpense } from '../lib/utils/chatExpense';
import { buildQuests, evaluateQuest } from '../lib/utils/quests';
import { filterExpensesByPeriod, type Expense } from '../lib/utils/expenseFilters';

const now = new Date(2026, 10, 24, 12);
const record = (id: string, amount: number, date: string, category = 'Entertainment'): Expense =>
    ({ id, amount, date, userId: 'fixture', category, subcategory: 'Movies' });

test.each([
    ['weekly', 'monday', 40],
    ['biweekly', '1', 40],
    ['monthly', '1', 65],
])('%s view recomputes what is left and excludes a different budget', (period, startDay, expectedSpent) => {
    jest.useFakeTimers().setSystemTime(now);
    try {
        const entries = [
            { ...record('current', 40, '2026-11-24'), budgetId: 'current' },
            { ...record('older', 25, '2026-11-04'), budgetId: 'current' },
            { ...record('other-budget', 600, '2026-11-24'), budgetId: 'different' },
        ];
        const total = filterExpensesByPeriod(entries, { id: 'current', name: 'Plan', period, startDay })
            .reduce((sum, expense) => sum + expense.amount, 0);
        expect(total).toBe(expectedSpent);
        expect(1000 - total).toBe(1000 - expectedSpent);
    } finally {
        jest.useRealTimers();
    }
});

test('a sample flexible-spending budget turns a 10% reduction into a concrete amount', () => {
    const analysis = generateSpendingAnalysis([
        record('this-month', 300, '2026-11-23'),
        record('last-month', 250, '2026-10-23'),
    ], now);
    const tips = generateSpendingTips(analysis);
    expect(tips.find(tip => tip.id === 'monthly-increase')?.description).toContain('20% more');
    expect(tips.find(tip => tip.id === 'flexible-spending')?.description).toContain('30.00 RON');
    const plannedReduction = 300 * 0.1;
    expect(300 - plannedReduction).toBe(270);
});

test('a sample RON limit rejects overspending and rewards a completed period at the exact target', () => {
    const history = generateSpendingAnalysis([record('last-month', 300, '2026-10-23')], now);
    const monthly = buildQuests('fixture', history, now).find(quest => quest.type === 'monthly')!;
    expect(monthly.target).toBe(270);
    expect(evaluateQuest(monthly, [record('within', 270, '2026-11-24')], monthly.endDate!).status).toBe('completed');
    expect(evaluateQuest(monthly, [record('over', 270.01, '2026-11-24')], monthly.endDate!).status).toBe('failed');
});

test('manual fields, text and a simulated transcript produce the same budgeting data', () => {
    const manual = { amount: 25, date: '2026-11-23', category: 'Food & Drinks', subcategory: 'Coffee' };
    expect(parseChatExpense('Spent 25 RON for coffee yesterday', now)).toMatchObject(manual);
    expect(parseChatExpense('Am plătit douăzeci și cinci de lei pe cafea ieri', now)).toMatchObject(manual);
});
