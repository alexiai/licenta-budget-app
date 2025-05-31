import { translateText, detectLanguage } from './textProcessing';
import { findCategoryByProduct } from '../../../../lib/productAssociation';
import categories from '../../../../lib/categories';

export interface ParsedExpense {
    amount?: number;
    date?: string;
    category?: string;
    subcategory?: string;
    note?: string;
    confidence?: number;
}

export { findCategoryByProduct };

const extractDateFromText = async (text: string): Promise<string | null> => {
    const datePatterns = [
        /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
        /(?:azi|today|astăzi)/gi,
        /(?:ieri|yesterday)/gi,
        /(?:alaltăieri|day before yesterday)/gi
    ];

    for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
            if (/(?:azi|today|astăzi)/gi.test(text)) {
                return new Date().toISOString().split('T')[0];
            } else if (/(?:ieri|yesterday)/gi.test(text)) {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                return yesterday.toISOString().split('T')[0];
            } else if (/(?:alaltăieri|day before yesterday)/gi.test(text)) {
                const dayBefore = new Date();
                dayBefore.setDate(dayBefore.getDate() - 2);
                return dayBefore.toISOString().split('T')[0];
            } else {
                const [_, day, month, year] = match;
                const fullYear = parseInt(year) < 100 ? 2000 + parseInt(year) : parseInt(year);
                const date = new Date(fullYear, parseInt(month) - 1, parseInt(day));
                if (!isNaN(date.getTime())) {
                    return date.toISOString().split('T')[0];
                }
            }
        }
    }
    return null;
};

export const parseExpenseFromText = async (text: string): Promise<ParsedExpense> => {
    const result: ParsedExpense = {
        confidence: 0,
        note: text
    };

    try {
        let matchCount = 0;
        let totalChecks = 0;

        // Amount patterns
        const amountPatterns = [
            /total:?\s*(\d+(?:[.,]\d{1,2})?)/i,
            /suma:?\s*(\d+(?:[.,]\d{1,2})?)/i,
            /(\d+(?:[.,]\d{1,2})?)\s*(?:RON|LEI)/i,
            /(\d+(?:[.,]\d{1,2})?)\s*(?:for|pentru)/gi,
        ];

        totalChecks += amountPatterns.length;
        for (const pattern of amountPatterns) {
            const match = text.match(pattern);
            if (match && match[1]) {
                result.amount = parseFloat(match[1].replace(',', '.'));
                matchCount++;
                break;
            }
        }

        // Date patterns
        const dateMatch = await extractDateFromText(text);
        totalChecks++;
        if (dateMatch) {
            result.date = dateMatch;
            matchCount++;
        }

        // Category matching
        const categoryMatch = findCategoryByProduct(text.toLowerCase());
        totalChecks++;
        if (categoryMatch) {
            result.category = categoryMatch.category;
            result.subcategory = categoryMatch.subcategory;
            matchCount++;
        }

        // Calculate final confidence
        result.confidence = Math.round((matchCount / totalChecks) * 100);

        console.log(`📊 Parsing result: amount=${result.amount}, category=${result.category}, date=${result.date}, confidence=${result.confidence}`);

        return result;
    } catch (error) {
        console.error('Error parsing expense:', error);
        return {
            confidence: 0,
            note: 'Failed to parse expense'
        };
    }
};
