
import React from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';

interface ChatMessage {
    id: string;
    text: string;
    isUser: boolean;
    timestamp: Date;
    isTranslated?: boolean;
    originalText?: string;
}

interface MessageListProps {
    messages: ChatMessage[];
    isProcessing: boolean;
    scrollViewRef: React.RefObject<ScrollView>;
}

export default function MessageList({ messages, isProcessing, scrollViewRef }: MessageListProps) {
    return (
        <ScrollView
            ref={scrollViewRef}
            style={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
        >
            {messages.map((message) => (
                <View
                    key={message.id}
                    style={[
                        styles.messageContainer,
                        message.isUser ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
                    ]}
                >
                    <View style={message.isUser ? styles.userMessage : styles.botMessage}>
                        <Text style={[
                            styles.messageText,
                            message.isUser ? styles.userMessageText : styles.botMessageText
                        ]}>
                            {message.text}
                        </Text>
                        {message.isTranslated && message.originalText && (
                            <Text style={styles.originalText}>
                                Original: {message.originalText}
                            </Text>
                        )}
                    </View>
                </View>
            ))}

            {isProcessing && (
                <View style={styles.processingContainer}>
                    <ActivityIndicator size="small" color="#91483C" />
                    <Text style={styles.processingText}>Bunny is thinking...</Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    messagesContainer: {
        flex: 1,
        padding: 16,
    },
    messageContainer: {
        marginVertical: 4,
        maxWidth: '80%',
    },
    userMessage: {
        alignSelf: 'flex-end',
        backgroundColor: '#91483C',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    botMessage: {
        alignSelf: 'flex-start',
        backgroundColor: 'white',
        borderRadius: 18,
        paddingHorizontal: 16,
        paddingVertical: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    userMessageText: {
        color: 'white',
    },
    botMessageText: {
        color: '#333',
    },
    originalText: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#666',
        marginTop: 4,
    },
    processingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
    },
    processingText: {
        marginLeft: 8,
        color: '#91483C',
        fontSize: 14,
    },
});
