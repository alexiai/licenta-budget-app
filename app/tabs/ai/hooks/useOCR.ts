import { useRef } from 'react';
import { TesseractWorker } from 'tesseract.js';
import { OCRSearchParams, ReceiptPattern } from '../types/receipt';
import { romanianToEnglish } from '../../../../lib/translationDictionary';
import { PreprocessingResult } from '../types/ocr';

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

export const useOCR = () => {
    const workerRef = useRef<TesseractWorker | null>(null);

    const loadReceiptPatterns = (): ReceiptPattern[] => {
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

    const saveReceiptPatterns = (patterns: ReceiptPattern[]): void => {
        try {
            localStorage.setItem('receiptPatterns', JSON.stringify(patterns));
            console.log('💾 Saved receipt patterns:', patterns.length);
        } catch (error) {
            console.log('Error saving receipt patterns:', error);
        }
    };

    const findSimilarReceipts = async (text: string, params: OCRSearchParams): Promise<ReceiptPattern[]> => {
        const patterns = loadReceiptPatterns();
        const textLower = text.toLowerCase();
        const words = textLower.split(/\s+/).filter(w => w.length > 2);

        return patterns
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

    const preprocessImage = async (imageUri: string): Promise<PreprocessingResult> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });

                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }

                    // Set optimal dimensions
                    let targetWidth = img.width;
                    let targetHeight = img.height;
                    const MAX_DIMENSION = 2000;
                    const MIN_DIMENSION = 800;

                    if (Math.max(targetWidth, targetHeight) > MAX_DIMENSION) {
                        const ratio = MAX_DIMENSION / Math.max(targetWidth, targetHeight);
                        targetWidth *= ratio;
                        targetHeight *= ratio;
                    } else if (Math.max(targetWidth, targetHeight) < MIN_DIMENSION) {
                        const ratio = MIN_DIMENSION / Math.max(targetWidth, targetHeight);
                        targetWidth *= ratio;
                        targetHeight *= ratio;
                    }

                    canvas.width = targetWidth;
                    canvas.height = targetHeight;

                    // Draw and convert to grayscale
                    ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                    const imageData = ctx.getImageData(0, 0, targetWidth, targetHeight);
                    const data = imageData.data;

                    // Convert to grayscale
                    for (let i = 0; i < data.length; i += 4) {
                        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
                        data[i] = gray;
                        data[i + 1] = gray;
                        data[i + 2] = gray;
                    }

                    // Apply adaptive thresholding
                    const histogram = new Array(256).fill(0);
                    for (let i = 0; i < data.length; i += 4) {
                        histogram[data[i]]++;
                    }

                    let threshold = 128;
                    let newThreshold;
                    
                    do {
                        let low = 0, high = 0;
                        let lowSum = 0, highSum = 0;

                        for (let i = 0; i < threshold; i++) {
                            low += histogram[i];
                            lowSum += histogram[i] * i;
                        }
                        for (let i = threshold; i < 256; i++) {
                            high += histogram[i];
                            highSum += histogram[i] * i;
                        }

                        const lowMean = low ? lowSum / low : 0;
                        const highMean = high ? highSum / high : 0;

                        newThreshold = Math.round((lowMean + highMean) / 2);

                        if (newThreshold === threshold) break;
                        threshold = newThreshold;
                    } while (true);

                    // Apply threshold and increase contrast
                    for (let i = 0; i < data.length; i += 4) {
                        const value = data[i] < threshold ? 0 : 255;
                        data[i] = value;
                        data[i + 1] = value;
                        data[i + 2] = value;
                    }

                    ctx.putImageData(imageData, 0, 0);

                    // Return processed image
                    console.log(`📸 Image preprocessed: size=${targetWidth}x${targetHeight}, threshold=${threshold}`);
                    resolve({
                        processedDataUrl: canvas.toDataURL('image/jpeg', 0.95),
                        width: targetWidth,
                        height: targetHeight
                    });
                } catch (error) {
                    console.error('Error during image preprocessing:', error);
                    reject(error);
                }
            };

            img.onerror = (error) => {
                console.error('Failed to load image:', error);
                reject(new Error('Failed to load image'));
            };

            img.src = imageUri;
        });
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
        findSimilarReceipts,
        translateReceiptText,
        loadReceiptPatterns,
        saveReceiptPatterns,
        preprocessImage
    };
};
