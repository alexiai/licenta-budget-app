import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
} from 'react-native';
import { SpendingAnalysis } from './types';
import categoryImg from '@assets/decor/aiCategories.png';
import categories from '../../lib/categories';
export default function UnusedCategoriesCard({ analysis }: { analysis: SpendingAnalysis }): JSX.Element {
    const spent = analysis.monthlyCategoryBreakdown ?? {};
    const unusedCategories = categories.filter(category => !spent[category.label]);
    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={categoryImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Category Insights</Text>
                    <Text style={styles.headerSubtitle}>
                        Where your carrots went this month
                    </Text>
                </View>
            </View>
            {Object.entries(spent).sort((a, b) => b[1] - a[1]).map(([name, amount]) => (
                <View key={name} style={styles.tipCard}>
                    <Text style={styles.tipTitle}>{name}</Text>
                    <Text style={styles.tipDescription}>
                        {amount.toFixed(2)} RON this month ({Math.round(amount / analysis.totalThisMonth * 100)}% of spending).
                        {name === 'Food & Drinks' ? ' Compare delivery and restaurant spending with groceries.'
                            : name === 'Transport' ? ' Review repeat trips for lower-cost options.'
                            : name === 'Savings' ? ' Keep your savings contributions visible in your plan.'
                            : ' Review repeat purchases in this category when planning your next budget.'}
                    </Text>
                </View>
            ))}
            {unusedCategories.length > 0 && (
                <Text style={styles.tipDescription}>
                    No spending logged this month in {unusedCategories.map(category => category.label).join(', ')}.
                </Text>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF9E6',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 16,
        marginLeft: -16,
    },
    image: {
        width: 160,
        height: 160,
        marginRight: 16,
        alignSelf: 'center',
        marginLeft: -16,
    },
    headerText: {
        flex: 1,
        paddingTop: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#90483c',
        fontFamily: 'Fredoka',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginTop: 4,
    },
    tipCard: {
        backgroundColor: 'rgba(255, 243, 224, 0.9)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        marginHorizontal: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    impactBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 1,
    },
    impactText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontFamily: 'Fredoka',
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 24,
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        flex: 1,
    },
    tipDescription: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 16,
        lineHeight: 20,
        fontFamily: 'Fredoka',
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
        marginTop: 24,
    },
    statusIcon: {
        fontSize: 24,
        marginRight: 8,
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
