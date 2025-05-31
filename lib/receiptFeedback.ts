
import { addDoc, collection } from 'firebase/firestore';
import { db } from './firebase';

export interface ReceiptFeedbackData {
    id: string;
    imageUri: string;
    ocrText: string;
    userCorrections: {
        amount?: number;
        date?: string;
        category?: string;
        subcategory?: string;
        notes?: string;
    };
    extractionIssues: {
        amountNotFound: boolean;
        dateNotFound: boolean;
        wrongAmount: boolean;
        wrongDate: boolean;
        categoryMismatch: boolean;
    };
    userFeedback: {
        whatWentWrong: string;
        whereWasAmount?: string; // "top-left", "bottom-right", etc.
        whereWasDate?: string;
        merchantName?: string;
        receiptType?: string; // "grocery", "gas", "restaurant", etc.
        additionalTips?: string;
    };
    timestamp: number;
    userId: string;
}

export interface ReceiptImprovementSuggestion {
    type: 'missing_data' | 'wrong_extraction' | 'layout_issue' | 'merchant_unknown';
    message: string;
    questions: string[];
    expectedResponses: string[];
}

export class ReceiptFeedbackSystem {

    // Generate intelligent questions when OCR fails
    generateFeedbackQuestions(ocrText: string, extractedData: any): ReceiptImprovementSuggestion[] {
        const suggestions: ReceiptImprovementSuggestion[] = [];

        // If amount wasn't found or seems wrong
        if (!extractedData.amount || extractedData.confidence < 70) {
            suggestions.push({
                type: 'missing_data',
                message: 'I had trouble finding the total amount on this receipt.',
                questions: [
                    'Where is the total amount located on this receipt?',
                    'What type of store is this from?',
                    'Is there a specific format this store uses for totals?'
                ],
                expectedResponses: [
                    'top-left, top-right, bottom-left, bottom-right, middle',
                    'grocery, gas station, restaurant, pharmacy, etc.',
                    'Shows as TOTAL, SUMA, or just the number'
                ]
            });
        }

        // If date wasn't found
        if (!extractedData.date) {
            suggestions.push({
                type: 'missing_data',
                message: 'I couldn\'t find the date on this receipt.',
                questions: [
                    'Where is the date typically located on receipts from this store?',
                    'What format does this store use for dates? (DD/MM/YYYY, MM/DD/YYYY, etc.)',
                    'Is the date near any specific text like "Data:" or similar?'
                ],
                expectedResponses: [
                    'top-left, top-right, bottom-left, bottom-right, middle',
                    'DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, DD.MM.YYYY',
                    'Context words around the date'
                ]
            });
        }

        // If merchant couldn't be identified
        const merchantKeywords = ['lidl', 'kaufland', 'mega', 'carrefour', 'mol', 'omv'];
        const merchantFound = merchantKeywords.some(keyword =>
            ocrText.toLowerCase().includes(keyword)
        );

        if (!merchantFound) {
            suggestions.push({
                type: 'merchant_unknown',
                message: 'I couldn\'t identify which store this receipt is from.',
                questions: [
                    'What store/merchant is this receipt from?',
                    'What type of business is this? (grocery store, gas station, restaurant, etc.)',
                    'Do you see any specific store names or logos on the receipt?'
                ],
                expectedResponses: [
                    'Store name exactly as it appears',
                    'Business category',
                    'Brand names or identifiers'
                ]
            });
        }

        // If layout seems unusual
        if (ocrText.split('\n').length < 5) {
            suggestions.push({
                type: 'layout_issue',
                message: 'This receipt has an unusual layout that\'s hard for me to understand.',
                questions: [
                    'Is this a simple receipt with just one item?',
                    'Does this receipt have a standard format or is it handwritten/thermal printed?',
                    'Are there any special formatting elements I should know about?'
                ],
                expectedResponses: [
                    'Single item vs multiple items',
                    'Receipt type and quality',
                    'Special layout features'
                ]
            });
        }

        return suggestions;
    }

    // Save feedback to improve future extractions
    async saveFeedback(
        imageUri: string,
        ocrText: string,
        extractedData: any,
        userCorrections: any,
        userFeedback: any,
        userId: string
    ): Promise<void> {
        const feedbackData: ReceiptFeedbackData = {
            id: Date.now().toString(),
            imageUri,
            ocrText,
            userCorrections,
            extractionIssues: {
                amountNotFound: !extractedData.amount,
                dateNotFound: !extractedData.date,
                wrongAmount: userCorrections.amount && userCorrections.amount !== extractedData.amount,
                wrongDate: userCorrections.date && userCorrections.date !== extractedData.date,
                categoryMismatch: userCorrections.category && userCorrections.category !== extractedData.category
            },
            userFeedback,
            timestamp: Date.now(),
            userId
        };

        try {
            await addDoc(collection(db, 'receiptFeedback'), feedbackData);
            console.log('📝 Receipt feedback saved successfully');

            // Also save to local storage for immediate learning
            this.saveLocalFeedback(feedbackData);
        } catch (error) {
            console.error('Error saving receipt feedback:', error);
        }
    }

    private saveLocalFeedback(feedback: ReceiptFeedbackData) {
        try {
            const existing = localStorage.getItem('receiptFeedback');
            const feedbacks = existing ? JSON.parse(existing) : [];
            feedbacks.push(feedback);

            // Keep only last 50 feedbacks to prevent storage bloat
            if (feedbacks.length > 50) {
                feedbacks.splice(0, feedbacks.length - 50);
            }

            localStorage.setItem('receiptFeedback', JSON.stringify(feedbacks));
        } catch (error) {
            console.error('Error saving local feedback:', error);
        }
    }

    // Generate improvement tips based on accumulated feedback
    generateImprovementTips(): string[] {
        try {
            const existing = localStorage.getItem('receiptFeedback');
            if (!existing) return [];

            const feedbacks: ReceiptFeedbackData[] = JSON.parse(existing);
            const tips: string[] = [];

            // Analyze common issues
            const commonIssues = feedbacks.reduce((acc, feedback) => {
                if (feedback.extractionIssues.amountNotFound) acc.amountNotFound++;
                if (feedback.extractionIssues.dateNotFound) acc.dateNotFound++;
                if (feedback.extractionIssues.wrongAmount) acc.wrongAmount++;
                if (feedback.extractionIssues.wrongDate) acc.wrongDate++;
                return acc;
            }, { amountNotFound: 0, dateNotFound: 0, wrongAmount: 0, wrongDate: 0 });

            if (commonIssues.amountNotFound > 3) {
                tips.push('💡 Tip: Make sure the receipt is well-lit and the total amount is clearly visible');
            }

            if (commonIssues.dateNotFound > 3) {
                tips.push('💡 Tip: Ensure the date section of the receipt is included in the photo');
            }

            // Merchant-specific tips
            const merchantTips = feedbacks.reduce((acc, feedback) => {
                if (feedback.userFeedback.merchantName) {
                    const merchant = feedback.userFeedback.merchantName.toLowerCase();
                    if (!acc[merchant]) acc[merchant] = [];
                    if (feedback.userFeedback.additionalTips) {
                        acc[merchant].push(feedback.userFeedback.additionalTips);
                    }
                }
                return acc;
            }, {} as Record<string, string[]>);

            Object.entries(merchantTips).forEach(([merchant, tips]) => {
                if (tips.length > 0) {
                    tips.push(`💡 For ${merchant} receipts: ${tips[0]}`);
                }
            });

            return tips;
        } catch (error) {
            console.error('Error generating improvement tips:', error);
            return [];
        }
    }

    // Create a feedback form component data
    createFeedbackForm(suggestions: ReceiptImprovementSuggestion[]) {
        return {
            title: '🤔 Help me learn from this receipt',
            subtitle: 'Your feedback will help me recognize similar receipts better in the future.',
            sections: suggestions.map(suggestion => ({
                type: suggestion.type,
                message: suggestion.message,
                questions: suggestion.questions.map(question => ({
                    id: `${suggestion.type}_${Date.now()}_${Math.random()}`,
                    question,
                    type: this.getInputType(question),
                    options: this.getOptionsForQuestion(question)
                }))
            }))
        };
    }

    private getInputType(question: string): 'text' | 'select' | 'multiselect' {
        if (question.includes('Where is') || question.includes('located')) {
            return 'select';
        }
        if (question.includes('type of store') || question.includes('format')) {
            return 'select';
        }
        return 'text';
    }

    private getOptionsForQuestion(question: string): string[] | null {
        if (question.includes('Where is') || question.includes('located')) {
            return ['top-left', 'top-right', 'top-center', 'middle-left', 'middle-center', 'middle-right', 'bottom-left', 'bottom-right', 'bottom-center'];
        }

        if (question.includes('type of store') || question.includes('type of business')) {
            return ['grocery store', 'supermarket', 'gas station', 'restaurant', 'fast food', 'pharmacy', 'bakery', 'coffee shop', 'convenience store', 'other'];
        }

        if (question.includes('format') && question.includes('date')) {
            return ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD.MM.YYYY', 'DD-MM-YYYY', 'other'];
        }

        return null;
    }
}

export const receiptFeedbackSystem = new ReceiptFeedbackSystem();
