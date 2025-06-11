import React from 'react';
import { View, StyleSheet, ImageBackground } from 'react-native';
import ChatInterface from '../components/ChatInterface';
import bg from '@assets/bg/AIback.png';

export default function ChatboxScreen() {
    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            <ChatInterface />
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefaf6',
    },
}); 