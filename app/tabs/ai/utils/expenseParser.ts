
import { translateText } from './textProcessing';
import { findCategoryByProduct } from '../../../../lib/productAssociation';
import categories from '../../../../lib/categories';

export interface ParsedExpense {
    amount?: number;
    category?: string;
    subcategory?: string;
    date?: string;
    note?: string;
    confidence: number;
}

export const parseRelativeDate = (text: string): string | null => {
    const combinedText = text.toLowerCase();

    const relativeDatePatterns = [
        { pattern: /acum\s+(\d+)\s+(?:zile|zi)/gi, unit: 'days', multiplier: -1 },
        { pattern: /(?:acum\s+)?(\d+)\s+(?:zile|zi)\s+(?:în urmă|inainte)/gi, unit: 'days', multiplier: -1 },
        { pattern: /(?:acum\s+)?(\d+)\s+(?:săptămâni|săptămână)\s+(?:în urmă|inainte)/gi, unit: 'weeks', multiplier: -1 },
        { pattern: /(?:acum\s+)?(\d+)\s+(?:luni|lună)\s+(?:în urmă|inainte)/gi, unit: 'months', multiplier: -1 },
        { pattern: /(?:peste\s+)?(\d+)\s+(?:zile|zi)/gi, unit: 'days', multiplier: 1 },
        { pattern: /(?:peste\s+)?(\d+)\s+(?:săptămâni|săptămână)/gi, unit: 'weeks', multiplier: 1 },
        { pattern: /(\d+)\s+days?\s+ago/gi, unit: 'days', multiplier: -1 },
        { pattern: /(\d+)\s+weeks?\s+ago/gi, unit: 'weeks', multiplier: -1 },
        { pattern: /(\d+)\s+months?\s+ago/gi, unit: 'months', multiplier: -1 },
        { pattern: /in\s+(\d+)\s+days?/gi, unit: 'days', multiplier: 1 },
        { pattern: /in\s+(\d+)\s+weeks?/gi, unit: 'weeks', multiplier: 1 },
    ];

    for (const { pattern, unit, multiplier } of relativeDatePatterns) {
        const match = combinedText.match(pattern);
        if (match) {
            const numberMatch = match[0].match(/(\d+)/);
            if (numberMatch) {
                const number = parseInt(numberMatch[1]) * multiplier;
                const targetDate = new Date();

                if (unit === 'days') {
                    targetDate.setDate(targetDate.getDate() + number);
                } else if (unit === 'weeks') {
                    targetDate.setDate(targetDate.getDate() + (number * 7));
                } else if (unit === 'months') {
                    targetDate.setMonth(targetDate.getMonth() + number);
                }

                console.log(`🗓️ Relative date detected: "${match[0]}" → ${targetDate.toISOString().split('T')[0]}`);
                return targetDate.toISOString().split('T')[0];
            }
        }
    }

    return null;
};

export const createCategoryMapping = () => {
    const mapping: { [key: string]: { category: string; subcategory: string } } = {};

    mapping['benzinărie,gas,fuel,combustibil,petrol'] = { category: 'Transport', subcategory: 'Gas' };
    mapping['uber,taxi,rideshare,bolt'] = { category: 'Transport', subcategory: 'Taxi' };
    mapping['autobuz,bus,metro,subway,transport public'] = { category: 'Transport', subcategory: 'Public Transport' };

    mapping['magazin,grocery,supermarket,kaufland,carrefour,mega'] = { category: 'Food & Drinks', subcategory: 'Groceries' };
    mapping['restaurant,mâncare,food,dining'] = { category: 'Food & Drinks', subcategory: 'Restaurant' };
    mapping['cafea,coffee,cappuccino,latte,espresso'] = { category: 'Food & Drinks', subcategory: 'Coffee' };
    mapping['băutură,drink,bere,beer,wine,vin'] = { category: 'Food & Drinks', subcategory: 'Drinks' };
    mapping['gogoașă,gogoasa,donut,desert,dulciuri,prăjitură,tort,înghețată,ciocolată'] = { category: 'Food & Drinks', subcategory: 'Coffee' };

    mapping['chirie,rent,închiriere'] = { category: 'Housing', subcategory: 'Rent' };
    mapping['electricitate,electricity,curent'] = { category: 'Housing', subcategory: 'Electricity' };
    mapping['apă,water,canal'] = { category: 'Housing', subcategory: 'Water' };
    mapping['internet,wifi,broadband'] = { category: 'Housing', subcategory: 'Internet' };
    mapping['întreținere,maintenance,reparații'] = { category: 'Housing', subcategory: 'Maintenance' };

    mapping['haine,clothes,îmbrăcăminte,shopping'] = { category: 'Lifestyle', subcategory: 'Clothes' };
    mapping['înfrumusețare,beauty,cosmetice,parfum'] = { category: 'Lifestyle', subcategory: 'Beauty' };
    mapping['sport,gym,fitness,sală'] = { category: 'Lifestyle', subcategory: 'Sports' };

    mapping['doctor,medic,hospital,spital'] = { category: 'Health', subcategory: 'Doctor' };
    mapping['medicament,pills,pastile,pharmacy,farmacie'] = { category: 'Health', subcategory: 'Medication' };

    mapping['film,movie,cinema,concert,show'] = { category: 'Entertainment', subcategory: 'Movies' };
    mapping['jocuri,games,gaming'] = { category: 'Entertainment', subcategory: 'Games' };

    mapping['economii,savings,save'] = { category: 'Savings', subcategory: 'Savings' };

    mapping['pâine,bread,paine alba,franzela,chifla'] = { category: 'Food & Drinks', subcategory: 'Groceries' };

    return mapping;
};

export const parseExpenseFromText = async (text: string): Promise<ParsedExpense> => {
    const originalText = text;
    let translatedText = text;

    const detectedLang = await import('./textProcessing').then(module => module.detectLanguage(text));
    if (detectedLang === 'ro') {
        translatedText = await translateText(text, 'ro', 'en');
    }

    const result: ParsedExpense = {
        note: originalText,
        confidence: 0,
    };

    const amountPatterns = [
        /(\d+(?:[.,]\d{1,2})?)\s*(?:lei|ron|euros?|dollars?|\$|€)/gi,
        /(?:spent|cheltuit|plătit|cost|costa)\s*(\d+(?:[.,]\d{1,2})?)/gi,
        /(\d+(?:[.,]\d{1,2})?)\s*(?:for|pentru)/gi,
    ];

    for (const pattern of amountPatterns) {
        const match = text.match(pattern);
        if (match) {
            const numberMatch = match[0].match(/(\d+(?:[.,]\d{1,2})?)/);
            if (numberMatch) {
                result.amount = parseFloat(numberMatch[1].replace(',', '.'));
                result.confidence += 30;
                break;
            }
        }
    }

    const combinedText = (originalText + ' ' + translatedText).toLowerCase();

    const relativeDate = parseRelativeDate(combinedText);
    if (relativeDate) {
        result.date = relativeDate;
        result.confidence += 25;
    } else {
        const absoluteDatePatterns = [
            /(?:azi|today|astăzi)/gi,
            /(?:ieri|yesterday)/gi,
            /(?:alaltăieri|day before yesterday)/gi,
            /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
        ];

        for (const pattern of absoluteDatePatterns) {
            if (pattern.test(text)) {
                if (/(?:azi|today|astăzi)/gi.test(text)) {
                    result.date = new Date().toISOString().split('T')[0];
                } else if (/(?:ieri|yesterday)/gi.test(text)) {
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    result.date = yesterday.toISOString().split('T')[0];
                } else if (/(?:alaltăieri|day before yesterday)/gi.test(text)) {
                    const dayBefore = new Date();
                    dayBefore.setDate(dayBefore.getDate() - 2);
                    result.date = dayBefore.toISOString().split('T')[0];
                } else {
                    const dateMatch = text.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);
                    if (dateMatch) {
                        const day = parseInt(dateMatch[1]);
                        const month = parseInt(dateMatch[2]) - 1;
                        const year = parseInt(dateMatch[3]);
                        const fullYear = year < 100 ? 2000 + year : year;

                        const parsedDate = new Date(fullYear, month, day);
                        if (!isNaN(parsedDate.getTime())) {
                            result.date = parsedDate.toISOString().split('T')[0];
                        }
                    }
                }
                result.confidence += 20;
                break;
            }
        }
    }

    const categoryText = (originalText + ' ' + translatedText).toLowerCase();
    console.log(`🔍 Analyzing text for categories: "${categoryText}"`);

    const productMatch = findCategoryByProduct(categoryText);
    if (productMatch) {
        result.category = productMatch.category;
        result.subcategory = productMatch.subcategory;
        result.confidence += productMatch.confidence;
        console.log(`✅ Product association match: ${productMatch.category} (${productMatch.subcategory}) - confidence: ${productMatch.confidence}%`);
    } else {
        const categoryMapping = createCategoryMapping();
        for (const [keywords, categoryInfo] of Object.entries(categoryMapping)) {
            const keywordList = keywords.split(',').map(k => k.trim().toLowerCase());
            if (keywordList.some(keyword => categoryText.includes(keyword))) {
                result.category = categoryInfo.category;
                result.subcategory = categoryInfo.subcategory;
                result.confidence += 25;
                console.log(`✅ Manual mapping match: ${categoryInfo.category} (${categoryInfo.subcategory})`);
                break;
            }
        }
    }

    console.log(`📊 Parsing result: amount=${result.amount}, category=${result.category}, date=${result.date}, confidence=${result.confidence}`);

    return result;
};
