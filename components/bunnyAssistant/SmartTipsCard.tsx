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
import { SpendingAnalysis } from './types';
import { LinearGradient } from 'expo-linear-gradient';
import tipsImg from '@assets/decor/aiTips.png';
import { generateSpendingTips } from './spendingTips';

interface SmartTipsCardProps {
    analysis?: SpendingAnalysis | null;
    onUpdateBudget?: () => void;
    onOpenChat?: () => void;
    onViewStats?: () => void;
}

export default function SmartTipsCard({ analysis, onUpdateBudget, onOpenChat, onViewStats }: SmartTipsCardProps): JSX.Element {

    if (!analysis) {
        return (
            <View style={styles.container}>
                <View style={styles.headerRow}>
                    <Image source={tipsImg} style={styles.image} resizeMode="contain" />
                    <View style={styles.headerText}>
                        <Text style={styles.headerTitle}>Smart Tips</Text>
                        <Text style={styles.headerSubtitle}>Loading your personalized tips...</Text>
                    </View>
                </View>
            </View>
        );
    }

    const tips = generateSpendingTips(analysis);
    const actions = { budget: onUpdateBudget, chat: onOpenChat, stats: onViewStats };

    const getImpactColor = (impact: 'high' | 'medium' | 'low'): [string, string] => {
        switch (impact) {
            case 'high':
                return ['#FF6B6B', '#FF8787'];
            case 'medium':
                return ['#4ECDC4', '#7EE6DF'];
            case 'low':
                return ['#95A5A6', '#BDC3C7'];
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={tipsImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Smart Tips</Text>
                    <Text style={styles.headerSubtitle}>
                        Personalized insights to help you save
                    </Text>
                </View>
            </View>

            {tips.map(tip => (
                <View key={tip.id} style={styles.tipCard}>
                    <LinearGradient
                        colors={getImpactColor(tip.impact)}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.impactBadge}
                    >
                        <Text style={styles.impactText}>{tip.impact}</Text>
                    </LinearGradient>

                    <View style={styles.tipHeader}>
                        <Text style={styles.typeIcon}>{tip.icon}</Text>
                        <Text style={styles.tipTitle}>{tip.title}</Text>
                    </View>

                    <Text style={styles.tipDescription}>{tip.description}</Text>

                    {tip.action && (
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: getImpactColor(tip.impact)[0] }]}
                            onPress={actions[tip.action]}
                        >
                            <Text style={styles.actionButtonText}>
                                {tip.action === 'budget' ? 'View Budget' : tip.action === 'stats' ? 'View Stats' : 'Open Chat'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            ))}
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
        marginBottom: 4,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginTop: 0,
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
    typeIcon: {
        fontSize: 24,
        marginRight: 8,
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
    savingsContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F8E9',
        padding: 12,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#C5E1A5',
    },
    savingsLabel: {
        fontSize: 14,
        color: '#558B2F',
        fontFamily: 'Fredoka',
        marginRight: 8,
    },
    savingsAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#558B2F',
        fontFamily: 'Fredoka',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 12,
        padding: 12,
        marginTop: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
        marginRight: 8,
    },
    actionIcon: {
        marginLeft: 4,
    },
    timeframe: {
        fontSize: 12,
        color: '#95A5A6',
        fontFamily: 'Fredoka',
        marginTop: 8,
        textAlign: 'right',
    },
});
