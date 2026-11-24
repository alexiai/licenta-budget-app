import romanianToEnglish from '../translationDictionary';
import { findCategoryByContext, findCategoryByProduct, type ReceiptContext } from '../productAssociation';
import { findStoreInText } from './storeNames';
import { extractExpenseAmount, extractExpenseDate } from './chatExpenseParsing';
import { toISODateString } from './dateUtils';
import { foldExpenseText } from './spokenExpenseNumbers';

export type ChatLanguage = 'en' | 'ro';

const phrases = new Map(Object.entries(romanianToEnglish).map(([phrase, translation]) =>
    [foldExpenseText(phrase), translation]));
const maxPhraseLength = Math.max(...[...phrases.keys()].map(phrase => phrase.split(/\s+/).length));

export function translateExpenseVocabulary(text: string): string {
    const words = foldExpenseText(text).match(/[a-z0-9]+/g) ?? [];
    const translated: string[] = [];
    for (let i = 0; i < words.length;) {
        let end = Math.min(words.length, i + maxPhraseLength);
        while (end > i && !phrases.has(words.slice(i, end).join(' '))) end--;
        if (end === i) end++;
        const phrase = words.slice(i, end).join(' ');
        translated.push(phrases.get(phrase) ?? phrase);
        i = end;
    }
    return translated.join(' ');
}

export function detectExpenseLanguage(text: string, fallback: ChatLanguage = 'en'): ChatLanguage {
    const input = foldExpenseText(text);
    if (/[ăâîșțşţ]/i.test(text) || /\b(cheltuit|platit|cumparat|pentru|azi|astazi|ieri|alaltaieri|acum|adauga|cafea|chirie)\b/.test(input)) return 'ro';
    if (/\b(spent|paid|bought|add|for|yesterday|today|ago|groceries|coffee)\b/.test(input)) return 'en';
    return /\blei\b/.test(input) ? 'ro' : fallback;
}

export function classifyExpenseText(text: string, receipts: ReceiptContext[] = []) {
    return findStoreInText(text)
        ?? findCategoryByContext(text, receipts)
        ?? findCategoryByProduct(translateExpenseVocabulary(text));
}

export function parseChatExpense(text: string, now = new Date(), receipts: ReceiptContext[] = []) {
    const match = classifyExpenseText(text, receipts);
    const date = extractExpenseDate(text, now);
    return {
        amount: extractExpenseAmount(text),
        date: date === undefined ? toISODateString(now) : date ?? undefined,
        category: match?.category,
        subcategory: match?.subcategory,
        note: text.trim(),
    };
}
