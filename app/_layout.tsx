// app/_layout.tsx
import { Stack } from 'expo-router';
import { useEffect, useState, createContext, useContext } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@lib/firebase';
import { useFonts } from 'expo-font';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OCRProvider } from '../components/bunnyAssistant/context/OCRContext';
import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
void SplashScreen.preventAutoHideAsync().catch(() => {});

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

    const [fontsLoaded, fontError] = useFonts({
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

        if ((fontsLoaded || fontError) && authChecked) {
            loadResources();
        }
    }, [fontsLoaded, fontError, authChecked]);

    if ((!fontsLoaded && !fontError) || !authChecked) {
        return <View style={{ flex: 1, backgroundColor: '#fefaf6' }} />;
    }

    return (
        <AuthContext.Provider value={{ user, authChecked }}>
            <GestureHandlerRootView style={{ flex: 1 }}>
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
                        name="tabs" 
                        options={{ 
                            headerShown: false,
                            animation: 'none'
                        }} 
                    />
                </Stack>
            </OCRProvider>
            </GestureHandlerRootView>
        </AuthContext.Provider>
    );
}
