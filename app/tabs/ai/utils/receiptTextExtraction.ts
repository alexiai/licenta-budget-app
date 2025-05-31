// Translation function (placeholder - replace with actual translation service)
export const translateText = async (text: string): Promise<string> => {
    // For now, just return the original text
    // TODO: Implement actual translation service
    return text;
};

// Extract amount from text using regex patterns
export const extractAmountFromText = (text: string): number | undefined => {
    // Common Romanian currency patterns
    const patterns = [
        /(\d+[.,]\d{2})\s*(?:RON|LEI|ron|lei)/i,  // 123.45 RON or 123,45 LEI
        /(\d+)[.,](\d{2})/,  // Basic decimal number
        /(\d+)\s*(?:RON|LEI|ron|lei)/i  // Whole numbers with currency
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            // Convert to standard decimal format
            const amount = match[1].replace(',', '.');
            return parseFloat(amount);
        }
    }

    return undefined;
};

// Extract date from text using regex patterns
export const extractDateFromText = (text: string): string | undefined => {
    // Common Romanian date patterns
    const patterns = [
        // DD.MM.YYYY or DD-MM-YYYY
        /(\d{1,2})[.-](\d{1,2})[.-](\d{4})/,
        // YYYY-MM-DD
        /(\d{4})-(\d{1,2})-(\d{1,2})/,
        // DD/MM/YYYY
        /(\d{1,2})\/(\d{1,2})\/(\d{4})/
    ];

    for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
            // Convert to YYYY-MM-DD format
            let [_, d, m, y] = match;
            
            // Handle YYYY-MM-DD format differently
            if (match[1].length === 4) {
                [_, y, m, d] = match;
            }

            // Pad month and day with leading zeros if needed
            const month = m.padStart(2, '0');
            const day = d.padStart(2, '0');

            // Basic validation
            const monthNum = parseInt(month);
            const dayNum = parseInt(day);
            const yearNum = parseInt(y);

            if (monthNum >= 1 && monthNum <= 12 &&
                dayNum >= 1 && dayNum <= 31 &&
                yearNum >= 2000 && yearNum <= new Date().getFullYear()) {
                return `${y}-${month}-${day}`;
            }
        }
    }

    return undefined;
};
