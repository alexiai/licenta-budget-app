// app/tabs/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabsLayout() {
    console.log('🧭 Rendering <TabsLayout>');
    console.log('📁 Tab: Overview');
    console.log('📁 Tab: Budget');
    console.log('📁 Tab: AI');
    console.log('📁 Tab: Profile');
    console.log('🚫 Hidden route: Add Expense');

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#ff6f61',
                tabBarStyle: { backgroundColor: '#fff8e7' },
                tabBarLabelStyle: { fontWeight: 'bold' },
            }}
        >
            <Tabs.Screen
                name="overview/index"
                options={{
                    tabBarLabel: 'Overview',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="eye" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="budget/index"
                options={{
                    tabBarLabel: 'Budget',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="wallet" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="ai/index"
                options={{
                    tabBarLabel: 'AI',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="sparkles" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile/index"
                options={{
                    tabBarLabel: 'Profile',
                    tabBarIcon: ({ color, size }) => (
                        <Ionicons name="person" size={size} color={color} />
                    ),
                }}
            />
            <Tabs.Screen
                name="expenses/add/index"
                options={{
                    href: null,
                }}
            />
        </Tabs>
    );
}
