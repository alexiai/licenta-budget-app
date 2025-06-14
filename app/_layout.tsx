// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect, useState, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@lib/firebase';
import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { OCRProvider } from './tabs/ai/context/OCRContext';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Create auth context to prevent multiple auth checks
export const AuthContext = createContext<{
    user: User | null;
    authChecked: boolean;
}>({
    user: null,
    authChecked: false,
});

export const useAuth = () => useContext(AuthContext);

export default function RootLayout() {
    const [user, setUser] = useState<User | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    const [fontsLoaded] = useFonts({
        Fredoka: require('../assets/fonts/Fredoka-VariableFont_wdth,wght.ttf'),
    });

    useEffect(() => {
        // Keep the auth listener mounted to handle auth state changes
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setAuthChecked(true);
        });

        return unsubscribe;
    }, []);

    useEffect(() => {
        const loadResources = async () => {
            try {
                await SplashScreen.hideAsync();
            } catch (e) {
                console.warn(e);
            }
        };

        if (fontsLoaded && authChecked) {
            loadResources();
        }
    }, [fontsLoaded, authChecked]);

    if (!fontsLoaded || !authChecked) {
        return <View style={{ flex: 1, backgroundColor: '#fefaf6' }} />;
    }

    return (
        <AuthContext.Provider value={{ user, authChecked }}>
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
        </AuthContext.Provider>
    );
}
