import { toISODateString } from './dateUtils';

function localDate(year: number, month: number, day: number): Date {
    return new Date(year, month, day);
}

function addDays(date: Date, days: number): Date {
    return localDate(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function monthlyAnchor(year: number, month: number, day: number): Date {
    const lastDay = localDate(year, month + 1, 0).getDate();
    return localDate(year, month, Math.min(day, lastDay));
}

export function getPeriodRange(currentDate: Date, period: string, startDay: string): { start: Date; end: Date } {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const today = localDate(year, month, currentDate.getDate());
    const dayValue = Number(startDay);
    const day = Number.isInteger(dayValue) && dayValue >= 1 && dayValue <= 31 ? dayValue : 1;
    let start: Date;
    let next: Date;

    if (period === 'weekly') {
        const names = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const named = names.indexOf(String(startDay).toLowerCase());
        const weekday = named < 0 ? (day <= 7 ? day % 7 : 1) : named;
        start = addDays(today, -(today.getDay() - weekday + 7) % 7);
        next = addDays(start, 7);
    } else if (period === 'biweekly' || period === 'bi-weekly') {
        // Keep a continuous 14-day cycle for each configured starting day.
        const epoch = localDate(2020, 0, day);
        const elapsed = (Date.parse(toISODateString(today)) - Date.parse(toISODateString(epoch))) / 86_400_000;
        start = addDays(epoch, Math.floor(elapsed / 14) * 14);
        next = addDays(start, 14);
    } else {
        const offset = today < monthlyAnchor(year, month, day) ? -1 : 0;
        start = monthlyAnchor(year, month + offset, day);
        next = monthlyAnchor(year, month + offset + 1, day);
    }

    return { start, end: new Date(next.getTime() - 1) };
}

export function getPeriodKey(currentDate: Date, period: string, startDay: string): string {
    return toISODateString(getPeriodRange(currentDate, period, startDay).start);
}

export function formatPeriod({ start, end }: { start: Date; end: Date }): string {
    const format = (date: Date) => date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
    return `${format(start)} - ${format(end)}`;
}

export function getCurrentDate(): Date {
    return new Date();
}

export const getCurrentBudgetPeriod = getPeriodRange;

export function getPreviousPeriod(date: Date, period: string, startDay: string) {
    const { start } = getPeriodRange(date, period, startDay);
    return getPeriodRange(addDays(start, -1), period, startDay);
}

export function getNextPeriod(date: Date, period: string, startDay: string) {
    const { end } = getPeriodRange(date, period, startDay);
    return getPeriodRange(new Date(end.getTime() + 1), period, startDay);
}
