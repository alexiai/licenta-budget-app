import type { ExpenseData } from '../../components/bunnyAssistant/types';
import { findCategoryByProduct } from '../productAssociation';
import { parseExpenseDate, toISODateString } from './dateUtils';

interface Receipt {
    total?: number | string;
    date?: string;
    currency?: string;
    merchant_name?: string;
    items?: { description?: string }[];
}

export function parseReceiptExpense(receipt: Receipt, today = new Date()): Omit<ExpenseData, 'id'> & { confidence: number } {
    const amount = Number(String(receipt.total ?? '').trim().replace(',', '.'));
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('The receipt did not contain a valid total.');
    const currency = receipt.currency?.toUpperCase();
    if (currency && currency !== 'RON' && currency !== 'LEI') {
        throw new Error('Enter the receipt total in RON manually.');
    }
    const date = receipt.date ? parseExpenseDate(receipt.date) : today;
    if (!date) throw new Error('The receipt date could not be read.');
    const hints = [receipt.merchant_name, ...(receipt.items ?? []).map(item => item.description)];
    const category = hints.filter((hint): hint is string => !!hint)
        .map(hint => findCategoryByProduct(hint)).find(match => match !== null);
    return {
        amount,
        category: category?.category ?? 'Other',
        subcategory: category?.subcategory ?? 'Miscellaneous',
        date: toISODateString(date),
        note: receipt.merchant_name ?? 'OCR receipt scan',
        confidence: category?.confidence ?? 0,
    };
}
