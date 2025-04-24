// app/_layout.tsx
import { Stack, Slot } from 'expo-router';
import { useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '@lib/firebase';
import { useFonts } from 'expo-font';

export default function RootLayout() {
    const [user, setUser] = useState<User | null>(null);
    const [authChecked, setAuthChecked] = useState(false);

    const [fontsLoaded] = useFonts({
        Fredoka: require('../assets/fonts/Fredoka-VariableFont_wdth,wght.ttf'),
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
            setAuthChecked(true);
        });
        return unsubscribe;
    }, []);

    // Așteaptă fonturile și auth-ul
    if (!fontsLoaded || !authChecked) return null;

    // ✅ NU FACEM REDIRECT AICI!
    return <Slot />; // sau <Stack /> dacă vrei stack navigation default
}
