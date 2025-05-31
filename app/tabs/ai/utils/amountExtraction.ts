
import { OCRWord, ReceiptPattern } from '../hooks/useOCR';
import { analyzeReceiptLayout, extractProductLines, shouldSkipLine, extractPriceFromLine, detectMerchantAdvanced } from './receiptExtraction';

export const extractAmountWithSpatialAwareness = (words: OCRWord[], text: string, similarReceipts: ReceiptPattern[]): number | null => {
    const layout = analyzeReceiptLayout(words, 1000, 1000);
    const merchant = detectMerchantAdvanced(text);

    console.log('🧾 Smart amount extraction starting...');
    console.log('🏪 Merchant:', merchant?.name || 'Unknown');

    const totalPrices = layout.priceRegions.filter(p => p.type === 'total');
    if (totalPrices.length > 0) {
        const bestTotal = totalPrices.sort((a, b) => b.confidence - a.confidence)[0];
        const amount = parseFloat(bestTotal.word.text.replace(',', '.'));
        console.log(`💰 Found explicit total: ${amount} RON`);
        return amount;
    }

    if (similarReceipts.length > 0) {
        console.log(`📚 Using patterns from ${similarReceipts.length} similar receipts`);
    }

    const itemPrices = layout.priceRegions.filter(p => p.type === 'item');
    if (itemPrices.length === 1) {
        const amount = parseFloat(itemPrices[0].word.text.replace(',', '.'));
        console.log(`💰 Single item detected: ${amount} RON`);
        return amount;
    }

    const productLines = extractProductLines(words);
    let totalCalculated = 0;
    let itemCount = 0;

    for (const line of productLines) {
        const lineText = line.words.map(w => w.text).join(' ');
        console.log(`📝 Analyzing line: "${lineText}"`);

        if (shouldSkipLine(lineText)) {
            console.log(`⏭️ Skipping noise line`);
            continue;
        }

        const price = extractPriceFromLine(lineText);
        if (price && price > 0 && price < 1000) {
            console.log(`💰 Found item price: ${price} RON`);
            totalCalculated += price;
            itemCount++;
        }
    }

    if (itemCount > 0) {
        console.log(`📊 Calculated total from ${itemCount} items: ${totalCalculated} RON`);
        return totalCalculated;
    }

    const allPrices = layout.priceRegions
        .map(p => parseFloat(p.word.text.replace(',', '.')))
        .filter(p => p > 0 && p < 1000)
        .sort((a, b) => b - a);

    if (allPrices.length > 0) {
        console.log(`💰 Fallback: using largest amount: ${allPrices[0]} RON`);
        return allPrices[0];
    }

    console.log('❌ Could not extract amount');
    return null;
};
