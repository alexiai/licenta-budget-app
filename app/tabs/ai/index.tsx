import React, { useState, useEffect } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Text,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SmartAdviceSection from './components/SmartAdviceSection';
import ChatInterface from './components/ChatInterface';
import { auth } from '../../../lib/firebase';

export default function AiScreen(): JSX.Element {
    const [showChat, setShowChat] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Initialize the screen
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    if (!auth.currentUser) {
        return (
            <View style={styles.container}>
                <View style={styles.center}>
                    <Text style={styles.loginText}>Please log in to access AI features</Text>
                </View>
            </View>
        );
    }

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#91483C" />
                    <Text style={styles.loadingText}>🐰 Bunny is analyzing your expenses...</Text>
                </View>
            </View>
        );
    }

    if (showChat) {
        return (
            <View style={styles.container}>
                <View style={styles.chatHeader}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setShowChat(false)}
                    >
                        <Ionicons name="arrow-back" size={24} color="#91483C" />
                    </TouchableOpacity>
                    <Text style={styles.chatTitle}>Chat with Bunny 🐰</Text>
                </View>
                <ChatInterface />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>🐰 Smart Bunny Advisor</Text>
                <Text style={styles.subtitle}>Your personal financial coach</Text>
            </View>

            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <SmartAdviceSection />
            </ScrollView>

            <TouchableOpacity
                style={styles.chatButton}
                onPress={() => setShowChat(true)}
            >
                <Ionicons name="chatbubble" size={24} color="white" />
                <Text style={styles.chatButtonText}>Chat with Bunny</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefaf6',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loginText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#91483C',
        marginTop: 16,
        textAlign: 'center',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        alignItems: 'center',
        backgroundColor: '#fff0e8',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 4,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    chatButton: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        backgroundColor: '#91483C',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 2 },
        elevation: 5,
    },
    chatButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#fff0e8',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    backButton: {
        marginRight: 16,
    },
    chatTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#91483C',
    },
});
