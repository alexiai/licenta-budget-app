import { createWorker } from 'tesseract.js';

export interface OCRProgress {
    status: string;
    progress: number;
}

export interface TesseractResult {
    text: string;
    confidence: number;
    words?: Array<{
        text: string;
        confidence?: number;
        bbox?: {
            x0: number;
            y0: number;
            x1: number;
            y1: number;
        };
    }>;
    imageWidth?: number;
    imageHeight?: number;
}

// Define a type for the progress message
type ProgressMessage = {
    workerId: string;
    status: string;
    progress: number;
};

export const createOCRWorker = async (onProgress: (progress: OCRProgress) => void) => {
    // Create a worker without the logger first
    const worker = await createWorker({
        workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@4.1.1/dist/worker.min.js',
        langPath: 'https://tessdata.projectnaptha.com/4.0.0',
        corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@4.0.4/tesseract-core.wasm.js'
    });

    // Add progress handler after worker creation
    if (worker && typeof onProgress === 'function') {
        // @ts-ignore - we know this property exists
        worker.setLogger((m: ProgressMessage) => {
            // Only pass primitive values
            onProgress({
                status: String(m.status),
                progress: Number(m.progress)
            });
        });
    }

    // Load and initialize languages
    await worker.loadLanguage('eng');
    await worker.initialize('eng');

    // Configure Tesseract parameters optimized for receipts
    await worker.setParameters({
        tessedit_char_whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyzĂÂÎȘȚăâîșț.,:-+/\\ ()€$',
        preserve_interword_spaces: '1',
        tessedit_pageseg_mode: '6',
        tessedit_do_invert: '0',
        tessedit_enable_doc_dict: '0',
        tessedit_write_images: '1',
        textord_heavy_nr: '0',
        textord_min_linesize: '1.5'
    });

    return worker;
};

export const preprocessImage = async (imageUri: string) => {
    // Optional: Add preprocessing logic here (contrast, thresholding, etc.)
    return imageUri;
};
