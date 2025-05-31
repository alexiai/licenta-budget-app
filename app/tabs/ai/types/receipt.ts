import { OCRWord } from './ocr';

export interface ReceiptPattern {
    id: string;
    ocrText: string;
    extractedData: {
        amount?: number;
        date?: string;
        category?: string;
        subcategory?: string;
        merchantName?: string;
    };
    userCorrections?: {
        amount?: number;
        date?: string;
    };
    merchant?: string;
    layout?: {
        datePosition?: {
            region: string;
            confidence: number;
        };
        amountPosition?: {
            region: string;
            confidence: number;
        };
    };
    timestamp: string;
}

export interface OCRSearchParams {
    text: string;
    confidence: number;
    template: string;
}

export interface ReceiptRegion {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface ReceiptLayout {
    dateRegions: Array<{
        word: OCRWord;
        region: string;
        confidence: number;
    }>;
    priceRegions: Array<{
        word: OCRWord;
        type: 'total' | 'item';
        confidence: number;
    }>;
    merchantRegion?: {
        text: string;
        confidence: number;
    };
} 