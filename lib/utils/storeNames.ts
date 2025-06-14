interface StoreCategory {
    names: string[];
    category: string;
    subcategory: string;
}

export const storeCategories: StoreCategory[] = [
    {
        names: ['profi', 'penny', 'megaimage', 'mega image', 'mega', 'lidl', 'kaufland', 'carrefour', 'auchan', 'metro', 'selgros'],
        category: 'Food & Drinks',
        subcategory: 'Groceries'
    },
    {
        names: ['lukoil', 'rompetrol', 'mol', 'omv', 'petrom', 'socar', 'gazprom'],
        category: 'Transport',
        subcategory: 'Gas'
    },
    {
        names: ['mcdonalds', 'mc donalds', "mcdonald's", 'kfc', 'burger king', 'subway', 'springtime', 'pizza hut', 'dominos'],
        category: 'Food & Drinks',
        subcategory: 'Restaurant'
    },
    {
        names: ['starbucks', '5 to go', '5togo', 'ted\'s coffee', 'teds coffee', 'gregory\'s', 'tucano coffee'],
        category: 'Food & Drinks',
        subcategory: 'Coffee'
    },
    {
        names: ['decathlon', 'intersport', 'hervis'],
        category: 'Lifestyle',
        subcategory: 'Sports'
    },
    {
        names: ['h&m', 'h & m', 'zara', 'pull&bear', 'pull & bear', 'bershka', 'c&a', 'c & a', 'reserved'],
        category: 'Lifestyle',
        subcategory: 'Clothes'
    },
    {
        names: ['dm', 'douglas', 'sephora', 'farmacia tei', 'sensiblu', 'catena', 'help net'],
        category: 'Health',
        subcategory: 'Pharmacy'
    }
];

export function findStoreInText(text: string): { storeName: string; category: string; subcategory: string } | null {
    const normalizedText = text.toLowerCase().trim();

    for (const storeCategory of storeCategories) {
        for (const storeName of storeCategory.names) {
            // Check for exact match or word boundary match
            const storeRegex = new RegExp(`\\b${storeName}\\b`, 'i');
            if (normalizedText.includes(storeName) || storeRegex.test(normalizedText)) {
                return {
                    storeName: storeName.charAt(0).toUpperCase() + storeName.slice(1), // Capitalize first letter
                    category: storeCategory.category,
                    subcategory: storeCategory.subcategory
                };
            }
        }
    }

    return null;
}

export function isStoreName(text: string): boolean {
    const normalizedText = text.toLowerCase().trim();
    return storeCategories.some(category => 
        category.names.some(store => {
            const storeRegex = new RegExp(`\\b${store}\\b`, 'i');
            return normalizedText.includes(store) || storeRegex.test(normalizedText);
        })
    );
} 