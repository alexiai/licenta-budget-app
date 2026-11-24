interface StoreCategory {
    names: string[];
    category: string;
    subcategory: string;
}

export const storeCategories: StoreCategory[] = [
    {
        names: ['profi', 'penny', 'megaimage', 'mega image', 'mega', 'lidl', 'kaufland', 'carrefour', 'auchan', 'metro cash and carry', 'selgros'],
        category: 'Food & Drinks',
        subcategory: 'Groceries'
    },
    {
        names: ['lukoil', 'rompetrol', 'mol', 'omv', 'petrom', 'socar', 'gazprom'],
        category: 'Transport',
        subcategory: 'Gas'
    },
    {
        names: ['mcdonalds', 'mc donalds', "mcdonald's", 'kfc', 'burger king', 'subway sandwich', 'springtime', 'pizza hut', 'dominos'],
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
        subcategory: 'Medication'
    }
];

const normalize = (value: string) => value.toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();

export function findStoreInText(text: string): { storeName: string; category: string; subcategory: string } | null {
    const input = ` ${normalize(text)} `;
    for (const { category, subcategory, names } of storeCategories) {
        const name = names.find(store => input.includes(` ${normalize(store)} `));
        if (name) return { storeName: name, category, subcategory };
    }
    return null;
}

export function isStoreName(text: string): boolean {
    return findStoreInText(text) !== null;
}
