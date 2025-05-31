
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from './firebase';
import * as FileSystem from 'expo-file-system';

export interface ReceiptMetadata {
    imageId: string;
    receiptType: 'Bakery' | 'Supermarket' | 'Gas Station' | 'Restaurant' | 'Pharmacy' | 'Other';
    dateLocation: 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    amountLocation: 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'middle-center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right';
    products: Array<{
        name: string;
        category: string;
        amount?: number;
        quantity?: number;
    }>;
    extractedData: {
        amount: number;
        date: string;
        category: string;
        subcategory?: string;
        merchantName?: string;
    };
    userCorrections?: {
        amount?: number;
        date?: string;
        category?: string;
        subcategory?: string;
    };
    wasCorrected: boolean;
    wasConfirmed: boolean;
    ocrConfidence: number;
    ocrText: string;
    layoutNotes?: string;
    receiptQuality: 'excellent' | 'good' | 'fair' | 'poor';
    timestamp: number;
    userId: string;
    developerAnnotations?: {
        layoutDescription: string;
        extractionNotes: string;
        specialFeatures: string[];
        difficultyLevel: 'easy' | 'medium' | 'hard';
        recommendedImprovements: string[];
    };
}

export interface SavedReceipt {
    id: string;
    imageUrl: string;
    localImagePath?: string;
    metadata: ReceiptMetadata;
    firestoreId: string;
}

export class ReceiptStorageSystem {
    private isDevelopmentMode: boolean = __DEV__;

    // Save receipt image and metadata
    async saveReceiptWithMetadata(
        imageUri: string,
        metadata: Omit<ReceiptMetadata, 'imageId' | 'timestamp' | 'userId'>,
        developerAnnotations?: ReceiptMetadata['developerAnnotations']
    ): Promise<SavedReceipt> {
        const user = auth.currentUser;
        if (!user) {
            throw new Error('User must be authenticated to save receipts');
        }

        const imageId = `receipt_${Date.now()}_${user.uid}`;
        const timestamp = Date.now();

        const completeMetadata: ReceiptMetadata = {
            ...metadata,
            imageId,
            timestamp,
            userId: user.uid,
            developerAnnotations
        };

        try {
            // Save to Firebase Storage and Firestore
            const firebaseResult = await this.saveToFirebase(imageUri, completeMetadata);

            // Also save locally for development/backup
            const localResult = await this.saveToLocal(imageUri, completeMetadata);

            console.log('📦 Receipt saved successfully:', {
                imageId,
                firebaseUrl: firebaseResult.imageUrl,
                localPath: localResult.localPath,
                wasCorrected: metadata.wasCorrected
            });

            return {
                id: imageId,
                imageUrl: firebaseResult.imageUrl,
                localImagePath: localResult.localPath,
                metadata: completeMetadata,
                firestoreId: firebaseResult.firestoreId
            };

        } catch (error) {
            console.error('Error saving receipt:', error);
            throw error;
        }
    }

    private async saveToFirebase(imageUri: string, metadata: ReceiptMetadata) {
        // Upload image to Firebase Storage
        const response = await fetch(imageUri);
        const blob = await response.blob();

        const storageRef = ref(storage, `receipts/${metadata.imageId}.jpg`);
        const uploadResult = await uploadBytes(storageRef, blob);
        const imageUrl = await getDownloadURL(uploadResult.ref);

        // Save metadata to Firestore
        const receiptDoc = await addDoc(collection(db, 'receiptLayouts'), {
            ...metadata,
            imageUrl,
            createdAt: new Date().toISOString()
        });

        return {
            imageUrl,
            firestoreId: receiptDoc.id
        };
    }

    private async saveToLocal(imageUri: string, metadata: ReceiptMetadata) {
        const documentsDir = FileSystem.documentDirectory;
        const receiptsDir = `${documentsDir}receipts/`;

        // Ensure receipts directory exists
        const dirInfo = await FileSystem.getInfoAsync(receiptsDir);
        if (!dirInfo.exists) {
            await FileSystem.makeDirectoryAsync(receiptsDir, { intermediates: true });
        }

        // Save image
        const imagePath = `${receiptsDir}${metadata.imageId}.jpg`;
        await FileSystem.copyAsync({
            from: imageUri,
            to: imagePath
        });

        // Save metadata as JSON
        const metadataPath = `${receiptsDir}${metadata.imageId}.meta.json`;
        await FileSystem.writeAsStringAsync(
            metadataPath,
            JSON.stringify(metadata, null, 2)
        );

        return {
            localPath: imagePath,
            metadataPath
        };
    }

    // Create metadata from OCR results and user input
    createMetadataFromOCR(
        ocrText: string,
        extractedData: any,
        userCorrections: any = null,
        receiptAnalysis: any = {}
    ): Omit<ReceiptMetadata, 'imageId' | 'timestamp' | 'userId'> {
        const wasCorrected = Boolean(userCorrections && Object.keys(userCorrections).length > 0);
        const wasConfirmed = !receiptAnalysis.ocrFailed; // OCR failures need user confirmation
        const ocrFailed = receiptAnalysis.ocrFailed || false;

        // Determine receipt type from content
        const receiptType = this.determineReceiptType(ocrText, extractedData);

        // Analyze layout from OCR data (if available)
        const layoutAnalysis = this.analyzeLayout(ocrText, receiptAnalysis);

        // Extract products information
        const products = this.extractProducts(ocrText, extractedData);

        return {
            receiptType,
            dateLocation: layoutAnalysis.dateLocation,
            amountLocation: layoutAnalysis.amountLocation,
            products,
            extractedData: {
                amount: extractedData.amount,
                date: extractedData.date,
                category: extractedData.category,
                subcategory: extractedData.subcategory,
                merchantName: extractedData.merchantName
            },
            userCorrections: wasCorrected ? userCorrections : undefined,
            wasCorrected,
            wasConfirmed,
            ocrConfidence: extractedData.confidence || 0,
            ocrText,
            receiptQuality: this.assessReceiptQuality(extractedData.confidence, wasCorrected, receiptAnalysis.ocrFailed),
            layoutNotes: this.generateLayoutNotes(layoutAnalysis, receiptType)
        };
    }

    private determineReceiptType(ocrText: string, extractedData: any): ReceiptMetadata['receiptType'] {
        const text = ocrText.toLowerCase();

        if (text.includes('lidl') || text.includes('kaufland') || text.includes('mega') || text.includes('carrefour')) {
            return 'Supermarket';
        }
        if (text.includes('mol') || text.includes('omv') || text.includes('petrom') || text.includes('benzinarie')) {
            return 'Gas Station';
        }
        if (text.includes('brutarie') || text.includes('paine') || text.includes('bakery')) {
            return 'Bakery';
        }
        if (text.includes('restaurant') || text.includes('cafe') || text.includes('pizz')) {
            return 'Restaurant';
        }
        if (text.includes('farmaci') || text.includes('pharmacy') || text.includes('catena')) {
            return 'Pharmacy';
        }

        return 'Other';
    }

    private analyzeLayout(ocrText: string, receiptAnalysis: any): {
        dateLocation: ReceiptMetadata['dateLocation'];
        amountLocation: ReceiptMetadata['amountLocation'];
    } {
        // Default positions - these would be enhanced with actual spatial analysis
        return {
            dateLocation: receiptAnalysis.dateLocation || 'top-right',
            amountLocation: receiptAnalysis.amountLocation || 'bottom-right'
        };
    }

    private extractProducts(ocrText: string, extractedData: any): ReceiptMetadata['products'] {
        const lines = ocrText.split('\n').filter(line => line.trim().length > 0);
        const products: ReceiptMetadata['products'] = [];

        for (const line of lines) {
            // Look for product lines with prices
            const productMatch = line.match(/^(.+?)\s+(\d+[.,]\d{2})\s*$/);
            if (productMatch) {
                const name = productMatch[1].trim();
                const amount = parseFloat(productMatch[2].replace(',', '.'));

                if (name.length > 2 && amount > 0) {
                    products.push({
                        name,
                        category: extractedData.category || 'Other',
                        amount
                    });
                }
            }
        }

        // If no products found, create a generic entry
        if (products.length === 0) {
            products.push({
                name: 'Unknown Product',
                category: extractedData.category || 'Other',
                amount: extractedData.amount
            });
        }

        return products;
    }

    private assessReceiptQuality(confidence: number, wasCorrected: boolean, ocrFailed: boolean = false): ReceiptMetadata['receiptQuality'] {
        if (ocrFailed || confidence === 0) return 'poor';
        if (confidence >= 90 && !wasCorrected) return 'excellent';
        if (confidence >= 75 && !wasCorrected) return 'good';
        if (confidence >= 60 || (confidence >= 50 && wasCorrected)) return 'fair';
        return 'poor';
    }

    private generateLayoutNotes(layoutAnalysis: any, receiptType: string): string {
        return `${receiptType} receipt with date at ${layoutAnalysis.dateLocation} and total at ${layoutAnalysis.amountLocation}`;
    }

    // Get all saved receipts for analysis
    async getAllSavedReceipts(): Promise<SavedReceipt[]> {
        // Implementation would fetch from Firestore
        // This is a placeholder for the interface
        return [];
    }

    // Developer annotation interface
    async addDeveloperAnnotations(
        receiptId: string,
        annotations: ReceiptMetadata['developerAnnotations']
    ): Promise<void> {
        if (!this.isDevelopmentMode) {
            console.warn('Developer annotations only available in development mode');
            return;
        }

        try {
            const receiptRef = doc(db, 'receiptLayouts', receiptId);
            await updateDoc(receiptRef, {
                developerAnnotations: annotations,
                updatedAt: new Date().toISOString()
            });

            console.log('📝 Developer annotations added to receipt:', receiptId);
        } catch (error) {
            console.error('Error adding developer annotations:', error);
        }
    }

    // Generate learning insights from saved receipts
    generateLearningInsights(savedReceipts: SavedReceipt[]): {
        totalReceipts: number;
        receiptTypes: Record<string, number>;
        correctionRate: number;
        qualityDistribution: Record<string, number>;
        commonLayouts: any[];
    } {
        const insights = {
            totalReceipts: savedReceipts.length,
            receiptTypes: {} as Record<string, number>,
            correctionRate: 0,
            qualityDistribution: {} as Record<string, number>,
            commonLayouts: [] as any[]
        };

        let correctedCount = 0;

        savedReceipts.forEach(receipt => {
            const metadata = receipt.metadata;

            // Count receipt types
            insights.receiptTypes[metadata.receiptType] =
                (insights.receiptTypes[metadata.receiptType] || 0) + 1;

            // Count corrections
            if (metadata.wasCorrected) correctedCount++;

            // Count quality distribution
            insights.qualityDistribution[metadata.receiptQuality] =
                (insights.qualityDistribution[metadata.receiptQuality] || 0) + 1;
        });

        insights.correctionRate = correctedCount / savedReceipts.length;

        return insights;
    }
}

export const receiptStorageSystem = new ReceiptStorageSystem();
