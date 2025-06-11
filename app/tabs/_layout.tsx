// app/tabs/_layout.tsx
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity, View } from 'react-native';

export default function TabsLayout() {
    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                headerStyle: {
                    height: 0,
                },
                tabBarShowLabel: false,
                tabBarActiveTintColor: '#FF6F61',
                tabBarInactiveTintColor: '#B8860B',
                tabBarStyle: {
                    backgroundColor: '#FFE8B0',
                    borderTopWidth: 0,
                    height: 70,
                    paddingBottom: 10,
                    paddingTop: 10,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 8,
                    elevation: 8,
                },
                tabBarIconStyle: {
                    marginTop: 5,
                },
                tabBarItemStyle: {
                    borderRadius: 25,
                    marginHorizontal: 8,
                    backgroundColor: 'transparent',
                },
                tabBarButton: (props) => (
                    <TabBarButton {...props} />
                ),
            }}
        >
            <Tabs.Screen
                name="overview"
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <TabIcon
                            name="eye"
                            color={color}
                            size={size}
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="budget"
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <TabIcon
                            name="wallet"
                            color={color}
                            size={size}
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="ai"
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <TabIcon
                            name="sparkles"
                            color={color}
                            size={size}
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    tabBarIcon: ({ color, size, focused }) => (
                        <TabIcon
                            name="person"
                            color={color}
                            size={size}
                            focused={focused}
                        />
                    ),
                }}
            />
            <Tabs.Screen name="expenses" options={{ href: null }} />

        </Tabs>
    );
}

// Custom Tab Button Component
function TabBarButton({ children, onPress, accessibilityState, ...props }) {
    const focused = accessibilityState?.selected;

    return (
        <TouchableOpacity
            {...props}
            onPress={onPress}
            style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: focused ? '#FFD366' : 'transparent',
                borderRadius: 20,
                marginHorizontal: 4,
                shadowColor: focused ? '#000' : 'transparent',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: focused ? 0.15 : 0,
                shadowRadius: focused ? 4 : 0,
                elevation: focused ? 3 : 0,
                transform: [{ scale: focused ? 1.1 : 1 }],
            }}
            activeOpacity={0.7}
        >
            {children}
        </TouchableOpacity>
    );
}

// Custom Tab Icon Component
function TabIcon({ name, color, size, focused }) {
    return (
        <View
            style={{
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: focused ? '#FF6F61' : 'transparent',
                borderWidth: focused ? 0 : 2,
                borderColor: focused ? 'transparent' : '#D4A574',
            }}
        >
            <Ionicons
                name={name}
                size={focused ? 24 : 22}
                color={focused ? '#FFFFFF' : color}
            />
        </View>
    );
}
