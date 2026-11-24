import { View, Text, TouchableOpacity, ImageBackground, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import welcomeBg from '@assets/bg/welcome-screen.png';
import { useAuth } from '../_layout';

export default function WelcomeScreen() {
    const { user, authChecked } = useAuth();
    const router = useRouter();

    const handleStart = () => {
        if (!authChecked) return; // prevent early navigation
        if (user) {
            router.replace('/tabs/overview/list');
        } else {
            router.push('/auth/login');
        }
    };

    if (!authChecked) return null;

    return (
        <View style={styles.wrapper}>
            <ImageBackground source={welcomeBg} resizeMode="cover" style={styles.bg}>
                <View style={styles.footerBar}>
                    <Text style={styles.title}>
                        Welcome to{"\n"}
                        <Text style={styles.brand}>BunnyBuddy</Text>
                    </Text>

                    <TouchableOpacity style={styles.button} onPress={handleStart}>
                        <Text style={styles.buttonText}>Get Started</Text>
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#6A4C32', // brown-orange (border)
        padding: 4, // visible margin around image
    },
    bg: {
        flex: 1,
        width: '100%',
        height: '100%',
        justifyContent: 'flex-end',
        borderWidth: 3,
        borderColor: '#6A4C32', // brown border
    },
    footerBar: {
        backgroundColor: '#FFE9B8', // cream-beige for contrast
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingTop: 8,
        paddingBottom: 30,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderWidth: 5,
        borderColor: '#6A4C32',
    },
    title: {
        fontFamily: 'Fredoka',
        fontSize: 40,
        textAlign: 'center',
        color: '#000',
        fontWeight: 'bold',
        lineHeight: 48,
        marginBottom: 24,
    },
    brand: {
        fontWeight: 'bold',
        color: '#000',
    },
    button: {
        backgroundColor: '#F19953',
        paddingVertical: 16,
        paddingHorizontal: 50,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: '#000',
    },
    buttonText: {
        fontFamily: 'Fredoka',
        fontSize: 28,
        fontWeight: 'bold',
        letterSpacing: -1.5,
        color: '#000',
    },
});
