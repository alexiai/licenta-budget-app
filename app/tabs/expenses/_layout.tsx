// app/tabs/expenses/_layout.tsx
import { Stack } from 'expo-router';

// toată zona "expenses/*" devine rută internă, NU tab
export default function ExpensesLayout() {
    return <Stack screenOptions={{ headerShown: false }} />;
}
