import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SpendingAnalysis } from './SmartAdviceSection';
import categoryImg from '@assets/decor/aiCategories.png';
import { LinearGradient } from 'expo-linear-gradient';
import categories from '../../../../lib/categories';
import { auth, db } from '../../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface CategoryInsight {
    category: string;
    status: 'unused' | 'underused' | 'overused' | 'balanced';
    percentage: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    recommendation: string;
    action: string;
    impact: 'high' | 'medium' | 'low';
}

interface UnusedCategoriesCardProps {
    analysis: SpendingAnalysis | null;
}

export default function UnusedCategoriesCard(): JSX.Element {
    const [unusedCategories, setUnusedCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUnusedCategories = async () => {
            setLoading(true);
            try {
                const user = auth.currentUser;
                if (!user) {
                    setUnusedCategories(categories.map(c => c.label));
                    setLoading(false);
                    return;
                }
                const now = new Date();
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                const expensesRef = collection(db, 'expenses');
                const q = query(expensesRef, where('userId', '==', user.uid));
                const querySnapshot = await getDocs(q);
                const expenses = querySnapshot.docs.map(doc => doc.data());
                // Filter for current month
                const monthExpenses = expenses.filter(exp => {
                    const d = new Date(exp.date);
                    return d >= firstDay && d <= lastDay;
                });
                // For each category, check if used
                const used = new Set(monthExpenses.map(exp => exp.category));
                const unused = categories.map(c => c.label).filter(label => !used.has(label));
                setUnusedCategories(unused);
            } catch (e) {
                setUnusedCategories(categories.map(c => c.label));
            }
            setLoading(false);
        };
        fetchUnusedCategories();
    }, []);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.headerRow}>
                <Image source={categoryImg} style={styles.image} resizeMode="contain" />
                <View style={styles.headerText}>
                    <Text style={styles.headerTitle}>Category Insights</Text>
                    <Text style={styles.headerSubtitle}>
                        Categories you haven't used this month
                    </Text>
                </View>
            </View>
            {loading ? (
                <Text style={{ textAlign: 'center', marginTop: 20 }}>Loading...</Text>
            ) : unusedCategories.length === 0 ? (
                <Text style={{ textAlign: 'center', marginTop: 20 }}>You used all categories this month! 🎉</Text>
            ) : (
                unusedCategories.map(catLabel => {
                    const cat = categories.find(c => c.label === catLabel);
                    return (
                        <View key={catLabel} style={styles.tipCard}>
                            <LinearGradient
                                colors={["#FFA726", "#FFD180"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.impactBadge}
                            >
                                <Text style={styles.impactText}>UNUSED</Text>
                            </LinearGradient>
                            <View style={styles.tipHeader}>
                                {cat?.icon && (
                                    <Image source={cat.icon} style={{ width: 36, height: 36, marginRight: 12 }} />
                                )}
                                <Text style={styles.tipTitle}>{catLabel}</Text>
                            </View>
                            <Text style={styles.tipDescription}>
                                No bunny hops here! You haven't spent anything in this category this month. Maybe your carrots are hiding? 🥕🐰
                            </Text>
                        </View>
                    );
                })
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF9E6',
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingTop: 20,
        paddingBottom: 16,
        paddingHorizontal: 16,
        marginLeft: -16,
    },
    image: {
        width: 160,
        height: 160,
        marginRight: 16,
        alignSelf: 'center',
        marginLeft: -16,
    },
    headerText: {
        flex: 1,
        paddingTop: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: '#90483c',
        fontFamily: 'Fredoka',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#91483C',
        fontFamily: 'Fredoka',
        marginTop: 4,
    },
    tipCard: {
        backgroundColor: 'rgba(255, 243, 224, 0.9)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        marginHorizontal: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        borderWidth: 1,
        borderColor: '#FFE0B2',
    },
    impactBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        zIndex: 1,
    },
    impactText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontFamily: 'Fredoka',
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 24,
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#91483C',
        fontFamily: 'Fredoka',
        flex: 1,
    },
    tipDescription: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 16,
        lineHeight: 20,
        fontFamily: 'Fredoka',
    },
    statusBadge: {
        position: 'absolute',
        top: 12,
        right: 12,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        fontFamily: 'Fredoka',
    },
    insightHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 24,
    },
    statusIcon: {
        fontSize: 24,
        marginRight: 8,
    },
    percentage: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666666',
        fontFamily: 'Fredoka',
    },
    recommendation: {
        fontSize: 14,
        color: '#666666',
        marginBottom: 16,
        lineHeight: 20,
        fontFamily: 'Fredoka',
    },
    trendBadge: {
        backgroundColor: '#FFF3E0',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 4,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    trendText: {
        color: '#FF8F00',
        fontSize: 12,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
    actionButton: {
        backgroundColor: '#F97850',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginTop: 8,
    },
    actionButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: 'bold',
        fontFamily: 'Fredoka',
    },
});
