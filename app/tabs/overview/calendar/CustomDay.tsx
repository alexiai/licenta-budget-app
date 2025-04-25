import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';

const CustomDay = ({ date, state, marking }) => {
    const dayOfWeek = new Date(date.dateString).toLocaleDateString('en-US', { weekday: 'short' });

    return (
        <View style={styles.dayContainer}>
            <Text style={styles.dayLabel}>{dayOfWeek}</Text>
            <View style={styles.dayBubble}>
                <Text style={styles.dayNumber}>{date.day}</Text>
                {marking?.icon && (
                    <Image source={marking.icon} style={styles.calendarIcon} />
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    dayContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayLabel: {
        fontSize: 10,
        color: '#888',
        marginBottom: 2,
    },
    dayBubble: {
        width: 35,
        height: 35,
        borderRadius: 25,
        backgroundColor: '#ffe599',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
    },
    dayNumber: {
        fontWeight: 'bold',
        fontSize: 16,
        color: '#333',
    },
    calendarIcon: {
        width: 20,
        height: 20,
        position: 'absolute',
        top: -5,
        right: -5,
    },
});

export default CustomDay;
