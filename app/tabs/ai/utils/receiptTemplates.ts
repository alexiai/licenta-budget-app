interface ReceiptTemplate {
    name: string;
    keywords: string[];
    patterns: {
        total: RegExp[];
        date: RegExp[];
        items: RegExp[];
        vat: RegExp[];
    };
}

export const receiptTemplates: ReceiptTemplate[] = [
    {
        name: 'Profi',
        keywords: ['PROFI ROM FOOD', 'REDIS FIBROBAR'],
        patterns: {
            total: [
                /TOTAL\s*(?:RON|LEI)?\s*(\d+[.,]\d{2})/i,
                /TOTAL PLATA\s*(?:RON|LEI)?\s*(\d+[.,]\d{2})/i
            ],
            date: [
                /(\d{2})[-./](\d{2})[-./](\d{4})/,
                /Data:?\s*(\d{2})[-./](\d{2})[-./](\d{4})/i
            ],
            items: [
                /(\d+[.,]\d{2})\s*(?:x|X)\s*(\d+[.,]\d{2})\s*=?\s*(\d+[.,]\d{2})/,
                /(\d+[.,]\d{2})\s*BUC\s*[xX]\s*(\d+[.,]\d{2})/
            ],
            vat: [
                /TVA\s*(\d+)%\s*:\s*(\d+[.,]\d{2})/i
            ]
        }
    },
    {
        name: 'Kaufland',
        keywords: ['KAUFLAND ROMANIA', 'K-CARD'],
        patterns: {
            total: [
                /TOTAL\s*(?:RON|LEI)?\s*(\d+[.,]\d{2})/i,
                /SUMA TOTALA\s*(?:RON|LEI)?\s*(\d+[.,]\d{2})/i
            ],
            date: [
                /(\d{2})[-./](\d{2})[-./](\d{4})/,
                /Data:?\s*(\d{2})[-./](\d{2})[-./](\d{4})/i
            ],
            items: [
                /(\d+)\s*BUC\.\s*[xX]\s*(\d+[.,]\d{2})\s*=?\s*(\d+[.,]\d{2})/,
                /(\d+[.,]\d{2})\s*(?:x|X)\s*(\d+[.,]\d{2})/
            ],
            vat: [
                /TVA\s*(\d+)%\s*:\s*(\d+[.,]\d{2})/i,
                /Cota TVA\s*(\d+)%\s*:\s*(\d+[.,]\d{2})/i
            ]
        }
    },
    {
        name: 'Lidl',
        keywords: ['LIDL DISCOUNT', 'LIDL ROMANIA'],
        patterns: {
            total: [
                /TOTAL\s*(?:RON|LEI)?\s*(\d+[.,]\d{2})/i,
                /SUMA DE PLATA\s*(?:RON|LEI)?\s*(\d+[.,]\d{2})/i
            ],
            date: [
                /(\d{2})[-./](\d{2})[-./](\d{4})/,
                /Data:?\s*(\d{2})[-./](\d{2})[-./](\d{4})/i
            ],
            items: [
                /(\d+)\s*(?:BUC|X)\s*[xX]\s*(\d+[.,]\d{2})\s*=?\s*(\d+[.,]\d{2})/,
                /(\d+[.,]\d{2})\s*(?:x|X)\s*(\d+[.,]\d{2})/
            ],
            vat: [
                /TVA\s*(\d+)%\s*:\s*(\d+[.,]\d{2})/i
            ]
        }
    }
];

export interface ExtractedReceiptData {
    total?: number;
    date?: string;
    items: Array<{
        quantity: number;
        price: number;
        total: number;
    }>;
    vat: Array<{
        percentage: number;
        amount: number;
    }>;
    template?: string;
    confidence: number;
}

export const matchReceiptTemplate = (text: string): ReceiptTemplate | null => {
    for (const template of receiptTemplates) {
        const matchCount = template.keywords.reduce((count, keyword) => {
            return count + (text.toUpperCase().includes(keyword) ? 1 : 0);
        }, 0);

        if (matchCount > 0) {
            return template;
        }
    }
    return null;
};

export const extractReceiptData = (text: string, template?: ReceiptTemplate): ExtractedReceiptData => {
    const result: ExtractedReceiptData = {
        items: [],
        vat: [],
        confidence: 0
    };

    let matchCount = 0;
    let totalPatterns = 0;

    const templates = template ? [template] : receiptTemplates;

    for (const tmpl of templates) {
        // Try to extract total
        for (const pattern of tmpl.patterns.total) {
            totalPatterns++;
            const match = text.match(pattern);
            if (match && match[1]) {
                result.total = parseFloat(match[1].replace(',', '.'));
                matchCount++;
                break;
            }
        }

        // Try to extract date
        for (const pattern of tmpl.patterns.date) {
            totalPatterns++;
            const match = text.match(pattern);
            if (match) {
                const [_, day, month, year] = match;
                result.date = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                matchCount++;
                break;
            }
        }

        // Try to extract items
        for (const pattern of tmpl.patterns.items) {
            totalPatterns++;
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                const [_, quantity, price, total] = match;
                result.items.push({
                    quantity: parseFloat(quantity.replace(',', '.')),
                    price: parseFloat(price.replace(',', '.')),
                    total: total ? parseFloat(total.replace(',', '.')) : 
                           parseFloat(quantity.replace(',', '.')) * parseFloat(price.replace(',', '.'))
                });
                matchCount++;
            }
        }

        // Try to extract VAT
        for (const pattern of tmpl.patterns.vat) {
            totalPatterns++;
            const matches = text.matchAll(pattern);
            for (const match of matches) {
                const [_, percentage, amount] = match;
                result.vat.push({
                    percentage: parseInt(percentage),
                    amount: parseFloat(amount.replace(',', '.'))
                });
                matchCount++;
            }
        }
    }

    // Calculate confidence based on number of successful matches
    result.confidence = (matchCount / totalPatterns) * 100;
    result.template = template?.name;

    return result;
}; 