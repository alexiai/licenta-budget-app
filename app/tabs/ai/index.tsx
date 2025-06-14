import { Image } from 'react-native';
import React, { useState, useEffect } from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity, Text, ActivityIndicator, ImageBackground,} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import SmartAdviceSection from './components/SmartAdviceSection';
import ChatInterface from './components/ChatInterface';
import { auth, db } from '../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import bg from '@assets/bg/AIback.png';
import carrotIcon from '@assets/decor/carrot-icon.png';
import bunnyHead from '@assets/icons/bunnyhead.png';
import calendarIcon from '@assets/icons/calendarMedium.png'; // imaginea în loc de emoji
import { useRouter } from 'expo-router';
import SmartTipsCard from './components/SmartTipsCard';
import { SpendingAnalysis, ExpenseData } from './components/SmartAdviceSection';
import UnusedCategoriesCard from './components/UnusedCategoriesCard';
import WeeklyStatsCard from './components/WeeklyStatsCard';
import MiniQuestsCard from './components/MiniQuestsCard';

type TabType = 'tips' | 'categories' | 'stats' | 'quests';

export default function AiScreen(): JSX.Element {
    const [showChat, setShowChat] = useState(false);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('tips');
    const [analysis, setAnalysis] = useState<SpendingAnalysis | null>(null);
    const [expenses, setExpenses] = useState<ExpenseData[]>([]);
    const router = useRouter();

    useEffect(() => {
        const loadData = async () => {
            console.log('[AiScreen] Starting data load');
            try {
                if (!auth.currentUser) {
                    console.log('[AiScreen] No user logged in');
                    return;
                }
                console.log('[AiScreen] Current user:', auth.currentUser.uid);

                // Fetch expenses
                const expensesRef = collection(db, 'expenses');
                const q = query(expensesRef, where('userId', '==', auth.currentUser.uid));
                console.log('[AiScreen] Fetching expenses...');
                const querySnapshot = await getDocs(q);
                const expensesData = querySnapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                })) as ExpenseData[];
                console.log('[AiScreen] Fetched expenses:', {
                    count: expensesData.length,
                    sample: expensesData.slice(0, 2)
                });
                setExpenses(expensesData);

                // Generate analysis
                console.log('[AiScreen] Generating analysis...');
                const analysisData: SpendingAnalysis = {
                    totalThisMonth: 1000,
                    totalLastMonth: 900,
                    averageDailySpending: 33.33,
                    topCategories: [],
                    weeklyStats: {
                        currentWeek: 200,
                        lastWeek: 180,
                        trend: 'increasing',
                        topSpendingDay: { day: 'Friday', amount: 50 },
                        dailyBreakdown: {
                            Monday: 30,
                            Tuesday: 25,
                            Wednesday: 35,
                            Thursday: 40,
                            Friday: 50,
                            Saturday: 45,
                            Sunday: 35
                        }
                    },
                    spendingPatterns: {
                        essentialVsFlexible: {
                            essential: 600,
                            flexible: 400
                        },
                        weekdayVsWeekend: {
                            weekday: 150,
                            weekend: 100
                        },
                        todayTotal: 30,
                        recentSpikes: []
                    },
                    categoryBreakdown: {},
                    subcategoryBreakdown: {},
                    unusedCategories: [],
                    seasonalContext: {
                        isHolidaySeason: false,
                        month: new Date().toLocaleString('default', { month: 'long' })
                    }
                };
                console.log('[AiScreen] Generated analysis:', analysisData);
                setAnalysis(analysisData);

                setLoading(false);
                console.log('[AiScreen] Data load completed');
            } catch (error) {
                console.error('[AiScreen] Error loading data:', error);
                if (error instanceof Error) {
                    console.error('[AiScreen] Error details:', {
                        name: error.name,
                        message: error.message,
                        stack: error.stack
                    });
                }
                setLoading(false);
            }
        };

        loadData();
    }, []);

    const handleUpdateBudget = (category?: string) => {
        // Navigate to budget settings with category context
        router.push({
            pathname: '/(tabs)/settings',
            params: { section: 'budget', category }
        } as any);
    };

    const handleOpenChat = () => {
        router.push('/tabs/ai/chatbox');
    };

    if (!auth.currentUser) {
        return (
            <ImageBackground source={bg} style={styles.container} resizeMode="cover">
                <View style={styles.center}>
                    <Text style={styles.loginText}>Please log in to meet your Bunny Assistant!</Text>
                </View>
            </ImageBackground>
        );
    }

    if (loading) {
        return (
            <ImageBackground source={bg} style={styles.container} resizeMode="cover">
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#91483C" />
                    <Text style={styles.loadingText}>Bunny is preparing your insights...</Text>
                </View>
            </ImageBackground>
        );
    }

    if (showChat) {
        return (
            <ImageBackground source={bg} style={styles.container} resizeMode="cover">
                <View style={styles.chatHeader}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => setShowChat(false)}
                    >
                        <Ionicons name="arrow-back" size={24} color="#91483C" />
                    </TouchableOpacity>
                    <View style={styles.chatTitleRow}>
                        <Image source={calendarIcon} style={styles.calendarIcon} />
                        <Text style={styles.chatTitle}>Chat with Bunny</Text>
                    </View>

                </View>
                <ChatInterface />
            </ImageBackground>
        );
    }

    const tabs = [
        { id: 'tips' as TabType, label: 'Tips' },
        { id: 'categories' as TabType, label: 'Categories' },
        { id: 'stats' as TabType, label: 'Stats' },
        { id: 'quests' as TabType, label: 'Quests' },
    ];

    const renderContent = () => {
        console.log('[AiScreen] Rendering content for tab:', activeTab);
        console.log('[AiScreen] Current state:', {
            showChat,
            loading,
            hasAnalysis: !!analysis,
            expensesCount: expenses.length
        });

        switch (activeTab) {
            case 'tips':
                return (
                    <SmartTipsCard 
                        analysis={analysis} 
                        onUpdateBudget={handleUpdateBudget}
                        onOpenChat={handleOpenChat}
                    />
                );
            case 'categories':
                return (
                    <UnusedCategoriesCard 
                        analysis={analysis}
                    />
                );
            case 'stats':
                return (
                    <WeeklyStatsCard 
                        analysis={analysis}
                    />
                );
            case 'quests':
                console.log('[AiScreen] Rendering quests tab with:', {
                    hasAnalysis: !!analysis,
                    expensesCount: expenses.length
                });
                return (
                    <MiniQuestsCard 
                        analysis={analysis}
                        expenses={expenses}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <ImageBackground source={bg} style={styles.container} resizeMode="cover">
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.title}>Smart Bunny Assistant</Text>
            </View>

            {/* Compact Tab Selector */}
            <View style={styles.tabContainer}>
                {tabs.map((tab) => (
                    <TouchableOpacity
                        key={tab.id}
                        style={[
                            styles.tabButton,
                            activeTab === tab.id && styles.tabButtonActive
                        ]}
                        onPress={() => setActiveTab(tab.id)}
                    >
                        <Image
                            source={carrotIcon}
                            style={[
                                styles.tabIcon,
                                activeTab === tab.id && styles.tabIconActive
                            ]}
                        />

                        <Text style={[
                            styles.tabLabel,
                            activeTab === tab.id && styles.tabLabelActive
                        ]}>
                            {tab.label}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Content Area */}
            <ScrollView
                style={styles.content}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={styles.contentCard}>
                    {renderContent()}
                </View>

                {/* Bunny Motivation Card */}
                <View style={styles.motivationCard}>
                    <Text style={styles.motivationTitle}>🐰💬 Bunny Says:</Text>
                    <Text style={styles.motivationText}>
                        {getMotivationalMessage(activeTab)}
                    </Text>
                </View>
            </ScrollView>

            {/* Floating Chat Button */}
            <View style={styles.chatWrapper}>
                <TouchableOpacity style={styles.chatButton} onPress={() => setShowChat(true)}>
                    <Image source={bunnyHead} style={styles.bunnyIcon} />
                    <Text style={styles.chatButtonText}>Chat</Text>
                </TouchableOpacity>
            </View>

        </ImageBackground>
    );
}

function getMotivationalMessage(tab: TabType): string {
    const messages = {
        tips: "Every carrot counts! These tips will help you save more for the future! 🥕✨",
        categories: "Hop into your spending patterns! Understanding where your carrots go helps you grow! 🌱",
        stats: "Look at those beautiful numbers! You're doing bunny-tastic with your budget! 📊🎉",
        quests: "Complete these quests to earn Carrot Coins! Small steps lead to big bunny hops! 🏆🥕"
    };
    return messages[tab];
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fefaf6',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
    },
    bunnyFace: {
        fontSize: 64,
        marginBottom: 16,
    },
    loginText: {
        fontSize: 18,
        color: '#91483C',
        textAlign: 'center',
        fontFamily: 'Fredoka',
        fontWeight: '500',
    },
    loadingBunny: {
        fontSize: 48,
        marginBottom: 16,
        transform: [{ rotate: '10deg' }],
    },
    loadingText: {
        fontSize: 16,
        color: '#91483C',
        marginTop: 16,
        textAlign: 'center',
        fontFamily: 'Fredoka',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 20,
        alignItems: 'center',
    },
    bunnyGreeting: {
        fontSize: 40,
        marginBottom: 8,
        transform: [{ rotate: '-5deg' }],
    },
    title: {
        fontSize: 30,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 4,
        fontFamily: 'Fredoka',
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#8B6914',
        fontFamily: 'Fredoka',
        opacity: 0.8,
    },
    tabContainer: {
        flexDirection: 'row',
        paddingHorizontal: 16,
        marginBottom: 16,
        gap: 8,
    },
    tabButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 8,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    tabButtonActive: {
        backgroundColor: '#FFF2D8',
        borderColor: '#91483C',
        boxShadow: '0 2px 4px rgba(145, 72, 60, 0.2)',
        elevation: 4,
    },
    tabEmoji: {
        fontSize: 20,
        marginBottom: 4,
    },
    tabEmojiActive: {
        fontSize: 22,
        transform: [{ scale: 1.1 }],
    },
    tabLabel: {
        fontSize: 12,
        color: '#666',
        fontFamily: 'Fredoka',
        fontWeight: '500',
    },
    tabLabelActive: {
        color: '#91483C',
        fontWeight: '600',
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
    },
    contentContainer: {
        paddingBottom: 100,
    },
    contentCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        boxShadow: '0 2px 3px rgba(0, 0, 0, 0.1)',
        elevation: 3,
    },
    motivationCard: {
        backgroundColor: '#FFF2D8',
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: '#F4D03F',
        marginBottom: 16,
    },
    motivationTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        marginBottom: 8,
        fontFamily: 'Fredoka',
    },
    motivationText: {
        fontSize: 14,
        color: '#8B6914',
        lineHeight: 20,
        fontFamily: 'Fredoka',
    },
    chatButton: {
        backgroundColor: '#F97850',
        borderRadius: 26,
        paddingVertical: 12,
        paddingHorizontal: 26,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 6,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        position: 'relative',
    },
    chatButtonText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
        marginLeft: 28, // să lase loc pentru iepure
    },
    chatHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingTop: 15,
        paddingBottom: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
    },
    backButton: {
        marginRight: 16,
        padding: 8,
        borderRadius: 20,
        backgroundColor: '#FFF2D8',
    },
    chatTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginTop: 20,
    },
    tabIcon: {
        width: 24,
        height: 24,
        marginBottom: 4,
        opacity: 0.5,
    },
    tabIconActive: {
        opacity: 1,
        transform: [{ scale: 1.1 }],
    },
    chatWrapper: {
        position: 'absolute',
        bottom: 30,
        right: 20,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    bunnyIcon: {
        position: 'absolute',
        top: -15,
        left: -0.5,
        width: 60,
        height: 60,
        resizeMode: 'contain',
    },
    chatTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    calendarIcon: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
    },
});
