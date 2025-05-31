import { receiptStorageSystem } from './receiptStorage';
import type { ReceiptMetadata } from './receiptStorage';

interface DeveloperAnnotationData {
    layoutDescription: string;
    extractionNotes: string;
    specialFeatures: string[];
    difficultyLevel: 'easy' | 'medium' | 'hard';
    recommendedImprovements: string[];
}

export interface DeveloperAnnotationModalProps {
    visible: boolean;
    onClose: () => void;
    receiptId: string;
    currentMetadata: Omit<ReceiptMetadata, 'imageId' | 'timestamp' | 'userId'>;
    onSave: (annotations: ReceiptMetadata['developerAnnotations']) => void;
}

export class DeveloperAnnotationModal {
    private props: DeveloperAnnotationModalProps;
    private data: DeveloperAnnotationData;

    constructor(props: DeveloperAnnotationModalProps) {
        this.props = props;
        this.data = {
            layoutDescription: props.currentMetadata.developerAnnotations?.layoutDescription || '',
            extractionNotes: props.currentMetadata.developerAnnotations?.extractionNotes || '',
            specialFeatures: props.currentMetadata.developerAnnotations?.specialFeatures || [],
            difficultyLevel: props.currentMetadata.developerAnnotations?.difficultyLevel || 'medium',
            recommendedImprovements: props.currentMetadata.developerAnnotations?.recommendedImprovements || []
        };
    }

    public updateData(field: keyof DeveloperAnnotationData, value: any): void {
        this.data[field] = value;
    }

    public async saveAnnotations(): Promise<boolean> {
        try {
            const annotations: ReceiptMetadata['developerAnnotations'] = {
                layoutDescription: this.data.layoutDescription,
                extractionNotes: this.data.extractionNotes,
                specialFeatures: this.data.specialFeatures,
                difficultyLevel: this.data.difficultyLevel,
                recommendedImprovements: this.data.recommendedImprovements
            };

            await receiptStorageSystem.addDeveloperAnnotations(this.props.receiptId, annotations);
            this.props.onSave(annotations);
            return true;
        } catch (error) {
            console.error('Error saving annotations:', error);
            return false;
        }
    }

    public getCurrentData(): DeveloperAnnotationData {
        return { ...this.data };
    }

    public getMetadataOverview(): Record<string, any> {
        return {
            receiptType: this.props.currentMetadata.receiptType,
            dateLocation: this.props.currentMetadata.dateLocation,
            amountLocation: this.props.currentMetadata.amountLocation,
            wasCorrected: this.props.currentMetadata.wasCorrected,
            ocrConfidence: this.props.currentMetadata.ocrConfidence,
            receiptQuality: this.props.currentMetadata.receiptQuality
        };
    }

    public static isDevModeEnabled(): boolean {
        return typeof __DEV__ !== 'undefined' && __DEV__ === true;
    }
}

// Utility functions for developer annotations
export const developerAnnotationUtils = {
    createAnnotations: (data: Partial<DeveloperAnnotationData>): ReceiptMetadata['developerAnnotations'] => ({
        layoutDescription: data.layoutDescription || '',
        extractionNotes: data.extractionNotes || '',
        specialFeatures: data.specialFeatures || [],
        difficultyLevel: data.difficultyLevel || 'medium',
        recommendedImprovements: data.recommendedImprovements || []
    }),

    validateAnnotations: (annotations: ReceiptMetadata['developerAnnotations']): boolean => {
        return !!(
            annotations &&
            typeof annotations.layoutDescription === 'string' &&
            typeof annotations.extractionNotes === 'string' &&
            Array.isArray(annotations.specialFeatures) &&
            ['easy', 'medium', 'hard'].includes(annotations.difficultyLevel) &&
            Array.isArray(annotations.recommendedImprovements)
        );
    },

    formatAnnotationsForStorage: (annotations: ReceiptMetadata['developerAnnotations']): Record<string, any> => {
        if (!annotations) return {};

        return {
            layoutDescription: annotations.layoutDescription,
            extractionNotes: annotations.extractionNotes,
            specialFeatures: annotations.specialFeatures,
            difficultyLevel: annotations.difficultyLevel,
            recommendedImprovements: annotations.recommendedImprovements
        };
    }
};

// Export types for use in other files
export type { DeveloperAnnotationData };
