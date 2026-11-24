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

// Static instance for direct access
export const OCRDataProvider = {
    _data: null as ParsedExpense | null,
    _setData: null as ((data: ParsedExpense | null) => void) | null,

    init(setter: (data: ParsedExpense | null) => void) {
        this._setData = setter;
    },

    setData(data: ParsedExpense | null) {
        this._data = data;
        if (this._setData) {
            this._setData(data);
        }
    },

    getData() {
        return this._data;
    }
};

// Default export for the context provider
export default OCRProvider; 