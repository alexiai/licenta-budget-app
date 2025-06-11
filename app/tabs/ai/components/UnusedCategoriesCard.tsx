import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis } from './SmartAdviceSection';
import categoryImg from '@assets/decor/aiCategories.png';
import { LinearGradient } from 'expo-linear-gradient';

interface CategoryInsight {
    category: string;
    status: 'unused' | 'underused' | 'overused' | 'balanced';
    percentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    recommendation: string;
    action: string;
    impact: 'high' | 'medium' | 'low';
}

interface UnusedCategoriesCardProps {
    analysis: SpendingAnalysis | null;
}

export default function UnusedCategoriesCard({ analysis }: UnusedCategoriesCardProps): JSX.Element {
    if (!analysis) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Image source={categoryImg} style={styles.image} resizeMode="contain" />
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Category Insights</Text>
                        <Text style={styles.headerSubtitle}>Loading your category analysis...</Text>
                    </View>
                </View>
            </View>
        );
    }

    const generateCategoryInsights = (): CategoryInsight[] => {
        const insights: CategoryInsight[] = [];
        const {
            categoryBreakdown,
            topCategories,
            spendingPatterns,
            totalThisMonth
        } = analysis;

        // Calculate average category spending
        const categories = Object.keys(categoryBreakdown);
        const totalCategories = categories.length;
        const averageSpending = totalThisMonth / totalCategories;

        categories.forEach(category => {
            const spending = categoryBreakdown[category];
            const percentage = (spending / totalThisMonth) * 100;
            let status: 'unused' | 'underused' | 'overused' | 'balanced';
            let impact: 'high' | 'medium' | 'low';
            let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
            let recommendation = '';
            let action = '';

            // Determine category status
            if (spending === 0) {
                status = 'unused';
                impact = 'medium';
                recommendation = `You haven't used the ${category} category this month. Consider if you're tracking all your expenses.`;
                action = `Review your ${category} expenses`;
            } else if (spending < averageSpending * 0.3) {
                status = 'underused';
                impact = 'low';
                recommendation = `${category} spending is notably low. Make sure you're not missing any expenses in this category.`;
                action = `Check for missing ${category} expenses`;
            } else if (spending > averageSpending * 2) {
                status = 'overused';
                impact = 'high';
                recommendation = `${category} spending is significantly higher than other categories. Consider setting a budget limit.`;
                action = `Set a budget for ${category}`;
            } else {
                status = 'balanced';
                impact = 'low';
                recommendation = `Your ${category} spending is well-balanced relative to other categories.`;
                action = `Maintain current ${category} spending`;
            }

            // Check for spending spikes
            const spike = spendingPatterns.recentSpikes.find(s => s.category === category);
            if (spike) {
                trend = 'increasing';
                impact = 'high';
                recommendation = `${category} spending has increased by ${spike.increase}% ${spike.timeframe}. ${recommendation}`;
            }

            insights.push({
                category,
                status,
                percentage,
                trend,
                recommendation,
                action,
                impact
            });
        });

        // Sort insights by impact and status
        return insights.sort((a, b) => {
            const impactOrder = { high: 0, medium: 1, low: 2 };
            const statusOrder = { overused: 0, unused: 1, underused: 2, balanced: 3 };
            return impactOrder[a.impact] - impactOrder[b.impact] || 
                   statusOrder[a.status] - statusOrder[b.status];
        });
    };

    const getStatusColor = (status: string): [string, string] => {
        switch (status) {
            case 'unused':
                return ['#FF9800', '#FFA726'] as [string, string];
            case 'underused':
                return ['#4CAF50', '#66BB6A'] as [string, string];
            case 'overused':
                return ['#F44336', '#EF5350'] as [string, string];
            default:
                return ['#2196F3', '#42A5F5'] as [string, string];
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'unused':
                return '⚠️';
            case 'underused':
                return '📉';
            case 'overused':
                return '📈';
            default:
                return '✅';
        }
    };

    const insights = generateCategoryInsights();

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={categoryImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Category Insights</Text>
                    <Text style={styles.headerSubtitle}>
                        Smart analysis of your spending categories
                    </Text>
                </View>
            </View>

            {insights.map((insight) => (
                <View key={insight.category} style={styles.insightCard}>
                    <LinearGradient
                        colors={getStatusColor(insight.status)}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.statusBadge}
                    >
                        <Text style={styles.statusText}>{insight.status}</Text>
                    </LinearGradient>

                    <View style={styles.insightHeader}>
                        <Text style={styles.statusIcon}>{getStatusIcon(insight.status)}</Text>
                        <Text style={styles.categoryTitle}>{insight.category}</Text>
                        <Text style={styles.percentage}>{Math.round(insight.percentage)}%</Text>
                    </View>

                    <Text style={styles.recommendation}>{insight.recommendation}</Text>

                    {insight.trend === 'increasing' && (
                        <View style={styles.trendBadge}>
                            <Text style={styles.trendText}>🔥 Trending Up</Text>
                        </View>
                    )}

                    <TouchableOpacity style={styles.actionButton}>
                        <Text style={styles.actionButtonText}>{insight.action}</Text>
                    </TouchableOpacity>
                </View>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 16,
    },
    image: {
        width: 120,
        height: 120,
        marginRight: 16,
        alignSelf: 'center',
    },
    headerText: {
        flex: 1,
        paddingTop: 8,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#90483c',
        fontFamily: 'Fredoka',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginTop: 4,
    },
    insightCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    statusBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontFamily: 'Fredoka',
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    statusIcon: {
        fontSize: 24,
        marginRight: 8,
    },
    categoryTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        flex: 1,
    },
    percentage: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666666',
        fontFamily: 'Fredoka',
    },
    recommendation: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 16,
        lineHeight: 20,
        fontFamily: 'Fredoka',
    },
    trendBadge: {
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    trendText: {
        color: '#FF8F00',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
    actionButton: {
        backgroundColor: '#F97850',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
});
