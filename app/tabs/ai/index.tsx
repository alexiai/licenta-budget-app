import { View, Text, StyleSheet } from 'react-native';

export default function AiScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>🚀 AI Features Coming Soon!</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0f8ff',
    },
    text: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#6c5ce7',
    },
});