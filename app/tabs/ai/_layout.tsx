// ✅ app/tabs/ai/_layout.tsx
import { Stack } from 'expo-router';
console.log('🤖 Loaded: AI layout');

export default function AiLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
}
