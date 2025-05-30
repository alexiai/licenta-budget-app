import React from 'react';
import { View } from 'react-native';
import SmartTipsCard from './SmartTipsCard';
import UnusedCategoriesCard from './UnusedCategoriesCard';
import WeeklyStatsCard from './WeeklyStatsCard';
import MiniQuestsCard from './MiniQuestsCard';

export interface SpendingAnalysis {
    topCategories: { category: string; amount: number; percentage: number }[];
    unusedCategories: string[];
    categoryBreakdown: { [key: string]: number };
    subcategoryBreakdown: { [key: string]: number };
    weeklyStats: {
        currentWeek: number;
        lastWeek: number;
        trend: string;
    };
    totalSpent: number;
    totalThisMonth: number;
    totalLastMonth: number;
    budgetRemaining: number;
    averageDailySpending: number;
}

export interface ExpenseData {
    id: string;
    amount: number;
    category: string;
    subcategory: string;
    date: string;
    note: string;
}

interface SmartAdviceSectionProps {
    activeTab: 'tips' | 'categories' | 'stats' | 'quests';
}

export default function SmartAdviceSection({ activeTab }: SmartAdviceSectionProps): JSX.Element {
    // Mock analysis data - replace with real data from your expense tracking
    const mockAnalysis: SpendingAnalysis = {
        topCategories: [
            { category: 'Food & Drinks', amount: 850, percentage: 35 },
            { category: 'Transport', amount: 420, percentage: 18 },
            { category: 'Entertainment', amount: 380, percentage: 16 }
        ],
        unusedCategories: ['Health', 'Savings'],
        categoryBreakdown: {
            'Food & Drinks': 850,
            'Transport': 420,
            'Entertainment': 380,
            'Housing': 120,
            'Lifestyle': 95
        },
        subcategoryBreakdown: {
            'Coffee': 120,
            'Restaurant': 380,
            'Groceries': 350,
            'Drinks': 80,
            'Gas': 250,
            'Public Transport': 170,
            'Movies': 180,
            'Games': 200
        },
        weeklyStats: {
            currentWeek: 245,
            lastWeek: 312,
            trend: 'decreasing'
        },
        totalSpent: 1865,
        totalThisMonth: 1865,
        totalLastMonth: 1650,
        budgetRemaining: 635,
        averageDailySpending: 62
    };

    // Mock expenses data
    const mockExpenses: ExpenseData[] = [
        {
            id: '1',
            amount: 45,
            category: 'Food & Drinks',
            subcategory: 'Coffee',
            date: '2024-01-15T10:30:00Z',
            note: 'Morning coffee'
        },
        {
            id: '2',
            amount: 120,
            category: 'Food & Drinks',
            subcategory: 'Restaurant',
            date: '2024-01-14T19:45:00Z',
            note: 'Dinner with friends'
        },
        {
            id: '3',
            amount: 25,
            category: 'Transport',
            subcategory: 'Taxi',
            date: '2024-01-13T08:15:00Z',
            note: 'Uber to work'
        }
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'tips':
                return <SmartTipsCard analysis={mockAnalysis} />;
            case 'categories':
                return <UnusedCategoriesCard analysis={mockAnalysis} />;
            case 'stats':
                return <WeeklyStatsCard analysis={mockAnalysis} />;
            case 'quests':
                return <MiniQuestsCard analysis={mockAnalysis} expenses={mockExpenses} />;
            default:
                return <SmartTipsCard analysis={mockAnalysis} />;
        }
    };

    return (
        <View>
            {renderContent()}
        </View>
    );
}
