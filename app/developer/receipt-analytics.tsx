
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert
} from 'react-native';
import { receiptAnalyticsService, ReceiptAnalytics } from '../../lib/receiptAnalytics';
import { auth } from '../../lib/firebase';

export default function ReceiptAnalyticsDashboard() {
    const [analytics, setAnalytics] = useState<ReceiptAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadAnalytics();
    }, []);

    const loadAnalytics = async () => {
        const user = auth.currentUser;
        if (!user) {
            Alert.alert('Authentication Required', 'Please log in to view analytics.');
            return;
        }

        try {
            setLoading(true);
            const data = await receiptAnalyticsService.generateAnalytics(user.uid);
            setAnalytics(data);
        } catch (error) {
            console.error('Error loading analytics:', error);
            Alert.alert('Error', 'Failed to load receipt analytics.');
        } finally {
            setLoading(false);
        }
    };

    const refreshAnalytics = async () => {
        setRefreshing(true);
        await loadAnalytics();
        setRefreshing(false);
    };

    if (!__DEV__) {
        return (
            <View style={styles.container}>
                <Text style={styles.devOnlyText}>This dashboard is only available in development mode.</Text>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#91483C" />
                <Text style={styles.loadingText}>Loading analytics...</Text>
            </View>
        );
    }

    if (!analytics) {
        return (
            <View style={styles.container}>
                <Text style={styles.errorText}>No analytics data available.</Text>
                <TouchableOpacity style={styles.retryButton} onPress={loadAnalytics}>
                    <Text style={styles.retryButtonText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🔧 Receipt Analytics Dashboard</Text>
                <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={refreshAnalytics}
                    disabled={refreshing}
                >
                    <Text style={styles.refreshButtonText}>
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Overview Stats */}
            <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{analytics.totalReceipts}</Text>
                    <Text style={styles.statLabel}>Total Receipts</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{analytics.successRate.toFixed(1)}%</Text>
                    <Text style={styles.statLabel}>Success Rate</Text>
                </View>
                <View style={styles.statCard}>
                    <Text style={styles.statNumber}>{analytics.avgConfidence.toFixed(1)}%</Text>
                    <Text style={styles.statLabel}>Avg Confidence</Text>
                </View>
            </View>

            {/* Receipt Type Distribution */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Receipt Type Distribution</Text>
                {Object.entries(analytics.receiptTypeDistribution).map(([type, count]) => (
                    <View key={type} style={styles.distributionItem}>
                        <Text style={styles.distributionLabel}>{type}</Text>
                        <View style={styles.distributionBar}>
                            <View
                                style={[
                                    styles.distributionFill,
                                    { width: `${(count / analytics.totalReceipts) * 100}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.distributionCount}>{count}</Text>
                    </View>
                ))}
            </View>

            {/* Layout Patterns */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Top Layout Patterns</Text>
                {analytics.layoutPatterns.slice(0, 5).map((pattern, index) => (
                    <View key={index} style={styles.patternItem}>
                        <Text style={styles.patternName}>{pattern.pattern}</Text>
                        <Text style={styles.patternStats}>
                            {pattern.count} occurrences • {pattern.successRate.toFixed(1)}% success
                        </Text>
                    </View>
                ))}
            </View>

            {/* Quality Trends */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Quality Trends</Text>
                {analytics.qualityTrends.slice(-6).map((trend, index) => (
                    <View key={index} style={styles.trendItem}>
                        <Text style={styles.trendDate}>{trend.date}</Text>
                        <Text style={styles.trendQuality}>
                            Avg Quality: {trend.avgQuality.toFixed(1)}/4 ({trend.count} receipts)
                        </Text>
                    </View>
                ))}
            </View>

            {/* Improvement Suggestions */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Improvement Suggestions</Text>
                {analytics.improvementSuggestions.map((suggestion, index) => (
                    <View key={index} style={styles.suggestionItem}>
                        <Text style={styles.suggestionText}>{suggestion}</Text>
                    </View>
                ))}
                {analytics.improvementSuggestions.length === 0 && (
                    <Text style={styles.noSuggestions}>
                        🎉 Great job! No major improvements needed right now.
                    </Text>
                )}
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
    devOnlyText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#666',
        margin: 32,
    },
    errorText: {
        textAlign: 'center',
        fontSize: 16,
        color: '#ff4444',
        margin: 32,
    },
    retryButton: {
        backgroundColor: '#91483C',
        padding: 12,
        borderRadius: 8,
        alignSelf: 'center',
    },
    retryButtonText: {
        color: 'white',
        fontWeight: '600',
    },
    header: {
        backgroundColor: '#91483C',
        padding: 20,
        paddingTop: 60,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: 'white',
    },
    refreshButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        padding: 8,
        borderRadius: 6,
    },
    refreshButtonText: {
        color: 'white',
        fontSize: 14,
    },
    statsContainer: {
        flexDirection: 'row',
        padding: 16,
        gap: 12,
    },
    statCard: {
        flex: 1,
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    statNumber: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#91483C',
    },
    statLabel: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
        textAlign: 'center',
    },
    section: {
        backgroundColor: 'white',
        margin: 16,
        marginTop: 0,
        padding: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    distributionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    distributionLabel: {
        width: 100,
        fontSize: 14,
        color: '#333',
    },
    distributionBar: {
        flex: 1,
        height: 20,
        backgroundColor: '#f0f0f0',
        borderRadius: 10,
        marginHorizontal: 8,
    },
    distributionFill: {
        height: '100%',
        backgroundColor: '#91483C',
        borderRadius: 10,
    },
    distributionCount: {
        width: 30,
        fontSize: 14,
        color: '#666',
        textAlign: 'right',
    },
    patternItem: {
        backgroundColor: '#f8f8f8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    patternName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    patternStats: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    trendItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    trendDate: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    trendQuality: {
        fontSize: 14,
        color: '#666',
    },
    suggestionItem: {
        backgroundColor: '#e8f5e8',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    suggestionText: {
        fontSize: 14,
        color: '#2e7d32',
    },
    noSuggestions: {
        textAlign: 'center',
        fontSize: 16,
        color: '#4caf50',
        fontStyle: 'italic',
    },
});
