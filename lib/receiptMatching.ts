import { collection, query, where, getDocs, limit, orderBy } from 'firebase/firestore';
import { db } from './firebase';
import type { ReceiptMetadata, SavedReceipt } from './receiptStorage';

export interface SpatialFeature {
    dateRegion: 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    amountRegion: 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    layoutComplexity: 'simple' | 'medium' | 'complex';
    lineCount: number;
}

export interface MatchResult {
    isMatch: boolean;
    confidence: number;
    bestMatch?: SavedReceipt;
    suggestedExtraction?: {
        amount?: number;
        date?: string;
        category?: string;
        subcategory?: string;
    };
    matchingStrategy: 'merchant' | 'layout' | 'text_similarity' | 'none';
    similarReceipts: SavedReceipt[];
}

export interface DeveloperSuggestion {
    showSuggestion: boolean;
    suggestionData?: {
        confidence: number;
        similarReceipt: ReceiptMetadata;
        suggestedAnnotations: {
            receiptType: string;
            dateLocation: string;
            amountLocation: string;
            difficultyLevel: 'easy' | 'medium' | 'hard';
            layoutDescription: string;
        };
    };
}

export class ReceiptMatchingSystem {
    private cachedReceipts: SavedReceipt[] = [];
    private lastCacheTime: number = 0;
    private cacheValidityMs: number = 5 * 60 * 1000; // 5 minutes

    // Main matching function - finds similar receipts and applies learned rules
    async findSimilarReceipts(
        ocrText: string,
        extractedData: any,
        userId: string
    ): Promise<MatchResult> {
        console.log('🔍 Starting receipt matching analysis...');

        try {
            // Get user's receipt history
            const userReceipts = await this.getUserReceipts(userId);

            if (userReceipts.length === 0) {
                console.log('📝 No previous receipts found for learning');
                return {
                    isMatch: false,
                    confidence: 0,
                    matchingStrategy: 'none',
                    similarReceipts: []
                };
            }

            console.log(`📚 Analyzing against ${userReceipts.length} previous receipts`);

            // Extract features from current receipt
            const currentFeatures = this.extractReceiptFeatures(ocrText, extractedData);

            // Find matches using multiple strategies
            const merchantMatches = this.findMerchantMatches(ocrText, userReceipts);
            const layoutMatches = this.findLayoutMatches(currentFeatures, userReceipts);
            const textMatches = this.findTextSimilarityMatches(ocrText, userReceipts);

            // Combine and rank matches
            const bestMatch = this.selectBestMatch(merchantMatches, layoutMatches, textMatches);

            if (bestMatch) {
                console.log(`🎯 Found match: ${bestMatch.strategy} (${bestMatch.confidence}% confidence)`);

                const suggestedExtraction = this.generateSuggestedExtraction(
                    bestMatch.receipt,
                    currentFeatures,
                    extractedData
                );

                return {
                    isMatch: bestMatch.confidence >= 70,
                    confidence: bestMatch.confidence,
                    bestMatch: bestMatch.receipt,
                    suggestedExtraction,
                    matchingStrategy: bestMatch.strategy,
                    similarReceipts: [bestMatch.receipt, ...layoutMatches.slice(0, 2)]
                };
            }

            return {
                isMatch: false,
                confidence: 0,
                matchingStrategy: 'none',
                similarReceipts: textMatches.slice(0, 3)
            };

        } catch (error) {
            console.error('Error in receipt matching:', error);
            return {
                isMatch: false,
                confidence: 0,
                matchingStrategy: 'none',
                similarReceipts: []
            };
        }
    }

    // Apply learned extraction rules from matched receipt
    applyLearnedRules(currentExtraction: any, matchResult: MatchResult): any {
        if (!matchResult.isMatch || !matchResult.bestMatch || !matchResult.suggestedExtraction) {
            return currentExtraction;
        }

        console.log('🤖 Applying learned extraction rules...');

        const enhanced = { ...currentExtraction };
        const suggested = matchResult.suggestedExtraction;

        // Apply suggestions with confidence weighting
        if (suggested.amount && (!enhanced.amount || matchResult.confidence > 80)) {
            enhanced.amount = suggested.amount;
            console.log(`💰 Applied learned amount: ${suggested.amount}`);
        }

        if (suggested.date && (!enhanced.date || matchResult.confidence > 85)) {
            enhanced.date = suggested.date;
            console.log(`📅 Applied learned date: ${suggested.date}`);
        }

        if (suggested.category && (!enhanced.category || matchResult.confidence > 75)) {
            enhanced.category = suggested.category;
            enhanced.subcategory = suggested.subcategory;
            console.log(`🏷️ Applied learned category: ${suggested.category}`);
        }

        return enhanced;
    }

    // Get developer suggestions for layout annotation (dev mode only)
    async getDeveloperSuggestions(
        matchResult: MatchResult | null,
        userId: string
    ): Promise<DeveloperSuggestion> {
        if (!__DEV__ || !matchResult?.isMatch || matchResult.confidence < 75) {
            return { showSuggestion: false };
        }

        const similarReceipt = matchResult.bestMatch;
        if (!similarReceipt) {
            return { showSuggestion: false };
        }

        console.log('💡 Generating developer suggestion for layout annotation');

        return {
            showSuggestion: true,
            suggestionData: {
                confidence: matchResult.confidence,
                similarReceipt: similarReceipt.metadata,
                suggestedAnnotations: {
                    receiptType: similarReceipt.metadata.receiptType,
                    dateLocation: similarReceipt.metadata.dateLocation,
                    amountLocation: similarReceipt.metadata.amountLocation,
                    difficultyLevel: this.assessDifficultyLevel(similarReceipt.metadata),
                    layoutDescription: this.generateLayoutDescription(similarReceipt.metadata)
                }
            }
        };
    }

    // Extract spatial and textual features from receipt
    private extractReceiptFeatures(ocrText: string, extractedData: any): SpatialFeature {
        const lines = ocrText.split('\n').filter(line => line.trim().length > 0);
        const lineCount = lines.length;

        // Determine layout complexity
        let layoutComplexity: 'simple' | 'medium' | 'complex' = 'simple';
        if (lineCount > 20) layoutComplexity = 'complex';
        else if (lineCount > 10) layoutComplexity = 'medium';

        // For now, use simplified region detection
        // In a full implementation, this would use actual spatial coordinates
        const dateRegion = this.inferDateRegion(ocrText);
        const amountRegion = this.inferAmountRegion(ocrText);

        return {
            dateRegion,
            amountRegion,
            layoutComplexity,
            lineCount
        };
    }

    // Find receipts from same merchant
    private findMerchantMatches(ocrText: string, receipts: SavedReceipt[]): Array<{receipt: SavedReceipt, confidence: number, strategy: 'merchant'}> {
        const currentMerchant = this.detectMerchant(ocrText);
        if (!currentMerchant) return [];

        return receipts
            .filter(receipt => {
                const receiptMerchant = this.detectMerchant(receipt.metadata.ocrText);
                return receiptMerchant === currentMerchant;
            })
            .map(receipt => ({
                receipt,
                confidence: 85, // High confidence for same merchant
                strategy: 'merchant' as const
            }));
    }

    // Find receipts with similar layout patterns
    private findLayoutMatches(currentFeatures: SpatialFeature, receipts: SavedReceipt[]): SavedReceipt[] {
        return receipts
            .filter(receipt => {
                const receiptFeatures = this.extractReceiptFeatures(
                    receipt.metadata.ocrText,
                    receipt.metadata.extractedData
                );

                // Check layout similarity
                const dateMatch = receiptFeatures.dateRegion === currentFeatures.dateRegion;
                const amountMatch = receiptFeatures.amountRegion === currentFeatures.amountRegion;
                const complexityMatch = receiptFeatures.layoutComplexity === currentFeatures.layoutComplexity;

                return (dateMatch && amountMatch) || (dateMatch && complexityMatch) || (amountMatch && complexityMatch);
            })
            .sort((a, b) => {
                // Prefer receipts with higher success rate (no corrections)
                const aScore = a.metadata.wasCorrected ? 0.5 : 1.0;
                const bScore = b.metadata.wasCorrected ? 0.5 : 1.0;
                return bScore - aScore;
            });
    }

    // Find receipts with similar text content
    private findTextSimilarityMatches(ocrText: string, receipts: SavedReceipt[]): SavedReceipt[] {
        const currentWords = this.extractKeyWords(ocrText);

        return receipts
            .map(receipt => {
                const receiptWords = this.extractKeyWords(receipt.metadata.ocrText);
                const similarity = this.calculateTextSimilarity(currentWords, receiptWords);
                return { receipt, similarity };
            })
            .filter(({ similarity }) => similarity > 0.3)
            .sort((a, b) => b.similarity - a.similarity)
            .map(({ receipt }) => receipt);
    }

    // Select the best match from all strategies
    private selectBestMatch(
        merchantMatches: Array<{receipt: SavedReceipt, confidence: number, strategy: 'merchant'}>,
        layoutMatches: SavedReceipt[],
        textMatches: SavedReceipt[]
    ): {receipt: SavedReceipt, confidence: number, strategy: 'merchant' | 'layout' | 'text_similarity'} | null {

        // Prioritize merchant matches
        if (merchantMatches.length > 0) {
            const best = merchantMatches[0];
            return best;
        }

        // Then layout matches
        if (layoutMatches.length > 0) {
            return {
                receipt: layoutMatches[0],
                confidence: 75,
                strategy: 'layout'
            };
        }

        // Finally text similarity
        if (textMatches.length > 0) {
            return {
                receipt: textMatches[0],
                confidence: 60,
                strategy: 'text_similarity'
            };
        }

        return null;
    }

    // Generate extraction suggestions based on matched receipt
    private generateSuggestedExtraction(
        matchedReceipt: SavedReceipt,
        currentFeatures: SpatialFeature,
        currentExtraction: any
    ): any {
        const metadata = matchedReceipt.metadata;
        const suggestions: any = {};

        // Use final corrected values if available, otherwise extracted values
        const referenceData = metadata.userCorrections || metadata.extractedData;

        // Suggest category based on matched receipt type
        if (metadata.receiptType) {
            const categoryMapping: Record<string, string> = {
                'Supermarket': 'Groceries',
                'Bakery': 'Groceries',
                'Gas Station': 'Transport',
                'Restaurant': 'Food & Dining',
                'Pharmacy': 'Health',
                'Other': 'Other'
            };
            suggestions.category = categoryMapping[metadata.receiptType] || 'Other';
        }

        // If layouts are very similar, suggest using similar extraction logic
        if (currentFeatures.dateRegion === metadata.dateLocation &&
            currentFeatures.amountRegion === metadata.amountLocation) {

            // High confidence suggestions for exact layout match
            if (!currentExtraction.amount && referenceData.amount) {
                suggestions.amount = referenceData.amount;
            }

            if (!currentExtraction.date && referenceData.date) {
                suggestions.date = referenceData.date;
            }
        }

        return suggestions;
    }

    // Helper methods
    private async getUserReceipts(userId: string): Promise<SavedReceipt[]> {
        // Use cache if recent
        if (this.cachedReceipts.length > 0 &&
            Date.now() - this.lastCacheTime < this.cacheValidityMs) {
            return this.cachedReceipts;
        }

        try {
            const receiptsQuery = query(
                collection(db, 'receiptLayouts'),
                where('userId', '==', userId),
                orderBy('timestamp', 'desc'),
                limit(50) // Limit to recent receipts for performance
            );

            const receiptsSnapshot = await getDocs(receiptsQuery);
            const receipts = receiptsSnapshot.docs.map(doc => ({
                id: doc.id,
                imageUrl: '',
                metadata: doc.data() as ReceiptMetadata,
                firestoreId: doc.id
            })) as SavedReceipt[];

            // Update cache
            this.cachedReceipts = receipts;
            this.lastCacheTime = Date.now();

            return receipts;
        } catch (error) {
            console.error('Error fetching user receipts:', error);
            return [];
        }
    }

    private detectMerchant(ocrText: string): string | null {
        const text = ocrText.toLowerCase();
        const merchants = [
            'lidl', 'kaufland', 'mega image', 'carrefour',
            'mol', 'omv', 'petrom', 'brutarie', 'bakery'
        ];

        for (const merchant of merchants) {
            if (text.includes(merchant)) {
                return merchant;
            }
        }
        return null;
    }

    private extractKeyWords(text: string): string[] {
        return text.toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 3)
            .filter(word => !/^\d+[.,]\d{2}$/.test(word)) // Remove prices
            .filter(word => !/^\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}$/.test(word)) // Remove dates
            .slice(0, 20); // Limit for performance
    }

    private calculateTextSimilarity(words1: string[], words2: string[]): number {
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }

    private inferDateRegion(ocrText: string): SpatialFeature['dateRegion'] {
        // Simplified region inference - in real implementation would use spatial coordinates
        const lines = ocrText.split('\n');
        const totalLines = lines.length;

        for (let i = 0; i < lines.length; i++) {
            if (/\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}/.test(lines[i])) {
                if (i < totalLines * 0.3) return 'top-right';
                if (i > totalLines * 0.7) return 'bottom-left';
                return 'middle-center';
            }
        }
        return 'top-right'; // Default
    }

    private inferAmountRegion(ocrText: string): SpatialFeature['amountRegion'] {
        // Simplified - would use actual coordinates in full implementation
        const lines = ocrText.split('\n');
        const totalLines = lines.length;

        // Look for total keywords
        for (let i = 0; i < lines.length; i++) {
            if (/total|suma|plata/i.test(lines[i]) && /\d+[.,]\d{2}/.test(lines[i])) {
                if (i > totalLines * 0.7) return 'bottom-right';
                return 'middle-right';
            }
        }
        return 'bottom-right'; // Default
    }

    private assessDifficultyLevel(metadata: ReceiptMetadata): 'easy' | 'medium' | 'hard' {
        if (metadata.ocrConfidence >= 85 && !metadata.wasCorrected) return 'easy';
        if (metadata.ocrConfidence >= 70 || metadata.wasCorrected) return 'medium';
        return 'hard';
    }

    private generateLayoutDescription(metadata: ReceiptMetadata): string {
        return `${metadata.receiptType} receipt with date at ${metadata.dateLocation} and total at ${metadata.amountLocation}. Quality: ${metadata.receiptQuality}`;
    }
}

export const receiptMatchingSystem = new ReceiptMatchingSystem();
