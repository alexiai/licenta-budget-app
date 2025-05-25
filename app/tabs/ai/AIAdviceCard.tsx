import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { AIAdvice } from '@lib/types';

export default function AIAdviceCard({ advice }: { advice: AIAdvice }) {
    const renderContent = () => {
        switch (advice.type) {
            case 'quest_update':
                return (
                    <View style={styles.questCard}>
                        <Text style={styles.title}>{advice.title}</Text>
                        <Text style={styles.description}>{advice.description}</Text>
                        {advice.actionable && (
                            <TouchableOpacity style={styles.claimButton}>
                                <Text style={styles.claimText}>
                                    {advice.suggestedAction} (+{advice.carrotCoinsReward} 🥕)
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );

            case 'weekly_report':
                return (
                    <View style={styles.reportCard}>
                        <Text style={styles.title}>{advice.title}</Text>
                        <Text style={styles.description}>{advice.description}</Text>
                        {advice.insights?.map((insight, i) => (
                            <Text key={`${insight}-${i}`} style={styles.insight}>{insight}</Text>
                        ))}
                        <View style={styles.achievementsContainer}>
                            {advice.achievements?.map((achievement, i) => (
                                <View key={`${achievement}-${i}`} style={styles.achievement}>
                                    <Text style={styles.achievementText}>{achievement}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                );

            default:
                return (
                    <View style={styles.card}>
                        <Text style={styles.title}>{advice.title}</Text>
                        <Text style={styles.description}>{advice.description}</Text>
                        {advice.actionable && (
                            <TouchableOpacity style={styles.actionButton}>
                                <Text style={styles.actionText}>
                                    {advice.suggestedAction} (+{advice.carrotCoinsReward} 🥕)
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                );
        }
    };

    return renderContent();
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#FFF5E6',
        borderRadius: 15,
        padding: 16,
        margin: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    questCard: {
        backgroundColor: '#E6FFF5',
        borderRadius: 15,
        padding: 16,
        margin: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    reportCard: {
        backgroundColor: '#F5E6FF',
        borderRadius: 15,
        padding: 16,
        margin: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        color: '#666',
        marginBottom: 12,
    },
    actionButton: {
        backgroundColor: '#FFE4B5',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    claimButton: {
        backgroundColor: '#B5FFE4',
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    actionText: {
        color: '#91483C',
        fontWeight: '600',
    },
    claimText: {
        color: '#3C9148',
        fontWeight: '600',
    },
    insight: {
        fontSize: 14,
        color: '#666',
        marginVertical: 4,
        paddingLeft: 8,
        borderLeftWidth: 2,
        borderLeftColor: '#91483C',
    },
    achievementsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: 8,
        gap: 8,
    },
    achievement: {
        backgroundColor: '#FFE4B5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    achievementText: {
        color: '#91483C',
        fontSize: 12,
        fontWeight: '500',
    },
});
