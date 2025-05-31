
import { useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { romanianToEnglish } from '../../../../lib/translationDictionary';

export interface OCRWord {
    text: string;
    confidence: number;
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

export interface ReceiptPattern {
    id: string;
    ocrText: string;
    extractedData: {
        amount: number;
        date: string;
        items: Array<{ name: string; price: number }>;
    };
    userCorrections?: {
        originalAmount?: number;
        correctedAmount?: number;
        originalDate?: string;
        correctedDate?: string;
    };
    merchant?: string;
    layout: {
        datePosition?: { x: number; y: number; region: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'middle' };
        totalPosition?: { x: number; y: number };
        itemsRegion?: { startY: number; endY: number };
    };
    timestamp: string;
}

export const useOCR = () => {
    const workerRef = useRef<any>(null);

    const loadReceiptPatterns = () => {
        try {
            const savedPatterns = localStorage.getItem('receiptPatterns');
            if (savedPatterns) {
                return JSON.parse(savedPatterns);
            }
        } catch (error) {
            console.log('Error loading receipt patterns:', error);
        }
        return [];
    };

    const saveReceiptPatterns = (patterns: ReceiptPattern[]) => {
        try {
            localStorage.setItem('receiptPatterns', JSON.stringify(patterns));
            console.log('💾 Saved receipt patterns:', patterns.length);
        } catch (error) {
            console.log('Error saving receipt patterns:', error);
        }
    };

    const findSimilarReceipts = (ocrText: string, receiptPatterns: ReceiptPattern[]): ReceiptPattern[] => {
        const textLower = ocrText.toLowerCase();
        const words = textLower.split(/\s+/).filter(w => w.length > 2);

        return receiptPatterns
            .map(pattern => {
                const patternWords = pattern.ocrText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                const commonWords = words.filter(word => patternWords.includes(word));
                const similarity = commonWords.length / Math.max(words.length, patternWords.length);

                return { pattern, similarity };
            })
            .filter(({ similarity }) => similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .map(({ pattern }) => pattern);
    };

    const preprocessImage = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): HTMLCanvasElement => {
        const width = canvas.width;
        const height = canvas.height;
        const imageData = ctx.getImageData(0, 0, width, height);
        const data = imageData.data;

        const grayData = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
            grayData[i / 4] = gray;
        }

        const histogram = new Array(256).fill(0);
        for (let i = 0; i < grayData.length; i++) {
            histogram[grayData[i]]++;
        }

        let sum = 0;
        for (let i = 0; i < 256; i++) {
            sum += i * histogram[i];
        }

        let sumB = 0;
        let wB = 0;
        let wF = 0;
        let mB, mF, max = 0.0;
        let between = 0.0;
        let threshold1 = 0.0;
        let threshold2 = 0.0;

        for (let i = 0; i < 256; i++) {
            wB += histogram[i];
            if (wB === 0) continue;

            wF = grayData.length - wB;
            if (wF === 0) break;

            sumB += i * histogram[i];
            mB = sumB / wB;
            mF = (sum - sumB) / wF;
            between = wB * wF * (mB - mF) * (mB - mF);

            if (between > max) {
                max = between;
                threshold1 = i;
            }
        }

        const adaptiveThreshold = Math.max(threshold1, 120);

        const processedData = new Uint8ClampedArray(data.length);
        for (let i = 0; i < grayData.length; i++) {
            const pixelIndex = i * 4;
            let gray = grayData[i];

            gray = Math.min(255, Math.max(0, (gray - 128) * 1.2 + 128));

            const binaryValue = gray > adaptiveThreshold ? 255 : 0;

            processedData[pixelIndex] = binaryValue;
            processedData[pixelIndex + 1] = binaryValue;
            processedData[pixelIndex + 2] = binaryValue;
            processedData[pixelIndex + 3] = data[pixelIndex + 3];
        }

        const morphologyData = new Uint8ClampedArray(processedData);
        const kernelSize = 3;
        const halfKernel = Math.floor(kernelSize / 2);

        for (let y = halfKernel; y < height - halfKernel; y++) {
            for (let x = halfKernel; x < width - halfKernel; x++) {
                let minVal = 255, maxVal = 0;

                for (let ky = -halfKernel; ky <= halfKernel; ky++) {
                    for (let kx = -halfKernel; kx <= halfKernel; kx++) {
                        const neighborIndex = ((y + ky) * width + (x + kx)) * 4;
                        const val = processedData[neighborIndex];
                        minVal = Math.min(minVal, val);
                        maxVal = Math.max(maxVal, val);
                    }
                }

                const currentIndex = (y * width + x) * 4;
                const processedValue = (maxVal + minVal) > 255 ? 255 : 0;
                morphologyData[currentIndex] = processedValue;
                morphologyData[currentIndex + 1] = processedValue;
                morphologyData[currentIndex + 2] = processedValue;
            }
        }

        const finalImageData = ctx.createImageData(width, height);
        finalImageData.data.set(morphologyData);
        ctx.putImageData(finalImageData, 0, 0);

        console.log(`📸 Image preprocessed: threshold=${adaptiveThreshold}, size=${width}x${height}`);
        return canvas;
    };

    const translateReceiptText = async (text: string): Promise<string> => {
        let translatedText = text.toLowerCase();
        const sortedEntries = Object.entries(romanianToEnglish)
            .sort(([a], [b]) => b.length - a.length);

        sortedEntries.forEach(([ro, en]) => {
            const regex = new RegExp(`\\b${ro}\\b`, 'gi');
            if (regex.test(translatedText)) {
                translatedText = translatedText.replace(regex, en);
            }
        });

        return translatedText;
    };

    return {
        workerRef,
        loadReceiptPatterns,
        saveReceiptPatterns,
        findSimilarReceipts,
        preprocessImage,
        translateReceiptText
    };
};
