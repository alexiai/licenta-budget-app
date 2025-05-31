export interface PreprocessingResult {
    processedDataUrl: string;
    width: number;
    height: number;
}

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

export interface TesseractWord {
    text: string;
    confidence?: number;
    bbox?: {
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
}

export interface OCRResult {
    data: {
        text: string;
        confidence: number;
        words?: TesseractWord[];
    };
}

export interface OCROptions {
    tessedit_char_whitelist: string;
    preserve_interword_spaces: string;
    tessedit_pageseg_mode: string;
    tessedit_do_invert?: string;
    tessedit_write_images?: string;
    tessedit_enable_doc_dict?: string;
}

export interface OCRError extends Error {
    code?: string;
    details?: any;
}