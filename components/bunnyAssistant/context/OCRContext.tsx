import React, { createContext, useContext, useState } from 'react';

interface ParsedExpense {
    amount: number;
    category: string;
    subcategory: string;
    date: string;
    note: string;
    confidence: number;
}

interface OCRContextType {
    ocrData: ParsedExpense | null;
    setOCRData: (data: ParsedExpense | null) => void;
}

const OCRContext = createContext<OCRContextType | undefined>(undefined);

export function OCRProvider({ children }: { children: React.ReactNode }) {
    const [ocrData, setOCRData] = useState<ParsedExpense | null>(null);

    return (
        <OCRContext.Provider value={{ ocrData, setOCRData }}>
            {children}
        </OCRContext.Provider>
    );
}

export function useOCR() {
    const context = useContext(OCRContext);
    if (context === undefined) {
        throw new Error('useOCR must be used within an OCRProvider');
    }
    return context;
}

