// chart/index.tsx
import { ScrollView, Text, View, Image, ImageBackground, Dimensions } from 'react-native';
import { PieChart as ChartKitPie } from 'react-native-chart-kit';
import { useEffect, useState } from 'react';
import { auth, db } from '@lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import styles from '@styles/overviewChart';
import OverviewHeader from '@components/OverviewHeader';
import bg from '@assets/bg/background3.png';
import carrotIcon from '@assets/icons/carrotcoinlist.png';
import categories from '@lib/categories';

export default function ChartOverview() {
    const [allExpenses, setAllExpenses] = useState<any[]>([]);
    const [insights, setInsights] = useState<any>({});
    const [expandedCategories, setExpandedCategories] = useState<{ [key: string]: boolean }>({});
    const [expandedSubcategories, setExpandedSubcategories] = useState<{ [key: string]: boolean }>({});
    const [total, setTotal] = useState<number>(0);
    const [pieData, setPieData] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
            const snapshot = await getDocs(q);
            const expenses = snapshot.docs.map(doc => doc.data());
            setAllExpenses(expenses);

            const grouped: any = {};
            let totalSpent = 0;

            expenses.forEach(exp => {
                const cat = exp.category;
                const sub = exp.subcategory || 'Other';

                if (!grouped[cat]) grouped[cat] = {};
                if (!grouped[cat][sub]) grouped[cat][sub] = [];
                grouped[cat][sub].push(exp);

                totalSpent += Number(exp.amount || 0);
            });

            setInsights(grouped);
            setTotal(totalSpent);

            const colors = ['#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#6A4C93', '#e5989b'];

            const pie = categories.map((cat, i) => {
                const sum = Object.values(grouped[cat.label] || {})
                    .flat()
                    .reduce((acc: number, e: any) => acc + Number(e.amount), 0);

                return {
                    name: cat.label,
                    value: sum,
                    color: colors[i % colors.length],
                    legendFontColor: '#91483c',
                    legendFontSize: 13,
                };
            }).filter(entry => entry.value > 0);

            setPieData(pie);
        };

        fetchData();
    }, []);

    const toggleCategory = (cat: string) => {
        setExpandedCategories(prev => {
            const newState = { ...prev, [cat]: !prev[cat] };

            if (!newState[cat]) {
                setExpandedSubcategories(prevSubs => {
                    const newSubs = { ...prevSubs };
                    Object.keys(insights[cat] || {}).forEach(sub => {
                        newSubs[sub] = false;
                    });
                    return newSubs;
                });
            }

            return newState;
        });
    };

    const toggleSubcategory = (sub: string) => {
        setExpandedSubcategories(prev => ({
            ...prev,
            [sub]: !prev[sub]
        }));
    };

    return (
        <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
            <View style={styles.topContainer}>
                <OverviewHeader />
                <View style={styles.headerContent}>
                    <Text style={styles.title}>Burrow Insights</Text>
                    <Text style={styles.balance}>Burrow Balance: {total.toFixed(0)}</Text>
                </View>
            </View>

            <ScrollView
                style={styles.scrollableContent}
                contentContainerStyle={styles.scrollContainer}
            >
                <View style={styles.pieSection}>
                    <ChartKitPie
                        data={pieData}
                        width={Dimensions.get('window').width - 46}
                        height={220}
                        accessor="value"
                        backgroundColor="transparent"
                        paddingLeft="15"
                        absolute
                        chartConfig={{
                            color: () => `#000`,
                            labelColor: () => '#91483c',
                            propsForLabels: { fontSize: 13, fontFamily: 'Fredoka' },
                        }}
                        style={{ marginTop: 20, borderRadius: 16 }}
                    />

                    <View style={styles.legendBox}>
                        {pieData
                            .sort((a, b) => b.value - a.value)
                            .map((item, i) => {
                                const percent = total > 0 ? ((item.value / total) * 100).toFixed(0) : 0;
                                return (
                                    <View key={item.name} style={styles.legendItem}>
                                        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
                                        <Text style={styles.legendText}>
                                            {item.name}:<Text style={styles.legendPercent}> {percent}%</Text>
                                        </Text>
                                    </View>
                                );
                            })}
                    </View>
                </View>

                {Object.entries(insights).map(([cat, subObj]: any) => (
                    <View key={cat} style={styles.detailsBox}>
                        <Text onPress={() => toggleCategory(cat)} style={styles.insightTitle}>
                            {expandedCategories[cat] ? '▼' : '▶'} {cat}
                        </Text>
                        {expandedCategories[cat] &&
                            Object.entries(subObj).map(([sub, list]: any) => (
                                <View key={sub} style={styles.subcategoryBox}>
                                    <Text onPress={() => toggleSubcategory(sub)} style={styles.subcategoryText}>
                                        {expandedSubcategories[sub] ? '▾' : '▸'} {sub}
                                    </Text>
                                    {expandedSubcategories[sub] &&
                                        list.map((exp: any, index: number) => (
                                            <View key={index} style={styles.expenseBox}>
                                                <Text style={styles.expenseDate}>
                                                    {new Date(exp.date).toLocaleDateString()}
                                                </Text>
                                                <View style={styles.expenseDetail}>
                                                    <Text style={styles.expenseNote}>{exp.note || 'No note'}</Text>
                                                    <View style={styles.amountBlock}>
                                                        <Image source={carrotIcon} style={styles.carrotIcon} />
                                                        <Text style={styles.amount}>{exp.amount}</Text>
                                                    </View>
                                                </View>
                                            </View>
                                        ))}
                                </View>
                            ))}
                    </View>
                ))}
            </ScrollView>
        </ImageBackground>
    );
}
