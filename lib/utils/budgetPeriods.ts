// lib/utils/budgetPeriods.ts

import dayjs from 'dayjs';

export function getPeriodRange(currentDate: Date, period: string, startDay: string): { start: Date, end: Date } {
    const date = dayjs(currentDate);

    switch (period) {
        case 'weekly': {
            const weekdays: Record<string, number> = {
                monday: 1,
                tuesday: 2,
                wednesday: 3,
                thursday: 4,
                friday: 5,
                saturday: 6,
                sunday: 0,
            };
            const startOfWeek = date.day(weekdays[startDay.toLowerCase()] ?? 1);
            const endOfWeek = startOfWeek.add(6, 'day');
            return { start: startOfWeek.toDate(), end: endOfWeek.toDate() };
        }

        case 'biweekly': {
            const startDayNum = parseInt(startDay);
            const currentDay = date.date();
            const isAfterStart = currentDay >= startDayNum;
            const start = isAfterStart ? date.date(startDayNum) : date.subtract(1, 'month').date(startDayNum);
            const end = dayjs(start).add(13, 'day');
            return { start: start.toDate(), end: end.toDate() };
        }

        case 'monthly':
        default: {
            const startDayNum = parseInt(startDay);
            const currentDay = date.date();
            const isAfterStart = currentDay >= startDayNum;
            const start = isAfterStart ? date.date(startDayNum) : date.subtract(1, 'month').date(startDayNum);
            const nextMonth = dayjs(start).add(1, 'month').date(startDayNum);
            const end = nextMonth.subtract(1, 'day');
            return { start: start.toDate(), end: end.toDate() };
        }
    }
}

export function getPeriodKey(currentDate: Date, period: string, startDay: string): string {
    const range = getPeriodRange(currentDate, period, startDay);
    return dayjs(range.start).format('YYYY-MM-DD');
}

export function formatPeriod(range: { start: Date, end: Date }): string {
    const start = dayjs(range.start).format('D MMM');
    const end = dayjs(range.end).format('D MMM');
    return `${start} - ${end}`;
}

export function getCurrentDate(): Date {
    return new Date();
}

// ✅ Adăugăm acum funcțiile lipsă:

export function getCurrentBudgetPeriod(currentDate: Date, period: string, startDay: string) {
    return getPeriodRange(currentDate, period, startDay);
}

export function getPreviousPeriod(currentDate: Date, period: string, startDay: string) {
    const start = dayjs(getPeriodRange(currentDate, period, startDay).start);

    let newStart;
    switch (period) {
        case 'weekly':
            newStart = start.subtract(7, 'day');
            break;
        case 'biweekly':
            newStart = start.subtract(14, 'day');
            break;
        case 'monthly':
        default:
            newStart = start.subtract(1, 'month');
            break;
    }

    return getPeriodRange(newStart.toDate(), period, startDay);
}

export function getNextPeriod(currentDate: Date, period: string, startDay: string) {
    const start = dayjs(getPeriodRange(currentDate, period, startDay).start);

    let newStart;
    switch (period) {
        case 'weekly':
            newStart = start.add(7, 'day');
            break;
        case 'biweekly':
            newStart = start.add(14, 'day');
            break;
        case 'monthly':
        default:
            newStart = start.add(1, 'month');
            break;
    }

    return getPeriodRange(newStart.toDate(), period, startDay);
}