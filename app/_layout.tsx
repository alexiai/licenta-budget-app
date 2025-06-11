// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@lib/firebase';
import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { OCRProvider } from './tabs/ai/context/OCRContext';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
    const [user, setUser] = useState<User | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    const [fontsLoaded] = useFonts({
        Fredoka: require('../assets/fonts/Fredoka-VariableFont_wdth,wght.ttf'),
    });

    useEffect(() => {
        const loadResources = async () => {
            try {
                // Load fonts and wait for auth
                await Promise.all([
                    new Promise<void>((resolve) => {
                        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
                            setUser(firebaseUser);
                            setAuthChecked(true);
                            unsubscribe();
                            resolve();
                        });
                    }),
                    // Add any other async resources here
                ]);
            } catch (e) {
                console.warn(e);
            } finally {
                await SplashScreen.hideAsync();
            }
        };

        loadResources();
    }, [fontsLoaded]);

    if (!fontsLoaded || !authChecked) {
        return <View style={{ flex: 1, backgroundColor: '#fefaf6' }} />;
    }

    return (
        <OCRProvider>
            <Stack 
                screenOptions={{ 
                    headerShown: false,
                    animation: 'none',
                    autoHideHomeIndicator: true,
                    contentStyle: {
                        backgroundColor: '#fefaf6'
                    }
                }}
            >
                <Stack.Screen 
                    name="(tabs)" 
                    options={{ 
                        headerShown: false,
                        animation: 'none'
                    }} 
                />
                <Stack.Screen 
                    name="tabs/ai/chatbox" 
                    options={{ 
                        animation: 'none',
                        presentation: 'transparentModal'
                    }} 
                />
                <Stack.Screen 
                    name="tabs/ai/chatbox/ocr" 
                    options={{ 
                        animation: 'none',
                        presentation: 'transparentModal'
                    }} 
                />
            </Stack>
        </OCRProvider>
    );
}
