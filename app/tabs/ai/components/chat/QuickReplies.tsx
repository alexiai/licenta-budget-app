
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

interface QuickReply {
    text: string;
    action: () => void;
}

interface QuickRepliesProps {
    quickReplies: QuickReply[];
    onQuickReply: (reply: QuickReply) => void;
}

export default function QuickReplies({ quickReplies, onQuickReply }: QuickRepliesProps) {
    if (quickReplies.length === 0) return null;

    return (
        <ScrollView
            horizontal
            style={styles.quickRepliesContainer}
            showsHorizontalScrollIndicator={false}
        >
            {quickReplies.map((reply, index) => (
                <TouchableOpacity
                    key={index}
                    style={styles.quickReplyButton}
                    onPress={() => onQuickReply(reply)}
                >
                    <Text style={styles.quickReplyText}>{reply.text}</Text>
                </TouchableOpacity>
            ))}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    quickRepliesContainer: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    quickReplyButton: {
        backgroundColor: '#fff0e8',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#91483C',
    },
    quickReplyText: {
        color: '#91483C',
        fontSize: 14,
        fontWeight: '500',
    },
});
