declare module 'tesseract.js' {
    export interface TesseractWorker {
        loadLanguage(langs: string): Promise<void>;
        initialize(lang: string): Promise<void>;
        setParameters(params: Record<string, string | number>): Promise<void>;
        recognize(image: string, options?: Record<string, any>): Promise<TesseractResult>;
        terminate(): Promise<void>;
        setLogger(logger: (message: any) => void): void;
    }

    export interface TesseractResult {
        data: {
            text: string;
            confidence: number;
            imageWidth?: number;
            imageHeight?: number;
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
        };
    }

    export function createWorker(options?: Record<string, any>): Promise<TesseractWorker>;
} 