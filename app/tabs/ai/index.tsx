import { Image } from 'react-native';
import React, { useState, useEffect, useMemo } from 'react';
import {View, StyleSheet, ScrollView, TouchableOpacity, Text, ActivityIndicator, ImageBackground,} from 'react-native';
import { useAuth } from '../../_layout';
import { db } from '../../../lib/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import bg from '@assets/bg/AIback.png';
import carrotIcon from '@assets/decor/carrot-icon.png';
import bunnyHead from '@assets/icons/bunnyhead.png';
import { useRouter } from 'expo-router';
import SmartTipsCard from '../../../components/bunnyAssistant/SmartTipsCard';
import type { ExpenseData } from '../../../components/bunnyAssistant/types';
import UnusedCategoriesCard from '../../../components/bunnyAssistant/UnusedCategoriesCard';
import WeeklyStatsCard from '../../../components/bunnyAssistant/WeeklyStatsCard';
import MiniQuestsCard from '../../../components/bunnyAssistant/MiniQuestsCard';
import { generateSpendingAnalysis } from '../../../components/bunnyAssistant/analysisUtils';
import { toISODateString } from '@lib/utils/dateUtils';
import AsyncStorage from '@react-native-async-storage/async-storage';

type TabType = 'tips' | 'categories' | 'stats' | 'quests';

export default function AiScreen(): JSX.Element {
    const { user } = useAuth();
    const [loadError, setLoadError] = useState(false);
    const [attempt, setAttempt] = useState(0);
    const [loading, setLoading] = useState(true);
    const [tabReady, setTabReady] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('tips');
    const [expenses, setExpenses] = useState<ExpenseData[]>([]);
    const [day, setDay] = useState(() => toISODateString(new Date()));
    const analysis = useMemo(() => generateSpendingAnalysis(expenses, new Date()), [expenses, day]);
    const router = useRouter();
    const ACTIVE_TAB_KEY = 'ai_active_tab';

    useEffect(() => {
        setExpenses([]);
        setLoading(true);
        setLoadError(false);
        if (!user) return;

        const expensesQuery = query(collection(db, 'expenses'), where('userId', '==', user.uid));
        return onSnapshot(expensesQuery, snapshot => {
            const records = snapshot.docs.map(item => ({ ...item.data(), id: item.id } as ExpenseData));
            setExpenses(records);
            setLoading(false);
        }, () => {
            setLoadError(true);
            setLoading(false);
        });
    }, [user, attempt]);

    useEffect(() => {
        const refreshDay = setInterval(() => setDay(toISODateString(new Date())), 30_000);
        return () => clearInterval(refreshDay);
    }, []);

    useEffect(() => {
        let active = true;
        AsyncStorage.getItem(ACTIVE_TAB_KEY).then(stored => {
            if (active && stored && ['tips', 'categories', 'stats', 'quests'].includes(stored)) {
                setActiveTab(current => current === 'tips' ? stored as TabType : current);
            }
        }).catch(() => {}).finally(() => {
            if (active) setTabReady(true);
        });
        return () => { active = false; };
    }, []);

    useEffect(() => {
        if (tabReady) void AsyncStorage.setItem(ACTIVE_TAB_KEY, activeTab).catch(() => {});
    }, [activeTab, tabReady]);

    const handleUpdateBudget = () => router.push('/tabs/budget');
    const handleOpenChat = () => router.navigate('/tabs/ai/chatbox');

    if (!user) {
        return (
            <ImageBackground source={bg} style={styles.container} resizeMode="cover">
                <View style={styles.center}>
                    <Text style={styles.loginText}>Please log in to meet your Bunny Assistant!</Text>
                </View>
            </ImageBackground>
        );
    }

    if (loadError) {
        return (
            <ImageBackground source={bg} style={styles.container} resizeMode="cover">
                <View style={styles.center}>
                    <Text style={styles.loginText}>Could not load your Bunny insights.</Text>
                    <TouchableOpacity onPress={() => setAttempt(value => value + 1)}>
                        <Text style={styles.loadingText}>Try again</Text>
                    </TouchableOpacity>
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

    const tabs = [
        { id: 'tips' as TabType, label: 'Tips' },
        { id: 'categories' as TabType, label: 'Categories' },
        { id: 'stats' as TabType, label: 'Stats' },
        { id: 'quests' as TabType, label: 'Quests' },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'tips':
                return (
                    <SmartTipsCard 
                        analysis={analysis} 
                        onUpdateBudget={handleUpdateBudget}
                        onOpenChat={handleOpenChat}
                        onViewStats={() => setActiveTab('stats')}
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
                        onPress={() => setActiveTab(tab.id as TabType)}
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
                <TouchableOpacity style={styles.chatButton} onPress={handleOpenChat}>
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
});
