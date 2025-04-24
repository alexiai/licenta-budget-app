// chart/index.tsx
import { ScrollView, Text, View, Image, ImageBackground } from 'react-native';
import { PieChart } from 'react-native-svg-charts';
import { useEffect, useState } from 'react';
import { auth, db } from '@lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import styles from '@styles/overviewChart';
import OverviewHeader from '@components/OverviewHeader';
import bg from '@assets/bg/background2.png';
import carrotIcon from '@assets/icons/carrotcoinlist.png';
import categories from '@lib/categories';

export default function ChartOverview() {
    const [allExpenses, setAllExpenses] = useState<any[]>([]);
    const [insights, setInsights] = useState<any>({});
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);
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

            const pie = categories.map((cat, i) => {
                const sum = Object.values(grouped[cat.label] || {})
                    .flat()
                    .reduce((acc: number, e: any) => acc + Number(e.amount), 0);

                return {
                    key: i,
                    amount: sum,
                    svg: { fill: [
                            '#f94144', '#f3722c', '#f9c74f', '#90be6d', '#43aa8b', '#577590', '#6A4C93', '#e5989b'
                        ][i % 8] },
                    label: cat.label,
                };
            });

            setPieData(pie);
        };

        fetchData();
    }, []);

    const toggleCategory = (cat: string) => {
        setExpandedCategory(prev => (prev === cat ? null : cat));
        setExpandedSubcategory(null);
    };

    const toggleSubcategory = (sub: string) => {
        setExpandedSubcategory(prev => (prev === sub ? null : sub));
    };

    return (
        <ImageBackground source={bg} resizeMode="cover" style={styles.container}>
            <OverviewHeader />
            <Text style={styles.title}>Burrow Insights</Text>
            <Text style={styles.balance}>Burrow Balance: {total.toFixed(0)} 🥕</Text>

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 20 }}>
                <View style={{ width: 130, height: 130, marginLeft:25 }}>
                <PieChart
                        style={{ height: 130 }}
                        data={pieData}
                        valueAccessor={({ item }) => item.amount}
                        outerRadius={'90%'}
                        innerRadius={'40%'}
                    />
                </View>

                <View style={styles.legendBox}>
                    {pieData
                        .sort((a, b) => b.amount - a.amount)
                        .map((item, i) => {
                            const percent = total > 0 ? ((item.amount / total) * 100).toFixed(0) : 0;
                            return (
                                <View key={item.label} style={styles.legendItem}>
                                    <View style={[styles.colorDot, { backgroundColor: item.svg.fill }]} />
                                    <Text style={styles.legendText}>{item.label}:<Text style={styles.legendPercent}> {percent}%</Text></Text>
                                </View>
                            );
                        })}
                </View>
            </View>

            <ScrollView style={styles.insightsScroll} contentContainerStyle={{ paddingBottom: 120 }}>
                {Object.entries(insights).map(([cat, subObj]: any) => (
                    <View key={cat} style={styles.detailsBox}>
                        <Text onPress={() => toggleCategory(cat)} style={styles.insightTitle}>
                            {expandedCategory === cat ? '▼' : '▶'} {cat}
                        </Text>
                        {expandedCategory === cat &&
                            Object.entries(subObj).map(([sub, list]: any) => (
                                <View key={sub} style={styles.subcategoryBox}>
                                    <Text onPress={() => toggleSubcategory(sub)} style={styles.subcategoryText}>
                                        {expandedSubcategory === sub ? '▾' : '▸'} {sub}
                                    </Text>
                                    {expandedSubcategory === sub &&
                                        list.map((exp: any, index: number) => (
                                            <View key={index} style={styles.expenseBox}>
                                                <Text style={styles.expenseDate}>{new Date(exp.date).toLocaleDateString()}</Text>
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
