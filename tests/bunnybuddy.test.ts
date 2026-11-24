import { generateSpendingAnalysis } from '../components/bunnyAssistant/analysisUtils';
import { parseExpenseDate, toISODateString } from '../lib/utils/dateUtils';
import { getNextPeriod, getPeriodRange, getPreviousPeriod } from '../lib/utils/budgetPeriods';
import { extractExpenseAmount, extractExpenseDate } from '../lib/utils/chatExpenseParsing';
import { applyQuestReward, buildQuests, evaluateQuest } from '../lib/utils/quests';
import type { UserProgress } from '../lib/types';

const now = new Date(2026, 10, 24, 12);
const expense = (date: string, amount: number, category = 'Food & Drinks', subcategory = 'Groceries') =>
    ({ id: date, date, amount, category, subcategory });

describe('Bunny insights', () => {
    test('separates current month, previous month, and all-time spending', () => {
        const analysis = generateSpendingAnalysis([
            expense('2026-11-24', 10), expense('2026-10-31', 20), expense('2026-09-30', 30),
        ], now);
        expect([analysis.totalThisMonth, analysis.totalLastMonth, analysis.totalSpent]).toEqual([10, 20, 60]);
    });

    test('anchors weeks to Monday and includes a prior week with no spending', () => {
        const analysis = generateSpendingAnalysis([
            expense('2026-11-23', 30), expense('2026-11-24', 20), expense('2026-11-15', 100),
        ], now);
        expect(analysis.weeklyStats).toMatchObject({
            currentWeek: 50, lastWeek: 0, topSpendingDay: { day: 'Monday', amount: 30 },
            dailyBreakdown: { Monday: 30, Tuesday: 20, Sunday: 0 },
        });
    });

    test('handles no history and ignores malformed, future, and nonpositive expenses', () => {
        const analysis = generateSpendingAnalysis([
            expense('2026-02-30', 25), expense('no date', 3), expense('2026-11-25', 8),
            expense('2026-11-24', -1), expense('2026-11-24', Infinity),
        ], now);
        expect(analysis.totalSpent).toBe(0);
        expect(analysis.topCategories).toEqual([]);
        expect(analysis.unusedCategories).toContain('Food & Drinks');
    });

    test('keeps custom categories and includes zero-spend days in daily average', () => {
        const analysis = generateSpendingAnalysis([
            expense('2026-11-22', 30, 'Pets'), expense('2026-11-24', 60),
        ], now);
        expect(analysis.averageDailySpending).toBe(30);
        expect(analysis.categoryBreakdown.Pets).toBe(30);
        expect(analysis.spendingPatterns.essentialVsFlexible).toEqual({ essential: 60, flexible: 30 });
        expect(analysis.spendingPatterns.weekdayVsWeekend).toEqual({ weekday: 60, weekend: 30 });
    });

    test('uses monthly category data and accepts older day-first expense dates', () => {
        const analysis = generateSpendingAnalysis([
            expense('23/11/2026', 40, 'Transport'), expense('2026-10-20', 10, 'Housing'),
        ], now);
        expect(analysis.monthlyCategoryBreakdown).toEqual({ Transport: 40 });
        expect(analysis.unusedCategories).toContain('Housing');
    });
});

describe('budget periods and expense dates', () => {
    test('uses the previous weekly anchor if the selected weekday has yet to occur', () => {
        const period = getPeriodRange(now, 'weekly', 'friday');
        expect(toISODateString(period.start)).toBe('2026-11-20');
        expect(toISODateString(period.end)).toBe('2026-11-26');
        expect(period.start.getHours()).toBe(0);
    });

    test('supports Sunday as a numbered weekly anchor', () => {
        expect(toISODateString(getPeriodRange(now, 'weekly', '7').start)).toBe('2026-11-22');
    });

    test('clamps a 31st-of-month anchor in leap February and navigates to March', () => {
        const date = new Date(2024, 2, 4);
        expect(toISODateString(getPeriodRange(date, 'monthly', '31').start)).toBe('2024-02-29');
        expect(toISODateString(getPreviousPeriod(date, 'monthly', '31').start)).toBe('2024-01-31');
        expect(toISODateString(getNextPeriod(date, 'monthly', '31').start)).toBe('2024-03-31');
    });

    test('biweekly periods remain contiguous across a month boundary', () => {
        const date = new Date(2026, 10, 30);
        const current = getPeriodRange(date, 'biweekly', '12');
        const next = getNextPeriod(date, 'biweekly', '12');
        expect(next.start.getTime() - current.end.getTime()).toBe(1);
        expect(getPreviousPeriod(next.start, 'biweekly', '12')).toEqual(current);
    });

    test.each(['31/11/2026', '2026-02-29', '2026-13-01', '2abc/10/2026'])('rejects invalid date %s', value => {
        expect(parseExpenseDate(value)).toBeNull();
    });
});

describe('Romanian and English expense input', () => {
    test.each([
        ['Add 35 RON for groceries today', 35, '2026-11-24'],
        ['Am plătit 42,50 lei pe mâncare ieri', 42.5, '2026-11-23'],
        ['Spent 19.95 for coffee three days ago', 19.95, '2026-11-21'],
        ['22 lei transport acum 2 săptămâni', 22, '2026-11-10'],
        ['Taxi on 2026-11-13, paid 21', 21, '2026-11-13'],
        ['Am dat 30 pe cafea pe 12 noiembrie', 30, '2026-11-12'],
        ['25 for groceries last week', 25, '2026-11-17'],
    ])('parses %s', (text, amount, date) => {
        expect(extractExpenseAmount(text)).toBe(amount);
        expect(extractExpenseDate(text, now)).toBe(date);
    });
    test('does not treat dates, negative numbers or foreign currency as RON', () => {
        expect(extractExpenseAmount('Spent money on 2026-11-12')).toBeUndefined();
        expect(extractExpenseAmount('Spent -25 lei')).toBeUndefined();
        expect(extractExpenseAmount('Paid 25 EUR')).toBeUndefined();
    });
    test('explicitly invalid dates ask for a correction', () => {
        expect(extractExpenseDate('Paid 25 lei on 31/11/2026', now)).toBeNull();
    });
});

describe('Bunny quests and rewards', () => {
    const history = { averageDailySpending: 100, weeklyStats: { lastWeek: 250 }, totalLastMonth: 1000 };
    const [daily, weekly, monthly] = buildQuests('bun', history, now);
    test('uses stable period IDs and adaptive targets', () => {
        expect([daily.target, weekly.target, monthly.target]).toEqual([90, 225, 900]);
        const [nextDay, sameWeek, sameMonth] = buildQuests('bun', history, new Date(2026, 10, 25));
        expect(nextDay.id).not.toBe(daily.id);
        expect([sameWeek.id, sameMonth.id]).toEqual([weekly.id, monthly.id]);
    });
    test('offers a tracking quest with no history and requires an expense', () => {
        const [quest] = buildQuests('bun', {
            averageDailySpending: 0, weeklyStats: { lastWeek: 0 }, totalLastMonth: 0,
        }, now);
        const end = quest.endDate!;
        expect(evaluateQuest(quest, [], end).status).toBe('failed');
        expect(evaluateQuest(quest, [expense('2026-11-24', 3)], end).status).toBe('completed');
    });
    test('keeps a quest open through its period and recalculates after an edit', () => {
        expect(evaluateQuest(daily, [expense('2026-11-24', 80)], now).status).toBe('active');
        expect(evaluateQuest(daily, [expense('2026-11-24', 95)], daily.endDate!).status).toBe('failed');
        expect(evaluateQuest(daily, [expense('2026-11-24', 90), expense('2026-11-25', 15)], daily.endDate!).status).toBe('completed');
    });
    test('preserves claimed quests and supports Firestore timestamps', () => {
        const claimed = { ...daily, status: 'claimed' as const };
        expect(evaluateQuest(claimed, [], now)).toBe(claimed);
        expect(parseExpenseDate({ toDate: () => now })).toEqual(now);
    });
    test('credits once and awards level and badge milestones', () => {
        const initial: UserProgress = {
            userId: 'bun', level: 1, totalPoints: 950, pointsToNextLevel: 50,
            questsCompleted: 0, currentStreak: 0, badges: [], completedQuests: [],
        };
        const reward = applyQuestReward(initial, daily, now);
        expect(reward).toMatchObject({
            totalPoints: 1000, level: 2, pointsToNextLevel: 1000, questsCompleted: 1,
            badges: [{ id: 'first-hop' }], completedQuests: [daily.id],
        });
        expect(applyQuestReward(reward, daily, now)).toBe(reward);
    });
});

describe('receipt parsing', () => {
    const { parseReceiptExpense } = require('../lib/utils/receiptExpense') as typeof import('../lib/utils/receiptExpense');
    test('accepts a Romanian decimal total and keeps the receipt day', () => {
        expect(parseReceiptExpense({ total: '42,50', date: '2026-11-23', currency: 'RON' }, now))
            .toMatchObject({ amount: 42.5, date: '2026-11-23' });
    });
    test.each([
        { total: 'invalid' }, { total: '32', date: '2026-02-30' }, { total: '7.20', currency: 'EUR' },
    ])('rejects unreadable or unsupported receipt values %j', receipt => {
        expect(() => parseReceiptExpense(receipt, now)).toThrow();
    });
});

describe('historical spending tips', () => {
    const { generateSpendingTips } = require('../components/bunnyAssistant/spendingTips') as typeof import('../components/bunnyAssistant/spendingTips');
    test('gives a tracking prompt when the account has no data', () => {
        expect(generateSpendingTips(generateSpendingAnalysis([], now))).toMatchObject([{ id: 'start-tracking', action: 'chat' }]);
    });
    test('shows a measurable monthly increase and flexible-spending target', () => {
        const analysis = generateSpendingAnalysis([
            expense('2026-11-24', 60, 'Entertainment'),
            expense('2026-10-24', 40, 'Entertainment'),
        ], now);
        const tips = generateSpendingTips(analysis);
        expect(tips.find(tip => tip.id === 'monthly-increase')?.description).toContain('50%');
        expect(tips.find(tip => tip.id === 'flexible-spending')?.description).toContain('6.00 RON');
    });
    test('avoids framing first-week data as a week-over-week increase', () => {
        const analysis = generateSpendingAnalysis([expense('2026-11-24', 40)], now);
        expect(generateSpendingTips(analysis).map(tip => tip.id)).not.toContain('weekly-increase');
    });
});

describe('bilingual expense categories', () => {
    const { findCategoryByProduct } = require('../lib/productAssociation') as typeof import('../lib/productAssociation');
    const { findStoreInText } = require('../lib/utils/storeNames') as typeof import('../lib/utils/storeNames');
    test.each([
        ['Add 35 RON for groceries today', 'Food & Drinks', 'Groceries'],
        ['Am plătit 12 lei pentru cafea', 'Food & Drinks', 'Coffee'],
        ['Am platit 42 lei pentru parcare', 'Transport', 'Parking'],
        ['I paid 21 RON for a taxi yesterday', 'Transport', 'Taxi'],
        ['Am cheltuit 40 de lei la benzinarie', 'Transport', 'Gas'],
        ['20 RON for a metro ride', 'Transport', 'Public Transport'],
    ])('classifies %s', (text, category, subcategory) => {
        expect(findCategoryByProduct(text)).toMatchObject({ category, subcategory });
    });
    test('a shared substring does not identify an unrelated shop', () => {
        expect(findStoreInText('A suburban bus ride')).toBeNull();
        expect(findStoreInText('Am plătit 30 lei la Mega Image')).toMatchObject({ subcategory: 'Groceries' });
    });
});
