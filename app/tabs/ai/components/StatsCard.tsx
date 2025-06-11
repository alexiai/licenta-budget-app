import React from 'react';
import { View, StyleSheet } from 'react-native';

interface StatsCardProps {
    // Add your props here
}

export default function StatsCard({}: StatsCardProps) {
    return (
        <View>
            {/* Add your component content here */}
        </View>
    );
}

const styles = StyleSheet.create({
    barContainer: {
        flex: 1,
        height: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 6,
        overflow: 'hidden',
        marginRight: 16,
    },
    bar: {
        height: '100%',
        borderRadius: 6,
        maxWidth: '100%',
    },
}); 