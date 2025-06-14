# 6.1 Sistem de Gestionare a Tranzacțiilor

## 1. Introducere Manuală a Cheltuielilor

### 1.1 Componenta AddExpenseForm
```typescript
// components/expenses/AddExpenseForm.tsx
export const AddExpenseForm: React.FC = () => {
    const { categories } = useCategories();
    const { addExpense } = useExpenses();
    const { showToast } = useToast();
    
    const [formData, setFormData] = useState<ExpenseFormData>({
        amount: '',
        category: '',
        subcategory: '',
        date: new Date(),
        note: '',
        merchant: '',
        currency: 'RON'
    });
    
    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};
        
        if (!formData.amount || parseFloat(formData.amount) <= 0) {
            newErrors.amount = 'Suma trebuie să fie pozitivă';
        }
        
        if (!formData.category) {
            newErrors.category = 'Categoria este obligatorie';
        }
        
        if (!formData.date) {
            newErrors.date = 'Data este obligatorie';
        }
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        
        try {
            if (!validateForm()) {
                return;
            }
            
            const expense: Expense = {
                ...formData,
                amount: parseFloat(formData.amount),
                createdAt: new Date(),
                source: 'manual',
                status: 'confirmed'
            };
            
            await addExpense(expense);
            showToast('Cheltuială adăugată cu succes!', 'success');
            resetForm();
            
        } catch (error) {
            showToast('Eroare la salvare. Încercați din nou.', 'error');
        } finally {
            setIsSubmitting(false);
        }
    };
}
```

### 1.2 Validări și Feedback
```typescript
// hooks/useExpenseValidation.ts
export const useExpenseValidation = () => {
    const validateExpense = (data: ExpenseFormData): ValidationResult => {
        const errors: ValidationErrors = {};
        
        // Validare sumă
        if (!data.amount || isNaN(parseFloat(data.amount))) {
            errors.amount = 'Suma este obligatorie';
        } else if (parseFloat(data.amount) <= 0) {
            errors.amount = 'Suma trebuie să fie pozitivă';
        }
        
        // Validare categorie
        if (!data.category) {
            errors.category = 'Categoria este obligatorie';
        }
        
        // Validare dată
        if (!data.date || isNaN(data.date.getTime())) {
            errors.date = 'Data este invalidă';
        }
        
        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    };
    
    return { validateExpense };
};
```

### 1.3 Salvare în Firestore
```typescript
// services/expenses/ExpenseService.ts
export class ExpenseService {
    private readonly db = getFirestore();
    
    async addExpense(expense: Expense): Promise<string> {
        try {
            const docRef = await addDoc(collection(this.db, 'expenses'), {
                ...expense,
                userId: auth.currentUser?.uid,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            
            // Update budget stats
            await this.updateBudgetStats(expense);
            
            return docRef.id;
            
        } catch (error) {
            console.error('Error adding expense:', error);
            throw new Error('Failed to add expense');
        }
    }
    
    private async updateBudgetStats(expense: Expense) {
        const budgetRef = doc(this.db, 'budgets', expense.budgetId);
        
        await runTransaction(this.db, async (transaction) => {
            const budgetDoc = await transaction.get(budgetRef);
            const budget = budgetDoc.data();
            
            transaction.update(budgetRef, {
                totalSpent: (budget.totalSpent || 0) + expense.amount,
                lastUpdated: serverTimestamp()
            });
        });
    }
}
```

## 2. Interfață UI pentru Categorii

### 2.1 Componenta CategorySelector
```typescript
// components/categories/CategorySelector.tsx
export const CategorySelector: React.FC<CategorySelectorProps> = ({
    selectedCategory,
    onSelect
}) => {
    const { categories } = useCategories();
    
    return (
        <View style={styles.container}>
            <FlatList
                data={categories}
                horizontal
                showsHorizontalScrollIndicator={false}
                renderItem={({ item }) => (
                    <CategoryButton
                        category={item}
                        isSelected={selectedCategory?.id === item.id}
                        onPress={() => onSelect(item)}
                        icon={item.icon}
                        color={item.color}
                    />
                )}
            />
        </View>
    );
};
```

### 2.2 Componenta SubcategorySelector
```typescript
// components/categories/SubcategorySelector.tsx
export const SubcategorySelector: React.FC<SubcategorySelectorProps> = ({
    category,
    selectedSubcategory,
    onSelect
}) => {
    const subcategories = useMemo(() => {
        return category ? category.subcategories : [];
    }, [category]);
    
    return (
        <Modal visible={!!category} animationType="slide">
            <View style={styles.container}>
                <FlatList
                    data={subcategories}
                    renderItem={({ item }) => (
                        <SubcategoryItem
                            subcategory={item}
                            isSelected={selectedSubcategory?.id === item.id}
                            onSelect={() => onSelect(item)}
                        />
                    )}
                />
            </View>
        </Modal>
    );
};
```

## 3. Metode Alternative de Input

### 3.1 Chatbox Input
```typescript
// components/chat/ExpenseChatbox.tsx
export const ExpenseChatbox: React.FC = () => {
    const { classifyExpense } = useAIClassification();
    const { addExpense } = useExpenses();
    
    const handleMessage = async (text: string) => {
        try {
            // Clasificare text prin AI
            const classification = await classifyExpense(text);
            
            if (classification.confidence > 0.7) {
                const expense: Expense = {
                    amount: classification.amount,
                    category: classification.category,
                    subcategory: classification.subcategory,
                    date: classification.date || new Date(),
                    note: text,
                    source: 'chatbox',
                    status: 'confirmed'
                };
                
                await addExpense(expense);
                showFeedback('Cheltuială adăugată cu succes!');
            } else {
                showFeedback('Nu am înțeles. Poți reformula?', true);
            }
        } catch (error) {
            showFeedback('Eroare la procesare. Încearcă din nou.', true);
        }
    };
};
```

### 3.2 Voice Input
```typescript
// hooks/useVoiceInput.ts
export const useVoiceInput = () => {
    const { startRecognition, stopRecognition } = useVoice();
    const { classifyExpense } = useAIClassification();
    const { addExpense } = useExpenses();
    
    const handleVoiceInput = async () => {
        try {
            const text = await startRecognition();
            const classification = await classifyExpense(text);
            
            if (classification.confidence > 0.7) {
                const expense: Expense = {
                    ...classification,
                    source: 'voice',
                    status: 'confirmed'
                };
                
                await addExpense(expense);
                speakFeedback('Cheltuială adăugată cu succes!');
            } else {
                speakFeedback('Nu am înțeles. Poți repeta?');
            }
        } catch (error) {
            speakFeedback('Eroare la procesare. Încearcă din nou.');
        }
    };
    
    return { handleVoiceInput };
};
```

### 3.3 OCR Integration
```typescript
// components/ocr/ReceiptScanner.tsx
export const ReceiptScanner: React.FC = () => {
    const { scanReceipt } = useOCR();
    const { addExpense } = useExpenses();
    
    const handleScan = async (imageUri: string) => {
        try {
            const result = await scanReceipt(imageUri);
            
            if (result.confidence > 0.8) {
                const expense: Expense = {
                    amount: result.amount,
                    merchant: result.merchant,
                    date: result.date,
                    category: result.suggestedCategory,
                    source: 'ocr',
                    status: result.confidence > 0.95 ? 'confirmed' : 'needs_review',
                    receipt: {
                        imageUrl: imageUri,
                        ocrText: result.rawText
                    }
                };
                
                await addExpense(expense);
                showFeedback('Bon scanat cu succes!');
            } else {
                showFeedback('Calitate imagine slabă. Încearcă din nou.', true);
            }
        } catch (error) {
            showFeedback('Eroare la scanare. Încearcă din nou.', true);
        }
    };
};
```

### 3.4 Bank Integration
```typescript
// services/bank/TransactionSync.ts
export class TransactionSync {
    private readonly syncInterval = 1000 * 60 * 60; // 1 oră
    
    async startSync() {
        setInterval(async () => {
            const transactions = await this.fetchBankTransactions();
            
            for (const tx of transactions) {
                if (await this.isDuplicate(tx)) continue;
                
                const expense: Expense = {
                    amount: tx.amount,
                    merchant: tx.merchantName,
                    date: tx.date,
                    category: await this.classifyMerchant(tx.merchantName),
                    source: 'bank',
                    status: 'pending_review',
                    bankReference: tx.id
                };
                
                await this.addExpense(expense);
            }
        }, this.syncInterval);
    }
    
    private async isDuplicate(tx: BankTransaction): Promise<boolean> {
        const existing = await getDocs(
            query(
                collection(db, 'expenses'),
                where('bankReference', '==', tx.id)
            )
        );
        return !existing.empty;
    }
}
```

## 4. Tratare Erori și UX

### 4.1 Error Handling
```typescript
// services/error/ErrorHandler.ts
export class ExpenseErrorHandler {
    static async handleError(error: Error, context: string) {
        // Log error
        await this.logError(error, context);
        
        // Network errors
        if (error instanceof NetworkError) {
            return {
                message: 'Verifică conexiunea la internet',
                retry: true,
                saveLocally: true
            };
        }
        
        // Validation errors
        if (error instanceof ValidationError) {
            return {
                message: error.message,
                field: error.field,
                retry: false
            };
        }
        
        // Firebase errors
        if (error instanceof FirebaseError) {
            return {
                message: 'Eroare la salvare. Încercați mai târziu.',
                retry: true
            };
        }
        
        // Default
        return {
            message: 'A apărut o eroare. Încercați din nou.',
            retry: true
        };
    }
}
```

### 4.2 Feedback System
```typescript
// services/feedback/FeedbackService.ts
export class FeedbackService {
    static async showFeedback(message: string, isError = false) {
        // Visual feedback
        Toast.show({
            type: isError ? 'error' : 'success',
            text: message,
            duration: 3000
        });
        
        // Voice feedback for voice/OCR
        if (this.shouldUseVoiceFeedback()) {
            await Speech.speak(message, {
                language: 'ro-RO'
            });
        }
    }
    
    private static shouldUseVoiceFeedback(): boolean {
        const lastInputMethod = getLastInputMethod();
        return ['voice', 'ocr'].includes(lastInputMethod);
    }
}
```

## 5. Screenshot-uri Recomandate

### 5.1 Componente pentru Documentare
1. AddExpenseForm
   - Formular gol (stare inițială)
   - Validări active (erori vizibile)
   - Stare de succes după salvare

2. CategorySelector
   - Grid de categorii cu iconițe și culori
   - Categorie selectată (highlight)
   - Modal subcategorii deschis

3. Alternative Input
   - Chatbox cu exemplu de conversație
   - Voice input cu feedback vizual
   - Scanner OCR în acțiune
   - Rezultat scanare reușită

4. Error States
   - Eroare de rețea
   - Validare eșuată
   - Confirmare succes
   - Feedback vocal activ 