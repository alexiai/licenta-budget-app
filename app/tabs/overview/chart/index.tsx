// === File: app/overview/chart/index.tsx ===
import { View, Text, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import { useEffect, useState } from 'react';
import { auth, db } from '../../../../lib/firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import styles from './styles';
import OverviewHeader from '@components/OverviewHeader';

export default function ChartOverview() {
    const [data, setData] = useState<any[]>([]);
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [categoryExpenses, setCategoryExpenses] = useState<any[]>([]);

    useEffect(() => {
        const fetchData = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const q = query(collection(db, 'expenses'), where('userId', '==', user.uid));
            const snapshot = await getDocs(q);
            const expenses = snapshot.docs.map(doc => doc.data());

            const grouped = expenses.reduce((acc: any, curr: any) => {
                acc[curr.category] = (acc[curr.category] || 0) + Number(curr.amount);
                return acc;
            }, {});

            const pieData = Object.keys(grouped).map((key, index) => ({
                name: key,
                amount: grouped[key],
                color: ['#ff6f61', '#6c5ce7', '#00b894', '#ffe066', '#f368e0'][index % 5],
                legendFontColor: '#333',
                legendFontSize: 14,
            }));

            setData(pieData);
        };
        fetchData();
    }, []);

    const handleSelect = async (category: string) => {
        setSelectedCategory(category);

        const user = auth.currentUser;
        if (!user) return;

        const q = query(
            collection(db, 'expenses'),
            where('userId', '==', user.uid),
            where('category', '==', category)
        );
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => doc.data());
        setCategoryExpenses(list);
    };

    return (
        <View style={styles.container}>
            <OverviewHeader />
            <Text style={styles.title}>📊 Expense Chart</Text>
            {data.length > 0 ? (
                <PieChart
                    data={data.map(item => ({
                        ...item,
                        value: item.amount,
                        onPress: () => handleSelect(item.name),
                    }))}
                    width={Dimensions.get('window').width - 40}
                    height={220}
                    chartConfig={{
                        backgroundColor: '#fff',
                        backgroundGradientFrom: '#fff',
                        backgroundGradientTo: '#fff',
                        color: () => '#000',
                    }}
                    accessor="value"
                    backgroundColor="transparent"
                    paddingLeft="20"
                    center={[0, 0]}
                />
            ) : (
                <Text>No data available.</Text>
            )}

            {selectedCategory && (
                <View style={styles.detailsBox}>
                    <Text style={styles.subtitle}>Details for: {selectedCategory}</Text>
                    {categoryExpenses.map((item, index) => (
                        <Text key={index} style={styles.detailText}>
                            {item.subcategory || 'General'}: {item.amount} {item.currency || 'RON'}
                        </Text>
                    ))}
                </View>
            )}
        </View>
    );
}

