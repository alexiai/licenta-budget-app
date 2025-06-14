# 5.4 Integrarea API-urilor în BunnyBudget

## 1. OCR - Scanare Bonuri

### 1.1 Implementare
```typescript
// services/ocr/OcrService.ts
export class OcrService {
    private readonly API_ENDPOINT = 'https://ocr.asprise.com/api/v1/receipt';
    private readonly API_KEY = process.env.ASPRISE_API_KEY;
    
    async scanReceipt(imageUri: string): Promise<OcrResult> {
        try {
            const formData = new FormData();
            formData.append('api_key', this.API_KEY);
            formData.append('recognizer', 'auto');
            formData.append('ref_no', uuidv4());
            
            // Adăugare imagine
            const imageBlob = await this.prepareImage(imageUri);
            formData.append('file', imageBlob);
            
            const response = await axios.post(this.API_ENDPOINT, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            return this.processOcrResponse(response.data);
        } catch (error) {
            this.handleOcrError(error);
            throw new OcrProcessingError(error.message);
        }
    }
    
    private processOcrResponse(data: any): OcrResult {
        const receipt = data.receipts[0];
        return {
            merchant: receipt.merchant_name,
            amount: this.extractAmount(receipt.total),
            date: this.parseDate(receipt.date),
            items: receipt.items.map(this.mapReceiptItem),
            confidence: receipt.confidence_score,
            rawText: receipt.ocr_text,
            success: receipt.success && receipt.confidence_score > 0.7
        };
    }
}
```

### 1.2 Structura Răspuns OCR
```typescript
interface OcrResult {
    merchant: string;
    amount: number;
    date: Date;
    items: ReceiptItem[];
    confidence: number;
    rawText: string;
    success: boolean;
}

interface ReceiptItem {
    description: string;
    quantity: number;
    price: number;
    total: number;
}
```

### 1.3 Fallback și Tratare Erori
```typescript
class OcrErrorHandler {
    static handleError(error: OcrError): ExpenseData | null {
        switch (error.type) {
            case 'NETWORK_ERROR':
                return this.handleNetworkError();
            case 'LOW_CONFIDENCE':
                return this.extractPartialData(error.data);
            case 'INVALID_IMAGE':
                return null;
            default:
                return this.fallbackToManualEntry();
        }
    }
    
    private static extractPartialData(data: any): ExpenseData {
        // Extrage ce date sunt disponibile cu confidence > 0.5
        return {
            merchant: data.merchant_name || '',
            amount: data.total || 0,
            date: new Date(),
            needsReview: true
        };
    }
}
```

## 2. AI Assistant - NLP și Clasificare

### 2.1 Implementare Claude AI
```typescript
// services/ai/ClaudeService.ts
export class ClaudeAssistant {
    private readonly API_ENDPOINT = 'https://api.anthropic.com/v1/messages';
    private readonly API_KEY = process.env.CLAUDE_API_KEY;
    
    async classifyExpense(text: string): Promise<ExpenseClassification> {
        const prompt = this.buildPrompt(text);
        const response = await this.callClaude(prompt);
        return this.parseResponse(response);
    }
    
    private buildPrompt(text: string): string {
        return `Context: Clasifică următoarea cheltuială în categoria și subcategoria potrivită.
                Text: "${text}"
                Categorii disponibile: Transport, Mâncare, Utilități, Shopping, Sănătate
                Format răspuns: JSON cu category, subcategory, confidence
                Exemplu răspuns: {"category": "Transport", "subcategory": "Combustibil", "confidence": 0.95}`;
    }
}
```

### 2.2 Exemple Prompturi și Răspunsuri
```json
// Exemplu prompt pentru "am platit 50 lei la benzinarie ieri"
{
    "input": "am platit 50 lei la benzinarie ieri",
    "classification": {
        "category": "Transport",
        "subcategory": "Combustibil",
        "confidence": 0.95,
        "extracted_data": {
            "amount": 50,
            "currency": "RON",
            "date": "2024-03-19",
            "merchant_type": "gas_station"
        }
    }
}
```

## 3. Integrare Bancară (GoCardless)

### 3.1 Implementare
```typescript
// services/bank/BankSyncService.ts
export class BankSyncService {
    private readonly SYNC_INTERVAL = 1000 * 60 * 60; // 1 oră
    
    async startSync() {
        // Implementare simulată pentru demo
        setInterval(async () => {
            const transactions = await this.fetchTransactions();
            await this.processTransactions(transactions);
        }, this.SYNC_INTERVAL);
    }
    
    private async processTransactions(transactions: BankTransaction[]) {
        for (const tx of transactions) {
            if (await this.isDuplicate(tx)) continue;
            
            await this.saveTransaction({
                ...tx,
                source: 'bank',
                status: 'pending_review'
            });
        }
    }
}
```

## 4. Optimizări și Performanță

### 4.1 Strategii Implementate
- Caching rezultate OCR: 24 ore
- Debounce pentru apeluri AI: 500ms
- Retry automat pentru erori temporare: max 3 încercări
- Rate limiting pentru API-uri externe
- Salvare locală rezultate în caz de offline

### 4.2 Tratare Erori
```typescript
// services/error/ErrorHandler.ts
export class ApiErrorHandler {
    static async handleApiError(error: ApiError, context: string) {
        // Log error
        await this.logError(error, context);
        
        // Retry logic
        if (this.isRetryable(error)) {
            return await this.retryOperation(error.operation);
        }
        
        // User feedback
        this.showUserFeedback(error);
        
        // Fallback
        return this.getFallbackData(context);
    }
}
```

## 5. Endpoints și Fluxuri de Date 