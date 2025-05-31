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

interface OCRWord {
    text: string;
    confidence: number;
    bbox: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
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
        const wasConfirmed = !receiptAnalysis.ocrFailed;
        const ocrFailed = receiptAnalysis.ocrFailed || false;

        // Determine receipt type from content
        const receiptType = this.determineReceiptType(ocrText, extractedData);

        // Analyze layout from OCR data
        const layoutAnalysis = this.analyzeLayout(ocrText, extractedData);

        // Extract products information
        const products = this.extractProducts(ocrText, extractedData);

        return {
            receiptType,
            dateLocation: layoutAnalysis.dateLocation || 'top-right',
            amountLocation: layoutAnalysis.amountLocation || 'bottom-right',
            products,
            extractedData: {
                amount: extractedData.amount || 0,
                date: extractedData.date || new Date().toISOString().split('T')[0],
                category: extractedData.category || 'Other',
                subcategory: extractedData.subcategory,
                merchantName: extractedData.merchantName
            },
            userCorrections: wasCorrected ? userCorrections : undefined,
            wasCorrected,
            wasConfirmed,
            ocrConfidence: extractedData.confidence || 0,
            ocrText,
            layoutNotes: this.generateLayoutNotes(layoutAnalysis, receiptType),
            receiptQuality: this.assessReceiptQuality(extractedData.confidence, wasCorrected, ocrFailed)
        };
    }

    private determineReceiptType(ocrText: string, extractedData: any): ReceiptMetadata['receiptType'] {
        const text = ocrText.toLowerCase();

        if (text.includes('lidl') || text.includes('kaufland') || text.includes('mega') || text.includes('carrefour') || text.includes('profi')) {
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

    private analyzeLayout(ocrText: string, extractedData: any): { dateLocation: ReceiptMetadata['dateLocation'], amountLocation: ReceiptMetadata['amountLocation'] } {
        // Default positions if analysis fails
        const defaultLayout = {
            dateLocation: 'top-right' as ReceiptMetadata['dateLocation'],
            amountLocation: 'bottom-right' as ReceiptMetadata['amountLocation']
        };

        if (!extractedData.words || extractedData.words.length === 0) {
            return defaultLayout;
        }

        try {
            const words = extractedData.words as OCRWord[];
            const imageWidth = extractedData.imageWidth || 1000;
            const imageHeight = extractedData.imageHeight || 1200;

            // Find date position
            const dateWord = words.find((w: OCRWord) => w.text.match(/\d{2}[-.\/]\d{2}[-.\/]\d{4}/));
            let dateLocation = defaultLayout.dateLocation;
            if (dateWord) {
                const x = dateWord.bbox.x0 / imageWidth;
                const y = dateWord.bbox.y0 / imageHeight;
                dateLocation = this.determinePosition(x, y);
            }

            // Find amount position
            const amountWord = words.find((w: OCRWord) => w.text.match(/\d+[.,]\d{2}/));
            let amountLocation = defaultLayout.amountLocation;
            if (amountWord) {
                const x = amountWord.bbox.x0 / imageWidth;
                const y = amountWord.bbox.y0 / imageHeight;
                amountLocation = this.determinePosition(x, y);
            }

            return {
                dateLocation,
                amountLocation
            };
        } catch (error) {
            console.error('Error analyzing layout:', error);
            return defaultLayout;
        }
    }

    private determinePosition(x: number, y: number): ReceiptMetadata['dateLocation'] {
        // Convert normalized coordinates (0-1) to position
        const xPos = x < 0.33 ? 'left' : x < 0.66 ? 'center' : 'right';
        const yPos = y < 0.33 ? 'top' : y < 0.66 ? 'middle' : 'bottom';
        return `${yPos}-${xPos}` as ReceiptMetadata['dateLocation'];
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

    private generateLayoutNotes(layoutAnalysis: any, receiptType: ReceiptMetadata['receiptType']): string {
        return `${receiptType} receipt - date ${layoutAnalysis.dateLocation}, amount ${layoutAnalysis.amountLocation}`;
    }

    private assessReceiptQuality(confidence: number, wasCorrected: boolean, ocrFailed: boolean): ReceiptMetadata['receiptQuality'] {
        if (ocrFailed) return 'poor';
        if (wasCorrected) return 'fair';
        if (confidence >= 90) return 'excellent';
        if (confidence >= 75) return 'good';
        return 'fair';
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
