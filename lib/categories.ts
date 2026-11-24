// ✅ Tipul explicit pentru consistență și utilizare în AI Assistant + restul aplicației
export interface Category {
    label: string;
    icon: any; // păstrăm tipul `any` pentru `require()`
    subcategories: string[];
}

const categories: Category[] = [
    {
        label: 'Housing',
        icon: require('@assets/icons/home.png'),
        subcategories: [
            'Rent',
            'Electricity',
            'Water',
            'Internet',
            'TV',
            'Insurance',
            'Home Supplies',
            'Maintenance' // necesar pentru AI Assistant
        ],
    },
    {
        label: 'Food & Drinks',
        icon: require('@assets/icons/food.png'),
        subcategories: [
            'Groceries',
            'Restaurant',
            'Coffee',
            'Drinks',
            'Fast Food',
            'Delivery'
        ],
    },
    {
        label: 'Transport',
        icon: require('@assets/icons/transport.png'),
        subcategories: [
            'Gas',
            'Taxi',
            'Parking',
            'Public Transport',
            'Car Insurance',
            'Car Loan',
            'Flight',
            'Repair',
            'Car Maintenance',
            'Tolls'
        ],
    },
    {
        label: 'Health',
        icon: require('@assets/icons/health.png'),
        subcategories: [
            'Medication',
            'Doctor',
            'Therapy',
            'Insurance',
            'Dentist',
            'Hospital',
            'Health Insurance'
        ],
    },
    {
        label: 'Lifestyle',
        icon: require('@assets/icons/lifestyle.png'),
        subcategories: [
            'Clothes',
            'Gym',
            'Self-care',
            'Beauty',
            'Sports',
            'Hobbies',
            'Shopping',
            'Personal Care',
            'Subscriptions'
        ],
    },
    {
        label: 'Entertainment',
        icon: require('@assets/icons/entertainment.png'),
        subcategories: [
            'Cinema',
            'Games',
            'Books',
            'Concerts',
            'Movies',
            'Streaming',
            'Events'
        ],
    },
    {
        label: 'Savings',
        icon: require('@assets/icons/savings.png'),
        subcategories: [
            'Savings',
            'Vacation Savings',
            'Investment',
            'Emergency Fund',
            'Retirement'
        ],
    },
    {
        label: 'Other',
        icon: require('@assets/icons/other.png'),
        subcategories: [
            'Miscellaneous',
            'Gifts',
            'Donations',
            'Fees',
            'Taxes'
        ],
    },
];

export default categories;

// Helper functions pentru AI Assistant
export const getCategoryByLabel = (label: string): Category | undefined => {
    return categories.find(cat => cat.label === label);
};

export const getAllSubcategories = (): string[] => {
    return categories.flatMap(cat => cat.subcategories);
};

export const getCategoryBySubcategory = (subcategory: string): Category | undefined => {
    return categories.find(cat => cat.subcategories.includes(subcategory));
};
