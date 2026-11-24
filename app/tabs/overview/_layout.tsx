// app/tabs/overview/_layout.tsx
import { Stack } from 'expo-router';

export default function OverviewLayout() {
    return (
        <Stack 
            screenOptions={{ 
                headerShown: false,
                animation: 'none' // Disable animation to prevent flashing
            }} 
        />
    );
}
