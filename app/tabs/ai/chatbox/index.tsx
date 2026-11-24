import React from 'react';
import { View, Text, Pressable, StyleSheet, ImageBackground } from 'react-native';
import ChatInterface from '../../../../components/bunnyAssistant/ChatInterface';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import bg from '@assets/bg/AIback.png';

export default function ChatboxScreen() {
    const router = useRouter();
    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <View style={styles.header}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Back to Bunny Assistant"
                    onPress={() => {
                        if (router.canGoBack()) router.back();
                        else router.replace('/tabs/ai');
                    }}
                >
                    <Ionicons name="arrow-back" size={24} color="#91483C" />
                </Pressable>
                <Text style={styles.title}>Chat with Bunny</Text>
            </View>
            <ChatInterface />
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 16 },
    title: { fontFamily: 'Fredoka', fontSize: 24, color: '#91483C' },
    container: {
        flex: 1,
        backgroundColor: '#fefaf6',
    },
}); 