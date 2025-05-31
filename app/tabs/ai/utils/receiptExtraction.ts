import { OCRWord } from '../hooks/useOCR';

export const detectMerchantAdvanced = (text: string): { name: string; type: string; confidence: number } | null => {
    const textLower = text.toLowerCase();
    const merchants = {
        'kaufland': { name: 'Kaufland', type: 'supermarket', patterns: ['kaufland', 'kauf land'] },
        'carrefour': { name: 'Carrefour', type: 'supermarket', patterns: ['carrefour', 'carref', 'carr'] },
        'mega image': { name: 'Mega Image', type: 'supermarket', patterns: ['mega image', 'mega', 'megaimage'] },
        'lidl': { name: 'Lidl', type: 'supermarket', patterns: ['lidl', 'lid l'] },
        'penny': { name: 'Penny Market', type: 'supermarket', patterns: ['penny', 'penny market'] },
        'auchan': { name: 'Auchan', type: 'hypermarket', patterns: ['auchan', 'auch'] },
        'cora': { name: 'Cora', type: 'hypermarket', patterns: ['cora'] },
        'petrom': { name: 'Petrom', type: 'gas_station', patterns: ['petrom', 'petr'] },
        'omv': { name: 'OMV', type: 'gas_station', patterns: ['omv', 'o m v'] },
        'lukoil': { name: 'Lukoil', type: 'gas_station', patterns: ['lukoil', 'luk'] },
        'rompetrol': { name: 'Rompetrol', type: 'gas_station', patterns: ['rompetrol', 'romp'] },
        'mol': { name: 'MOL', type: 'gas_station', patterns: ['mol', 'm o l'] },
        'mcdonald': { name: 'McDonald\'s', type: 'fast_food', patterns: ['mcdonald', 'mcdonalds', 'mc donald'] },
        'kfc': { name: 'KFC', type: 'fast_food', patterns: ['kfc', 'k f c', 'kentucky'] },
        'subway': { name: 'Subway', type: 'fast_food', patterns: ['subway', 'sub way'] },
        'starbucks': { name: 'Starbucks', type: 'coffee_shop', patterns: ['starbucks', 'star bucks'] },
        'costa coffee': { name: 'Costa Coffee', type: 'coffee_shop', patterns: ['costa coffee', 'costa'] },
        'panificatie': { name: 'Bakery', type: 'bakery', patterns: ['panificatie', 'brutarie', 'paine', 'bread'] },
        'patiserie': { name: 'Pastry Shop', type: 'pastry', patterns: ['patiserie', 'cofetarie', 'prajituri'] }
    };

    let bestMatch: { name: string; type: string; confidence: number } | null = null;
    let highestConfidence = 0;

    for (const [key, info] of Object.entries(merchants)) {
        for (const pattern of info.patterns) {
            if (textLower.includes(pattern)) {
                const confidence = pattern.length >= 4 ? 90 : 70;
                if (confidence > highestConfidence) {
                    highestConfidence = confidence;
                    bestMatch = { name: info.name, type: info.type, confidence };
                }
            }
        }
    }

    if (bestMatch) {
        console.log(`🏪 Merchant detected: ${bestMatch.name} (${bestMatch.type}) - confidence: ${bestMatch.confidence}%`);
    }

    return bestMatch;
};

export const analyzeReceiptLayout = (words: OCRWord[], imageWidth: number, imageHeight: number) => {
    if (!Array.isArray(words)) {
        console.warn('Words parameter is not an array in analyzeReceiptLayout');
        return {
            dateRegions: [],
            priceRegions: [],
            itemLines: [],
            topSection: [],
            bottomSection: [],
            rightSection: [],
            leftSection: []
        };
    }

    console.log('📐 Analyzing receipt layout with', words.length, 'words');

    const layout = {
        dateRegions: [] as Array<{ word: OCRWord; region: string; confidence: number }>,
        priceRegions: [] as Array<{ word: OCRWord; type: 'item' | 'total'; confidence: number }>,
        itemLines: [] as Array<{ words: OCRWord[]; estimatedPrice?: number }>,
        topSection: [] as OCRWord[],
        bottomSection: [] as OCRWord[],
        rightSection: [] as OCRWord[],
        leftSection: [] as OCRWord[]
    };

    const topY = imageHeight * 0.25;
    const bottomY = imageHeight * 0.75;
    const rightX = imageWidth * 0.75;
    const leftX = imageWidth * 0.25;

    words.forEach(word => {
        if (!word || typeof word.text !== 'string') return;

        const centerX = (word.bbox?.x0 ?? 0 + word.bbox?.x1 ?? 0) / 2;
        const centerY = (word.bbox?.y0 ?? 0 + word.bbox?.y1 ?? 0) / 2;

        if (centerY < topY) {
            layout.topSection.push(word);
        } else if (centerY > bottomY) {
            layout.bottomSection.push(word);
        }

        if (centerX > rightX) {
            layout.rightSection.push(word);
        } else if (centerX < leftX) {
            layout.leftSection.push(word);
        }

        const datePattern = /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/;
        if (datePattern.test(word.text)) {
            let region = 'middle';
            let confidence = 60;

            if (centerY < topY && centerX > rightX) {
                region = 'top-right';
                confidence = 95;
            } else if (centerY < topY && centerX < leftX) {
                region = 'top-left';
                confidence = 80;
            } else if (centerY > bottomY) {
                region = 'bottom';
                confidence = 85;
            }

            layout.dateRegions.push({ word, region, confidence });
            console.log(`📅 Found date "${word.text}" in ${region} region (confidence: ${confidence}%)`);
        }

        const pricePattern = /\d+[.,]\d{2}/;
        if (pricePattern.test(word.text)) {
            const price = parseFloat(word.text.replace(',', '.'));
            if (price > 0 && price < 10000) {
                const isTotal = /total|suma|plata/i.test(
                    words.filter(w =>
                        Math.abs(w.bbox.y0 - word.bbox.y0) < 20 &&
                        w.bbox.x0 < word.bbox.x0
                    ).map(w => w.text).join(' ')
                );

                layout.priceRegions.push({
                    word,
                    type: isTotal ? 'total' : 'item',
                    confidence: isTotal ? 90 : 70
                });
            }
        }
    });

    return layout;
};

export const extractProductLines = (words: OCRWord[]): Array<{ words: OCRWord[]; y: number }> => {
    if (!Array.isArray(words)) {
        console.warn('Words parameter is not an array in extractProductLines');
        return [];
    }

    const lines: Array<{ words: OCRWord[]; y: number }> = [];
    const tolerance = 10;

    words.forEach(word => {
        if (!word || !word.bbox) return;

        const wordY = word.bbox.y0 ?? 0;
        let addedToLine = false;

        for (const line of lines) {
            if (Math.abs(line.y - wordY) <= tolerance) {
                line.words.push(word);
                addedToLine = true;
                break;
            }
        }

        if (!addedToLine) {
            lines.push({ words: [word], y: wordY });
        }
    });

    lines.sort((a, b) => a.y - b.y);
    lines.forEach(line => {
        if (Array.isArray(line.words)) {
            line.words.sort((a, b) => (a.bbox?.x0 ?? 0) - (b.bbox?.x0 ?? 0));
        }
    });

    return lines;
};

export const shouldSkipLine = (lineText: string): boolean => {
    const lowerText = lineText.toLowerCase();
    const skipPatterns = [
        /^[\d\s\-\/\.]{1,15}$/,
        /casier|operator|casa/i,
        /tva|subtotal|total/i,
        /bon fiscal|nr\.|cod/i,
        /multumesc|multumim|thank/i,
        /^[\W]{1,5}$/,
        /adresa|telefon|str\./i,
        /plata|card|numerar/i,
        /rest|change/i
    ];

    return skipPatterns.some(pattern => pattern.test(lowerText)) ||
        lowerText.length < 3 ||
        lowerText.length > 100;
};

export const extractPriceFromLine = (lineText: string): number | null => {
    const patterns = [
        /^(.+?)\s+(\d+[.,]\d{2})\s*$/,
        /(\d+[.,]\d{2})/,
        /x\s*(\d+[.,]\d{2})/
    ];

    for (const pattern of patterns) {
        const match = lineText.match(pattern);
        if (match) {
            const priceStr = match[match.length - 1];
            const price = parseFloat(priceStr.replace(',', '.'));
            if (price > 0 && price < 1000) {
                return price;
            }
        }
    }

    return null;
};
