import { foldExpenseText, readSpokenNumber, spokenNumber } from './spokenExpenseNumbers';
import { parseDateInput, toISODateString } from './dateUtils';

const MONTHS = [
    'january ianuarie', 'february februarie', 'march martie', 'april aprilie',
    'may mai', 'june iunie', 'july iulie', 'august', 'september septembrie',
    'october octombrie', 'november noiembrie', 'december decembrie',
].map(month => month.split(' '));
const WEEKDAYS = [
    'sunday duminica', 'monday luni', 'tuesday marti', 'wednesday miercuri',
    'thursday joi', 'friday vineri', 'saturday sambata',
].map(day => day.split(' '));
const NUMERIC_DATE = /\b(?:\d{4}[-/.]\d{1,2}[-/.]\d{1,2}|\d{1,2}[-/.]\d{1,2}[-/.]\d{4})\b/;
const NAMED_DATE = new RegExp(`\\b(\\d{1,2})\\s+(${MONTHS.flat().join('|')})(?:\\s+(\\d{4}))?\\b`);
const MONTH_FIRST = new RegExp(`\\b(${MONTHS.map(names => names[0]).join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s+(\\d{4}))?\\b`);
const relativeCount = `(?:\\d+|${spokenNumber})`;
const RELATIVE_DATE = new RegExp(`\\b(?:(${relativeCount})\\s+(days?|weeks?|months?)\\s+ago|acum\\s+(${relativeCount})\\s+(zile|zi|saptamani|saptamana|luni|luna))\\b`);
const WRITTEN_AMOUNT = new RegExp(`\\b(${spokenNumber}(?:\\s+(?:point|virgula)\\s+${spokenNumber})?)\\s*(?:de\\s+)?(?:lei|ron)\\b`, 'g');

export function extractExpenseDate(text: string, now = new Date()): string | null | undefined {
    const input = foldExpenseText(text);
    const numeric = input.match(NUMERIC_DATE);
    const named = input.match(NAMED_DATE) ?? input.match(MONTH_FIRST)?.map((value, index, fields) =>
        index === 1 ? fields[2] : index === 2 ? fields[1] : value);
    if (numeric || named) {
        let date: Date | null;
        if (numeric) {
            const parts = numeric[0].split(/[-/.]/);
            if (parts[0].length === 4) parts.reverse();
            date = parseDateInput(parts.join('/'));
        } else {
            const [, day, month, year = String(now.getFullYear())] = named!;
            date = parseDateInput(`${day}/${MONTHS.findIndex(names => names.includes(month)) + 1}/${year}`);
        }
        return date ? toISODateString(date) : null;
    }

    const date = new Date(now);
    const relative = input.match(RELATIVE_DATE);
    if (relative) {
        const count = readSpokenNumber(relative[1] || relative[3]);
        if (count === undefined) return null;
        const unit = relative[2] || relative[4];
        if (/^(month|lun)/.test(unit)) {
            const target = new Date(date.getFullYear(), date.getMonth() - count, 1);
            const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
            target.setDate(Math.min(date.getDate(), lastDay));
            return Number.isFinite(target.getTime()) ? toISODateString(target) : null;
        }
        date.setDate(date.getDate() - count * (/^(week|sapt)/.test(unit) ? 7 : 1));
        return Number.isFinite(date.getTime()) ? toISODateString(date) : null;
    }
    if (/\b(the day before yesterday|alaltaieri)\b/.test(input)) date.setDate(date.getDate() - 2);
    else if (/\b(tomorrow|maine)\b/.test(input)) date.setDate(date.getDate() + 1);
    else if (/\b(next week|saptamana viitoare)\b/.test(input)) date.setDate(date.getDate() + 7);
    else if (/\b(yesterday|ieri)\b/.test(input)) date.setDate(date.getDate() - 1);
    else if (/\b(last week|saptamana trecuta)\b/.test(input)) date.setDate(date.getDate() - 7);
    else if (!/\b(today|azi|astazi)\b/.test(input)) {
        const weekday = WEEKDAYS.findIndex(names => names.some(name => input.split(/\W+/).includes(name)));
        if (weekday < 0) return undefined;
        date.setDate(date.getDate() - ((date.getDay() - weekday + 7) % 7 || 7));
    }
    return toISODateString(date);
}

export function extractExpenseAmount(text: string): number | undefined {
    const input = foldExpenseText(text).replace(NUMERIC_DATE, ' ').replace(NAMED_DATE, ' ').replace(MONTH_FIRST, ' ').replace(RELATIVE_DATE, ' ');
    if (/\b(?:euros?|eur|dollars?|usd|gbp|pounds?|chf)\b|[€$£]|(?:^|\s)[-−]\s*\d|\b(?:minus|negative)\b/.test(input)) return undefined;
    const explicit = [...input.matchAll(/(?:^|[\s(])((?:\d{1,3}(?:[., ]\d{3})+(?:[.,]\d{1,2})?)|\d+(?:[.,]\d{1,2})?)\s*(?:de\s+)?(?:lei|ron)\b/g)];
    const spoken = [...input.matchAll(WRITTEN_AMOUNT)];
    if (explicit.length + spoken.length > 1) return undefined;
    if (explicit.length) {
        const value = explicit[0][1].replace(/([.,])(?=\d{3}(?:[., ]|$))/g, '').replace(/ /g, '').replace(',', '.');
        const amount = Number(value);
        return Number.isFinite(amount) && amount > 0 ? amount : undefined;
    }
    if (spoken.length) {
        const amount = readSpokenNumber(spoken[0][1]);
        return amount && amount > 0 ? amount : undefined;
    }
    if (/\b(?:and|si)\s+\d+(?:[.,]\d{1,2})?\s+(?:for|on|pe|pentru)\b/.test(input)) return undefined;
    const patterns = [
        /\b(?:spent|cheltuit|platit|cost|costa|paid|am dat|add|adauga|bought)\s+(\d+(?:[.,]\d{1,2})?)(?=\s|[!?]|$)/,
        /(?:^|\s)(\d+(?:[.,]\d{1,2})?)\s+(?:for|pentru|pe|on)/,
        /^\s*(\d+(?:[.,]\d{1,2})?)\s*[!?]?\s*$/,
    ];
    for (const pattern of patterns) {
        const amount = Number(input.match(pattern)?.[1]?.replace(',', '.'));
        if (Number.isFinite(amount) && amount > 0) return amount;
    }
    const standalone = readSpokenNumber(input.trim());
    return standalone && standalone > 0 ? standalone : undefined;
}
