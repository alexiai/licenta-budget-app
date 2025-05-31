
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import type { ReceiptMetadata } from './receiptStorage';

export interface ReceiptAnalytics {
    totalReceipts: number;
    successRate: number;
    avgConfidence: number;
    receiptTypeDistribution: Record<string, number>;
    layoutPatterns: Array<{
        pattern: string;
        count: number;
        successRate: number;
    }>;
    qualityTrends: Array<{
        date: string;
        avgQuality: number;
        count: number;
    }>;
    improvementSuggestions: string[];
}

export class ReceiptAnalyticsService {
    async generateAnalytics(userId: string): Promise<ReceiptAnalytics> {
        try {
            // Fetch all receipts for user
            const receiptsQuery = query(
                collection(db, 'receiptLayouts'),
                where('userId', '==', userId)
            );

            const receiptsSnapshot = await getDocs(receiptsQuery);
            const receipts = receiptsSnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Array<ReceiptMetadata & { id: string }>;

            return this.analyzeReceipts(receipts);
        } catch (error) {
            console.error('Error generating receipt analytics:', error);
            throw error;
        }
    }

    private analyzeReceipts(receipts: Array<ReceiptMetadata & { id: string }>): ReceiptAnalytics {
        const totalReceipts = receipts.length;

        if (totalReceipts === 0) {
            return {
                totalReceipts: 0,
                successRate: 0,
                avgConfidence: 0,
                receiptTypeDistribution: {},
                layoutPatterns: [],
                qualityTrends: [],
                improvementSuggestions: []
            };
        }

        // Calculate success rate (receipts that didn't need correction)
        const successfulReceipts = receipts.filter(r => !r.wasCorrected);
        const successRate = (successfulReceipts.length / totalReceipts) * 100;

        // Calculate average confidence
        const avgConfidence = receipts.reduce((sum, r) => sum + r.ocrConfidence, 0) / totalReceipts;

        // Receipt type distribution
        const receiptTypeDistribution = receipts.reduce((acc, receipt) => {
            acc[receipt.receiptType] = (acc[receipt.receiptType] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        // Layout patterns analysis
        const layoutPatterns = this.analyzeLayoutPatterns(receipts);

        // Quality trends (simplified - group by month)
        const qualityTrends = this.analyzeQualityTrends(receipts);

        // Generate improvement suggestions
        const improvementSuggestions = this.generateImprovementSuggestions(receipts);

        return {
            totalReceipts,
            successRate,
            avgConfidence,
            receiptTypeDistribution,
            layoutPatterns,
            qualityTrends,
            improvementSuggestions
        };
    }

    private analyzeLayoutPatterns(receipts: Array<ReceiptMetadata & { id: string }>) {
        const patterns = receipts.reduce((acc, receipt) => {
            const pattern = `${receipt.receiptType}-${receipt.dateLocation}-${receipt.amountLocation}`;

            if (!acc[pattern]) {
                acc[pattern] = {
                    count: 0,
                    successful: 0
                };
            }

            acc[pattern].count++;
            if (!receipt.wasCorrected) {
                acc[pattern].successful++;
            }

            return acc;
        }, {} as Record<string, { count: number; successful: number }>);

        return Object.entries(patterns)
            .map(([pattern, data]) => ({
                pattern,
                count: data.count,
                successRate: (data.successful / data.count) * 100
            }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10);
    }

    private analyzeQualityTrends(receipts: Array<ReceiptMetadata & { id: string }>) {
        const qualityScores = {
            'excellent': 4,
            'good': 3,
            'fair': 2,
            'poor': 1
        };

        const monthlyData = receipts.reduce((acc, receipt) => {
            const date = new Date(receipt.timestamp);
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!acc[monthKey]) {
                acc[monthKey] = {
                    totalQuality: 0,
                    count: 0
                };
            }

            acc[monthKey].totalQuality += qualityScores[receipt.receiptQuality];
            acc[monthKey].count++;

            return acc;
        }, {} as Record<string, { totalQuality: number; count: number }>);

        return Object.entries(monthlyData)
            .map(([date, data]) => ({
                date,
                avgQuality: data.totalQuality / data.count,
                count: data.count
            }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }

    private generateImprovementSuggestions(receipts: Array<ReceiptMetadata & { id: string }>): string[] {
        const suggestions: string[] = [];

        const correctionRate = (receipts.filter(r => r.wasCorrected).length / receipts.length) * 100;
        const avgConfidence = receipts.reduce((sum, r) => sum + r.ocrConfidence, 0) / receipts.length;

        if (correctionRate > 30) {
            suggestions.push('💡 High correction rate detected. Consider improving image quality before scanning.');
        }

        if (avgConfidence < 70) {
            suggestions.push('📸 Average OCR confidence is low. Try better lighting and clearer photos.');
        }

        // Analyze receipt types with highest correction rates
        const typeCorrections = receipts.reduce((acc, receipt) => {
            if (!acc[receipt.receiptType]) {
                acc[receipt.receiptType] = { total: 0, corrected: 0 };
            }
            acc[receipt.receiptType].total++;
            if (receipt.wasCorrected) {
                acc[receipt.receiptType].corrected++;
            }
            return acc;
        }, {} as Record<string, { total: number; corrected: number }>);

        Object.entries(typeCorrections).forEach(([type, data]) => {
            const correctionRate = (data.corrected / data.total) * 100;
            if (correctionRate > 50 && data.total >= 3) {
                suggestions.push(`🏪 ${type} receipts often need corrections. Focus on improving detection for this type.`);
            }
        });

        return suggestions;
    }

    // Get insights for developer dashboard
    async getDeveloperInsights(userId: string) {
        const analytics = await this.generateAnalytics(userId);

        return {
            ...analytics,
            recommendations: {
                focusAreas: this.identifyFocusAreas(analytics),
                nextSteps: this.suggestNextSteps(analytics)
            }
        };
    }

    private identifyFocusAreas(analytics: ReceiptAnalytics): string[] {
        const areas: string[] = [];

        if (analytics.successRate < 70) {
            areas.push('OCR accuracy improvement');
        }

        if (analytics.avgConfidence < 75) {
            areas.push('Image preprocessing enhancement');
        }

        // Find receipt types with lowest success rates
        const problemTypes = analytics.layoutPatterns
            .filter(pattern => pattern.successRate < 60)
            .map(pattern => pattern.pattern.split('-')[0]);

        if (problemTypes.length > 0) {
            areas.push(`Layout detection for: ${problemTypes.join(', ')}`);
        }

        return areas;
    }

    private suggestNextSteps(analytics: ReceiptAnalytics): string[] {
        const steps: string[] = [];

        if (analytics.totalReceipts < 50) {
            steps.push('Collect more receipt samples for better training data');
        }

        if (analytics.successRate < 80) {
            steps.push('Implement merchant-specific layout templates');
            steps.push('Add more spatial awareness to OCR processing');
        }

        steps.push('Regular review of failed cases to identify patterns');
        steps.push('A/B test different OCR preprocessing techniques');

        return steps;
    }
}

export const receiptAnalyticsService = new ReceiptAnalyticsService();
