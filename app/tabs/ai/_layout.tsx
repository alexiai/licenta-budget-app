// app/tabs/ai/_layout.tsx
import { Stack } from 'expo-router';

export default function AILayout() {
    return (
        <Stack 
            screenOptions={{ 
                headerShown: false,
                animation: 'none',
                presentation: 'card'
            }}
        >
            <Stack.Screen 
                name="index"
                options={{
                    animation: 'none'
                }}
            />
            <Stack.Screen 
                name="chatbox/index"
                options={{
                    animation: 'none',
                    presentation: 'card'
                }}
            />
            <Stack.Screen 
                name="chatbox/ocr"
                options={{
                    animation: 'none',
                    presentation: 'card'
                }}
            />
        </Stack>
    );
}
