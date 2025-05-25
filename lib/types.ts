export interface Transaction {
    id: string;
    category: string;
    subcategory: string;
    amount: number;
    date: string; // sau Date dacă deja o parsezi
    userId: string;
}

export interface Budget {
    id: string;
    userId: string;
    categories: {
        name: string;
        subcategories: {
            name: string;
            amount: number;
        }[];
    }[];
}

export interface AIAdvice {
    type: 'quest_update' | 'weekly_report' | 'achievement' | 'unused_category' | 'overspending' | 'spending_pattern' | 'savings_opportunity';
    title: string;
    description: string;
    score: number;
    category: string;
    actionable: boolean;
    suggestedAction?: string;
    carrotCoinsReward?: number;
    insights?: string[];
    achievements?: string[];
}

export interface Quest {
    id: string;
    title: string;
    description: string;
    type: string; // ex: 'SAVINGS'
    category: string;
    targetPercentage: number;
    reward: number;
    deadline: Date;
    milestones: Milestone[];
}

export interface Milestone {
    percentage: number;
    reward: number;
    completed: boolean;
    rewardClaimed?: boolean;
}
