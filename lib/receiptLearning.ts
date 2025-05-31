
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

export interface ReceiptRegion {
    name: string;
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface LearnedPattern {
    id: string;
    merchantName?: string;
    merchantType: string;
    ocrText: string;
    imageUri: string;
    extractedData: {
        amount: number;
        date: string;
        category?: string;
        subcategory?: string;
    };
    userCorrections?: {
        amount?: number;
        date?: string;
        category?: string;
        subcategory?: string;
    };
    layout: {
        datePosition?: { region: ReceiptRegion; confidence: number };
        amountPosition?: { region: ReceiptRegion; confidence: number };
        totalPosition?: { region: ReceiptRegion; confidence: number };
        itemsRegion?: ReceiptRegion;
    };
    words: OCRWord[];
    imageWidth: number;
    imageHeight: number;
    confidence: number;
    timestamp: number;
    successRate: number; // How often this pattern leads to correct extraction
}

export interface MerchantPattern {
    name: string;
    keywords: string[];
    layoutFeatures: {
        dateUsuallyAt: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'middle';
        totalUsuallyAt: 'top' | 'middle' | 'bottom';
        itemsFormat: 'name-price' | 'price-name' | 'name-qty-price' | 'complex';
    };
    confidence: number;
}

export class ReceiptLearningSystem {
    private patterns: LearnedPattern[] = [];
    private merchantPatterns: MerchantPattern[] = [];

    constructor() {
        this.initializeMerchantPatterns();
        this.loadFromStorage(); // Don't await here, let it load async
    }

    private initializeMerchantPatterns() {
        this.merchantPatterns = [
            {
                name: 'Lidl',
                keywords: ['lidl', 'lidl romania'],
                layoutFeatures: {
                    dateUsuallyAt: 'bottom-left',
                    totalUsuallyAt: 'bottom',
                    itemsFormat: 'name-price'
                },
                confidence: 95
            },
            {
                name: 'Kaufland',
                keywords: ['kaufland', 'real'],
                layoutFeatures: {
                    dateUsuallyAt: 'top-right',
                    totalUsuallyAt: 'bottom',
                    itemsFormat: 'name-qty-price'
                },
                confidence: 90
            },
            {
                name: 'MOL Gas Station',
                keywords: ['mol', 'mol romania', 'benzinarie'],
                layoutFeatures: {
                    dateUsuallyAt: 'middle',
                    totalUsuallyAt: 'middle',
                    itemsFormat: 'name-price'
                },
                confidence: 85
            },
            {
                name: 'Mega Image',
                keywords: ['mega image', 'mega'],
                layoutFeatures: {
                    dateUsuallyAt: 'top-left',
                    totalUsuallyAt: 'bottom',
                    itemsFormat: 'name-price'
                },
                confidence: 90
            },
            {
                name: 'Bakery',
                keywords: ['brutarie', 'paine', 'bakery'],
                layoutFeatures: {
                    dateUsuallyAt: 'top-right',
                    totalUsuallyAt: 'bottom',
                    itemsFormat: 'name-price'
                },
                confidence: 75
            }
        ];
    }

    // Analyze receipt layout and extract spatial information
    analyzeReceiptLayout(words: OCRWord[], imageWidth: number, imageHeight: number) {
        const regions = {
            topLeft: { x: 0, y: 0, width: imageWidth * 0.5, height: imageHeight * 0.3 },
            topRight: { x: imageWidth * 0.5, y: 0, width: imageWidth * 0.5, height: imageHeight * 0.3 },
            middle: { x: 0, y: imageHeight * 0.3, width: imageWidth, height: imageHeight * 0.4 },
            bottomLeft: { x: 0, y: imageHeight * 0.7, width: imageWidth * 0.5, height: imageHeight * 0.3 },
            bottomRight: { x: imageWidth * 0.5, y: imageHeight * 0.7, width: imageWidth * 0.5, height: imageHeight * 0.3 }
        };

        const layout = {
            dateWords: [] as { word: OCRWord; region: string; confidence: number }[],
            priceWords: [] as { word: OCRWord; region: string; type: 'item' | 'total'; confidence: number }[],
            merchantWords: [] as { word: OCRWord; confidence: number }[],
            noiseWords: [] as OCRWord[]
        };

        words.forEach(word => {
            const wordCenter = {
                x: (word.bbox.x0 + word.bbox.x1) / 2,
                y: (word.bbox.y0 + word.bbox.y1) / 2
            };

            // Determine which region this word is in
            let region = 'middle';
            Object.entries(regions).forEach(([regionName, regionBounds]) => {
                if (wordCenter.x >= regionBounds.x &&
                    wordCenter.x <= regionBounds.x + regionBounds.width &&
                    wordCenter.y >= regionBounds.y &&
                    wordCenter.y <= regionBounds.y + regionBounds.height) {
                    region = regionName;
                }
            });

            // Check for date patterns
            if (this.isDatePattern(word.text)) {
                const confidence = this.calculateDateConfidence(word.text, region);
                layout.dateWords.push({ word, region, confidence });
            }

            // Check for price patterns
            if (this.isPricePattern(word.text)) {
                const isTotal = this.isTotalPrice(word, words);
                const confidence = isTotal ? 90 : 70;
                layout.priceWords.push({ word, region, type: isTotal ? 'total' : 'item', confidence });
            }

            // Check for merchant names
            const merchantMatch = this.findMerchantInText(word.text);
            if (merchantMatch) {
                layout.merchantWords.push({ word, confidence: merchantMatch.confidence });
            }

            // Check for noise
            if (this.isNoise(word.text)) {
                layout.noiseWords.push(word);
            }
        });

        return layout;
    }

    // Smart extraction using learned patterns and spatial awareness
    extractReceiptData(words: OCRWord[], imageWidth: number, imageHeight: number, ocrText: string) {
        console.log('🧠 Starting intelligent receipt extraction...');

        const layout = this.analyzeReceiptLayout(words, imageWidth, imageHeight);
        const merchantMatch = this.detectMerchant(ocrText);
        const similarPatterns = this.findSimilarPatterns(ocrText);

        console.log(`🏪 Detected merchant: ${merchantMatch?.name || 'Unknown'}`);
        console.log(`📚 Found ${similarPatterns.length} similar patterns`);

        // Extract amount using multiple strategies
        const amount = this.extractAmountWithStrategies(layout, merchantMatch, similarPatterns);

        // Extract date using multiple strategies
        const date = this.extractDateWithStrategies(layout, merchantMatch, similarPatterns);

        return {
            amount,
            date,
            merchant: merchantMatch,
            confidence: this.calculateOverallConfidence(amount, date, merchantMatch),
            layout,
            similarPatterns
        };
    }

    private extractAmountWithStrategies(layout: any, merchant: MerchantPattern | null, similarPatterns: LearnedPattern[]): number | null {
        console.log('💰 Extracting amount with multiple strategies...');

        // Strategy 1: Use learned patterns from similar receipts
        if (similarPatterns.length > 0) {
            for (const pattern of similarPatterns) {
                if (pattern.layout.totalPosition) {
                    const amountFromPattern = this.findAmountInRegion(layout.priceWords, pattern.layout.totalPosition.region);
                    if (amountFromPattern) {
                        console.log('💰 Amount found using learned pattern');
                        return amountFromPattern;
                    }
                }
            }
        }

        // Strategy 2: Use merchant-specific logic
        if (merchant) {
            const expectedRegion = this.getExpectedAmountRegion(merchant);
            const amountFromMerchant = this.findAmountInRegion(layout.priceWords, expectedRegion);
            if (amountFromMerchant) {
                console.log('💰 Amount found using merchant pattern');
                return amountFromMerchant;
            }
        }

        // Strategy 3: Look for "total" keywords
        const totalPrice = layout.priceWords.find((p: any) => p.type === 'total');
        if (totalPrice) {
            const amount = parseFloat(totalPrice.word.text.replace(',', '.'));
            if (amount > 0) {
                console.log('💰 Amount found with total keyword');
                return amount;
            }
        }

        // Strategy 4: Use largest reasonable price
        const prices = layout.priceWords
            .map((p: any) => parseFloat(p.word.text.replace(',', '.')))
            .filter(p => p > 0 && p < 10000)
            .sort((a, b) => b - a);

        if (prices.length > 0) {
            console.log('💰 Amount found using largest price fallback');
            return prices[0];
        }

        console.log('💰 No amount found');
        return null;
    }

    private extractDateWithStrategies(layout: any, merchant: MerchantPattern | null, similarPatterns: LearnedPattern[]): string | null {
        console.log('📅 Extracting date with multiple strategies...');

        // Strategy 1: Use learned patterns
        if (similarPatterns.length > 0) {
            for (const pattern of similarPatterns) {
                if (pattern.layout.datePosition) {
                    const dateFromPattern = this.findDateInRegion(layout.dateWords, pattern.layout.datePosition.region);
                    if (dateFromPattern) {
                        console.log('📅 Date found using learned pattern');
                        return dateFromPattern;
                    }
                }
            }
        }

        // Strategy 2: Use merchant-specific logic
        if (merchant) {
            const expectedRegion = merchant.layoutFeatures.dateUsuallyAt;
            const dateFromMerchant = layout.dateWords.find((d: any) =>
                d.region.includes(expectedRegion.replace('-', '')) || d.region === expectedRegion
            );
            if (dateFromMerchant) {
                const validDate = this.validateAndFormatDate(dateFromMerchant.word.text);
                if (validDate) {
                    console.log('📅 Date found using merchant pattern');
                    return validDate;
                }
            }
        }

        // Strategy 3: Use highest confidence date
        const sortedDates = layout.dateWords.sort((a: any, b: any) => b.confidence - a.confidence);
        for (const dateInfo of sortedDates) {
            const validDate = this.validateAndFormatDate(dateInfo.word.text);
            if (validDate) {
                console.log('📅 Date found using confidence ranking');
                return validDate;
            }
        }

        console.log('📅 No valid date found, using today');
        return new Date().toISOString().split('T')[0];
    }

    // Save a successful pattern for learning
    saveSuccessfulPattern(
        ocrText: string,
        imageUri: string,
        words: OCRWord[],
        imageWidth: number,
        imageHeight: number,
        extractedData: any,
        userCorrections?: any
    ) {
        const pattern: LearnedPattern = {
            id: Date.now().toString(),
            merchantName: this.detectMerchant(ocrText)?.name,
            merchantType: this.detectMerchant(ocrText)?.name || 'unknown',
            ocrText,
            imageUri,
            extractedData,
            userCorrections,
            layout: this.analyzeLayoutForPattern(words, imageWidth, imageHeight, extractedData, userCorrections),
            words,
            imageWidth,
            imageHeight,
            confidence: userCorrections ? 75 : 95, // Lower confidence if user had to correct
            timestamp: Date.now(),
            successRate: 1.0
        };

        this.patterns.push(pattern);
        this.saveToStorage();

        console.log('📚 Saved new learning pattern:', pattern.merchantName || 'Unknown merchant');
    }

    // Find similar patterns based on text similarity and merchant
    private findSimilarPatterns(ocrText: string): LearnedPattern[] {
        const textLower = ocrText.toLowerCase();
        const words = textLower.split(/\s+/).filter(w => w.length > 2);
        const merchant = this.detectMerchant(ocrText);

        return this.patterns
            .map(pattern => {
                let similarity = 0;

                // Merchant match gives high similarity
                if (merchant && pattern.merchantName === merchant.name) {
                    similarity += 0.5;
                }

                // Text similarity
                const patternWords = pattern.ocrText.toLowerCase().split(/\s+/).filter(w => w.length > 2);
                const commonWords = words.filter(word => patternWords.includes(word));
                const textSimilarity = commonWords.length / Math.max(words.length, patternWords.length);
                similarity += textSimilarity * 0.5;

                return { pattern, similarity };
            })
            .filter(({ similarity }) => similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .slice(0, 3)
            .map(({ pattern }) => pattern);
    }

    // Helper methods
    private isDatePattern(text: string): boolean {
        const datePatterns = [
            /^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/,
            /^\d{2,4}[\/\-\.]\d{1,2}[\/\-\.]\d{1,2}$/,
            /^\d{1,2}\.\d{1,2}\.\d{2,4}$/
        ];
        return datePatterns.some(pattern => pattern.test(text.trim()));
    }

    private isPricePattern(text: string): boolean {
        return /^\d+[.,]\d{2}$/.test(text.trim()) && parseFloat(text.replace(',', '.')) > 0;
    }

    private isNoise(text: string): boolean {
        const noiseKeywords = [
            'tva', 'subtotal', 'rest', 'bon fiscal', 'casa', 'operator',
            'nr bon', 'cod fiscal', 'reg com', 'cui', 'adresa'
        ];
        const textLower = text.toLowerCase();
        return noiseKeywords.some(keyword => textLower.includes(keyword)) ||
            text.length < 3 ||
            /^\d{2}:\d{2}$/.test(text); // Time pattern
    }

    private isTotalPrice(word: OCRWord, allWords: OCRWord[]): boolean {
        const nearbyWords = allWords.filter(w =>
            Math.abs(w.bbox.y0 - word.bbox.y0) < 20 &&
            w.bbox.x1 < word.bbox.x0
        );
        const nearbyText = nearbyWords.map(w => w.text).join(' ').toLowerCase();
        return /total|suma|plata/.test(nearbyText);
    }

    private detectMerchant(text: string): MerchantPattern | null {
        const textLower = text.toLowerCase();
        return this.merchantPatterns
            .find(merchant => merchant.keywords.some(keyword => textLower.includes(keyword))) || null;
    }

    private findMerchantInText(text: string): { confidence: number } | null {
        const merchant = this.detectMerchant(text);
        return merchant ? { confidence: merchant.confidence } : null;
    }

    private calculateDateConfidence(text: string, region: string): number {
        let confidence = 60;

        // Bonus for being in typical date regions
        if (region.includes('top') || region.includes('bottom')) {
            confidence += 20;
        }

        // Bonus for longer date formats
        if (text.includes('2024') || text.includes('2023')) {
            confidence += 15;
        }

        return Math.min(confidence, 95);
    }

    private calculateOverallConfidence(amount: number | null, date: string | null, merchant: MerchantPattern | null): number {
        let confidence = 0;

        if (amount) confidence += 40;
        if (date) confidence += 30;
        if (merchant) confidence += 30;

        return confidence;
    }

    private analyzeLayoutForPattern(words: OCRWord[], width: number, height: number, extracted: any, corrections?: any): any {
        const layout = this.analyzeReceiptLayout(words, width, height);

        // Find where the final amount was located
        const finalAmount = corrections?.amount || extracted.amount;
        const amountWord = words.find(w => parseFloat(w.text.replace(',', '.')) === finalAmount);

        // Find where the final date was located
        const finalDate = corrections?.date || extracted.date;
        const dateWord = words.find(w => this.validateAndFormatDate(w.text) === finalDate);

        return {
            datePosition: dateWord ? {
                region: this.getRegionForWord(dateWord, width, height),
                confidence: 90
            } : undefined,
            amountPosition: amountWord ? {
                region: this.getRegionForWord(amountWord, width, height),
                confidence: 90
            } : undefined
        };
    }

    private getRegionForWord(word: OCRWord, width: number, height: number): ReceiptRegion {
        const centerX = (word.bbox.x0 + word.bbox.x1) / 2;
        const centerY = (word.bbox.y0 + word.bbox.y1) / 2;

        return {
            name: `region_${centerX.toFixed(0)}_${centerY.toFixed(0)}`,
            x: centerX / width,
            y: centerY / height,
            width: (word.bbox.x1 - word.bbox.x0) / width,
            height: (word.bbox.y1 - word.bbox.y0) / height
        };
    }

    private findAmountInRegion(priceWords: any[], region: ReceiptRegion): number | null {
        const regionCenter = {
            x: region.x + region.width / 2,
            y: region.y + region.height / 2
        };

        // Find price words within or near the specified region
        const candidatePrices = priceWords
            .filter((priceInfo: any) => {
                const wordCenter = {
                    x: (priceInfo.word.bbox.x0 + priceInfo.word.bbox.x1) / 2,
                    y: (priceInfo.word.bbox.y0 + priceInfo.word.bbox.y1) / 2
                };

                // Check if word is within region bounds (with some tolerance)
                const tolerance = 0.1; // 10% tolerance
                const withinX = Math.abs(wordCenter.x - regionCenter.x) <= (region.width / 2 + tolerance);
                const withinY = Math.abs(wordCenter.y - regionCenter.y) <= (region.height / 2 + tolerance);

                return withinX && withinY;
            })
            .map((priceInfo: any) => parseFloat(priceInfo.word.text.replace(',', '.')))
            .filter(price => price > 0 && price < 10000);

        // Return the largest reasonable amount in the region
        return candidatePrices.length > 0 ? Math.max(...candidatePrices) : null;
    }

    private findDateInRegion(dateWords: any[], region: ReceiptRegion): string | null {
        const regionCenter = {
            x: region.x + region.width / 2,
            y: region.y + region.height / 2
        };

        // Find date words within the specified region
        const candidateDates = dateWords.filter((dateInfo: any) => {
            const wordCenter = {
                x: (dateInfo.word.bbox.x0 + dateInfo.word.bbox.x1) / 2,
                y: (dateInfo.word.bbox.y0 + dateInfo.word.bbox.y1) / 2
            };

            // Check if word is within region bounds
            const tolerance = 0.15; // 15% tolerance for dates
            const withinX = Math.abs(wordCenter.x - regionCenter.x) <= (region.width / 2 + tolerance);
            const withinY = Math.abs(wordCenter.y - regionCenter.y) <= (region.height / 2 + tolerance);

            return withinX && withinY;
        });

        // Return the most confident date in the region
        if (candidateDates.length > 0) {
            const bestDate = candidateDates.sort((a: any, b: any) => b.confidence - a.confidence)[0];
            return this.validateAndFormatDate(bestDate.word.text);
        }

        return null;
    }

    private getExpectedAmountRegion(merchant: MerchantPattern): ReceiptRegion {
        // Return expected region based on merchant layout patterns
        const layoutFeatures = merchant.layoutFeatures;

        switch (layoutFeatures.totalUsuallyAt) {
            case 'top':
                return {
                    name: 'top_amount',
                    x: 0.5,
                    y: 0.0,
                    width: 0.5,
                    height: 0.3
                };
            case 'middle':
                return {
                    name: 'middle_amount',
                    x: 0.5,
                    y: 0.35,
                    width: 0.5,
                    height: 0.3
                };
            case 'bottom':
            default:
                return {
                    name: 'bottom_amount',
                    x: 0.5,
                    y: 0.7,
                    width: 0.5,
                    height: 0.3
                };
        }
    }

    private validateAndFormatDate(dateText: string): string | null {
        // Enhanced date validation and formatting
        const patterns = [
            /(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/,
            /(\d{2,4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})/
        ];

        for (const pattern of patterns) {
            const match = dateText.match(pattern);
            if (match) {
                let day, month, year;

                if (match[3] && match[3].length === 4) {
                    day = parseInt(match[1]);
                    month = parseInt(match[2]) - 1;
                    year = parseInt(match[3]);
                } else if (match[1].length === 4) {
                    year = parseInt(match[1]);
                    month = parseInt(match[2]) - 1;
                    day = parseInt(match[3]);
                } else {
                    day = parseInt(match[1]);
                    month = parseInt(match[2]) - 1;
                    year = parseInt(match[3]) + (parseInt(match[3]) < 50 ? 2000 : 1900);
                }

                const date = new Date(year, month, day);
                if (date.getFullYear() === year &&
                    date.getMonth() === month &&
                    date.getDate() === day) {
                    return date.toISOString().split('T')[0];
                }
            }
        }

        return null;
    }

    private async loadFromStorage() {
        try {
            // Use AsyncStorage for React Native
            const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
            const saved = await AsyncStorage.getItem('receiptLearningPatterns');
            if (saved) {
                this.patterns = JSON.parse(saved);
                console.log(`📚 Loaded ${this.patterns.length} learning patterns`);
            }
        } catch (error) {
            console.log('Learning patterns storage not available, using memory only');
            this.patterns = [];
        }
    }

    private async saveToStorage() {
        try {
            // Use AsyncStorage for React Native
            const AsyncStorage = await import('@react-native-async-storage/async-storage').then(m => m.default);
            await AsyncStorage.setItem('receiptLearningPatterns', JSON.stringify(this.patterns));
            console.log(`💾 Saved ${this.patterns.length} learning patterns`);
        } catch (error) {
            console.log('Learning patterns storage not available, patterns exist only in memory');
        }
    }

    // Method to get feedback from user and improve patterns
    provideFeedback(patternId: string, wasCorrect: boolean, corrections?: any) {
        const pattern = this.patterns.find(p => p.id === patternId);
        if (pattern) {
            if (wasCorrect) {
                pattern.successRate = Math.min(pattern.successRate + 0.1, 1.0);
            } else {
                pattern.successRate = Math.max(pattern.successRate - 0.2, 0.1);
                if (corrections) {
                    pattern.userCorrections = corrections;
                }
            }
            this.saveToStorage();
        }
    }

    // Get learning insights for debugging
    getLearningInsights() {
        return {
            totalPatterns: this.patterns.length,
            merchantsLearned: [...new Set(this.patterns.map(p => p.merchantName).filter(Boolean))],
            averageSuccessRate: this.patterns.reduce((sum, p) => sum + p.successRate, 0) / this.patterns.length,
            topMerchants: this.getTopMerchants()
        };
    }

    private getTopMerchants() {
        const merchantCounts = this.patterns.reduce((acc, pattern) => {
            if (pattern.merchantName) {
                acc[pattern.merchantName] = (acc[pattern.merchantName] || 0) + 1;
            }
            return acc;
        }, {} as Record<string, number>);

        return Object.entries(merchantCounts)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 5);
    }
}

export const receiptLearningSystem = new ReceiptLearningSystem();
